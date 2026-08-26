import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Flame, Loader2, Receipt, ShoppingBag, Trash2, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import {
  FORMAS_PAGAMENTO,
  PRODUTOS,
  brl,
  excluirTodasVendas,
  excluirVenda,
  fetchIngredientes,
  fetchVendas,
  hora,
  registrarVenda,
  type ItemMontagem,
} from "@/lib/hotgrill";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Vendas — Hot Grill" },
      {
        name: "description",
        content:
          "Registro rápido de vendas do Hot Grill com baixa automática de estoque por unidade.",
      },
      { property: "og:title", content: "Vendas — Hot Grill" },
      {
        property: "og:description",
        content: "Registro rápido de vendas com baixa automática de estoque.",
      },
    ],
  }),
  component: VendasPage,
});

function VendasPage() {
  const qc = useQueryClient();
  const ingredientesQ = useQuery({ queryKey: ["ingredientes"], queryFn: fetchIngredientes });
  const vendasQ = useQuery({ queryKey: ["vendas"], queryFn: fetchVendas });

  const [produto, setProduto] = useState<string>(PRODUTOS[0]!.nome);
  const [valor, setValor] = useState<string>(String(PRODUTOS[0]!.valor));

  const produtoAtual = PRODUTOS.find((p) => p.nome === produto) ?? PRODUTOS[0]!;
  const ingredientes = ingredientesQ.data ?? [];
  const porNome = useMemo(
    () => new Map(ingredientes.map((i) => [i.nome.toLowerCase(), i])),
    [ingredientes],
  );

  const selecionarProduto = (nome: string) => {
    const p = PRODUTOS.find((x) => x.nome === nome) ?? PRODUTOS[0]!;
    setProduto(p.nome);
    setValor(String(p.valor));
  };

  const itensMontagem = (): ItemMontagem[] => {
    const itens: ItemMontagem[] = [];
    for (const insumo of produtoAtual.insumos) {
      const ing = porNome.get(insumo.nome.toLowerCase());
      if (ing) itens.push({ ingrediente_id: ing.id, quantidade: insumo.qtd });
    }
    return itens;
  };

  const itensAtuais = itensMontagem();
  const custoEstimado = itensAtuais.reduce((s, item) => {
    const ing = ingredientes.find((i) => i.id === item.ingrediente_id);
    return s + (ing ? Number(ing.valor_unitario) * item.quantidade : 0);
  }, 0);
  const valorNumerico = Number(valor.replace(",", ".")) || 0;
  const margem = valorNumerico - custoEstimado;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ingredientes"] });
    qc.invalidateQueries({ queryKey: ["vendas"] });
    qc.invalidateQueries({ queryKey: ["itens-venda"] });
  };

  const venda = useMutation({
    mutationFn: (forma: string) =>
      registrarVenda({
        produto,
        valor: valorNumerico,
        forma_pagamento: forma,
        itens: itensMontagem(),
      }),
    onSuccess: (_d, forma) => {
      toast.success(`Venda registrada — ${produto} · ${forma}`);
      invalidate();
      selecionarProduto(produtoAtual.nome);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apagar = useMutation({
    mutationFn: (id: string) => excluirVenda(id),
    onSuccess: () => {
      toast.success("Venda apagada e estoque devolvido");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apagarTudo = useMutation({
    mutationFn: (ids: string[]) => excluirTodasVendas(ids),
    onSuccess: () => {
      toast.success("Todos os registros de vendas foram apagados");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const vendas = vendasQ.data ?? [];
  const totalHoje = vendas.reduce((s, v) => s + Number(v.valor), 0);
  const ticket = vendas.length ? totalHoje / vendas.length : 0;

  if (ingredientesQ.isError || vendasQ.isError) {
    return (
      <ErrorState
        error={ingredientesQ.error ?? vendasQ.error}
        onRetry={() => {
          ingredientesQ.refetch();
          vendasQ.refetch();
        }}
      />
    );
  }

  if (ingredientesQ.isLoading || vendasQ.isLoading) {
    return <LoadingState label="Abrindo o caixa..." />;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl leading-none">Registrar venda</h1>
        <p className="text-sm text-muted-foreground">
          Escolha o produto, confira o valor e confirme pela forma de pagamento.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total vendido" value={brl(totalHoje)} icon={Flame} tone="accent" />
        <KpiCard
          label="Pedidos"
          value={String(vendas.length)}
          icon={Receipt}
          sub={vendas.length ? "vendas registradas" : "nenhuma venda ainda"}
        />
        <KpiCard label="Ticket médio" value={brl(ticket)} icon={TrendingUp} tone="primary" />
        <KpiCard
          label="Margem do pedido"
          value={brl(margem)}
          icon={ShoppingBag}
          tone={margem >= 0 ? "accent" : "destructive"}
          trend={margem >= 0 ? "up" : "down"}
          sub={`custo ${brl(custoEstimado)}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <section className="panel ember-surface p-4">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Produto</Label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {PRODUTOS.map((p) => {
              const ativo = produto === p.nome;
              return (
                <button
                  key={p.nome}
                  type="button"
                  onClick={() => selecionarProduto(p.nome)}
                  className={`rounded-xl border px-4 py-5 text-left transition-all ${
                    ativo
                      ? "border-primary bg-primary/15 text-foreground ember-glow"
                      : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="block font-display text-2xl leading-none">{p.nome}</span>
                  <span className="mt-1 block text-sm font-semibold">{brl(p.valor)}</span>
                  <span className="mt-1 block text-[11px] uppercase tracking-widest">
                    {p.insumos.map((i) => `${i.qtd}x ${i.nome}`).join(" · ")}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel ember-surface space-y-4 p-4 lg:sticky lg:top-24">
          <div>
            <Label htmlFor="valor" className="text-xs uppercase tracking-widest text-muted-foreground">
              Valor da venda
            </Label>
            <Input
              id="valor"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="mt-1 h-14 font-display text-2xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-secondary/30 p-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Custo</p>
              <p className="font-display text-xl">{brl(custoEstimado)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Margem</p>
              <p className={`font-display text-xl ${margem >= 0 ? "text-accent" : "text-destructive"}`}>
                {brl(margem)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Confirmar com forma de pagamento
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {FORMAS_PAGAMENTO.map((f) => (
                <Button
                  key={f}
                  size="lg"
                  disabled={venda.isPending}
                  onClick={() => venda.mutate(f)}
                  className="h-14 font-display text-xl ember-glow"
                >
                  {venda.isPending && <Loader2 className="size-4 animate-spin" />}
                  {f}
                </Button>
              ))}
            </div>
          </div>

          {ingredientes.length === 0 && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Nenhum insumo cadastrado — cadastre o estoque para a baixa automática funcionar.
            </p>
          )}
        </section>
      </div>

      <section className="panel p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl">Últimas vendas</h2>
          {vendas.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              disabled={apagarTudo.isPending}
              onClick={() => {
                if (confirm("Apagar TODOS os registros de vendas e devolver o estoque?")) {
                  apagarTudo.mutate(vendas.map((v) => v.id));
                }
              }}
            >
              <Trash2 className="size-4" /> Apagar tudo
            </Button>
          )}
        </div>
        <ul className="mt-2 divide-y divide-border text-sm">
          {vendas.slice(0, 20).map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 py-2.5">
              <span>
                {v.produto}
                <span className="ml-2 text-xs text-muted-foreground">
                  {v.forma_pagamento} · {hora(v.created_at)}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold">{brl(Number(v.valor))}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Apagar venda"
                  disabled={apagar.isPending}
                  onClick={() => {
                    if (confirm("Apagar este registro de venda?")) apagar.mutate(v.id);
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
        {vendas.length === 0 && (
          <EmptyState
            icon={Receipt}
            title="Nenhuma venda ainda"
            description="Assim que o primeiro pedido for confirmado, ele aparece aqui com horário e forma de pagamento."
          />
        )}
      </section>
    </div>
  );
}
