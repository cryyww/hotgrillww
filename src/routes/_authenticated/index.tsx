import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Beef,
  Croissant,
  Flame,
  Loader2,
  Minus,
  Plus,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import {
  ADICIONAIS_INSUMOS,
  BASE_INSUMOS,
  FORMAS_PAGAMENTO,
  PRODUTOS,
  brl,
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
          "Registro rápido de vendas do Hot Grill com montagem de ingredientes e baixa automática de estoque.",
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

const BASE_DEFAULT: Record<string, number> = { "Pão": 1, Salsicha: 1 };
const ADICIONAL_STEP = 20;

function VendasPage() {
  const qc = useQueryClient();
  const ingredientesQ = useQuery({ queryKey: ["ingredientes"], queryFn: fetchIngredientes });
  const vendasQ = useQuery({ queryKey: ["vendas"], queryFn: fetchVendas });

  const [produto, setProduto] = useState<string>(PRODUTOS[0].nome);
  const [valor, setValor] = useState<string>(String(PRODUTOS[0].valor));
  const [base, setBase] = useState<Record<string, number>>({ ...BASE_DEFAULT });
  const [adicionais, setAdicionais] = useState<Record<string, number>>({});

  const produtoAtual = PRODUTOS.find((p) => p.nome === produto)!;
  const ingredientes = ingredientesQ.data ?? [];
  const porNome = useMemo(
    () => new Map(ingredientes.map((i) => [i.nome.toLowerCase(), i])),
    [ingredientes],
  );

  const selecionarProduto = (nome: string) => {
    const p = PRODUTOS.find((x) => x.nome === nome)!;
    setProduto(nome);
    setValor(String(p.valor));
    setBase(p.montagem ? { ...BASE_DEFAULT } : {});
    setAdicionais({});
  };

  const itensMontagem = (): ItemMontagem[] => {
    const itens: ItemMontagem[] = [];
    const push = (nome: string, quantidade: number) => {
      const ing = porNome.get(nome.toLowerCase());
      if (ing && quantidade > 0) itens.push({ ingrediente_id: ing.id, quantidade });
    };
    if (produtoAtual.montagem) {
      Object.entries(base).forEach(([nome, q]) => push(nome, q));
      Object.entries(adicionais).forEach(([nome, q]) => push(nome, q));
      if (produtoAtual.nome === "Combo") push("Refrigerante", 1);
    } else if ("insumo" in produtoAtual && produtoAtual.insumo) {
      push(produtoAtual.insumo, produtoAtual.qtd ?? 1);
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
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["itens-venda"] });
      selecionarProduto(produtoAtual.nome);
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
          Monte o pedido, confira o valor e confirme pela forma de pagamento.
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
        <div className="space-y-5">
          <section className="panel ember-surface p-4">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Produto</Label>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {PRODUTOS.map((p) => {
                const ativo = produto === p.nome;
                return (
                  <button
                    key={p.nome}
                    type="button"
                    onClick={() => selecionarProduto(p.nome)}
                    className={`rounded-xl border px-3 py-4 text-left transition-all ${
                      ativo
                        ? "border-primary bg-primary/15 text-foreground ember-glow"
                        : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <span className="block font-display text-xl leading-none">{p.nome}</span>
                    <span className="text-xs">{brl(p.valor)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {produtoAtual.montagem && (
            <section className="panel space-y-5 p-4">
              <div>
                <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <Croissant className="size-4 text-primary" /> Base do dog
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {BASE_INSUMOS.map((b) => (
                    <IngredienteCard
                      key={b.nome}
                      label={b.nome}
                      suffix="un"
                      value={base[b.nome] ?? 0}
                      step={1}
                      preco={Number(porNome.get(b.nome.toLowerCase())?.valor_unitario ?? 0)}
                      onChange={(v) => setBase((s) => ({ ...s, [b.nome]: v }))}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <Beef className="size-4 text-accent" /> Adicionais — toque para incluir
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ADICIONAIS_INSUMOS.map((a) => (
                    <IngredienteCard
                      key={a.nome}
                      label={a.nome}
                      suffix="g"
                      value={adicionais[a.nome] ?? 0}
                      step={ADICIONAL_STEP}
                      preco={Number(porNome.get(a.nome.toLowerCase())?.valor_unitario ?? 0)}
                      onChange={(v) => setAdicionais((s) => ({ ...s, [a.nome]: v }))}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

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
        <h2 className="text-xl">Últimas vendas</h2>
        <ul className="mt-2 divide-y divide-border text-sm">
          {vendas.slice(0, 12).map((v) => (
            <li key={v.id} className="flex items-center justify-between py-2.5">
              <span>
                {v.produto}
                <span className="ml-2 text-xs text-muted-foreground">
                  {v.forma_pagamento} · {hora(v.created_at)}
                </span>
              </span>
              <span className="font-semibold">{brl(Number(v.valor))}</span>
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

function IngredienteCard({
  label,
  value,
  step,
  suffix,
  preco,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  suffix: string;
  preco: number;
  onChange: (v: number) => void;
}) {
  const ativo = value > 0;
  return (
    <div
      className={`rounded-xl border p-3 transition-all ${
        ativo ? "border-primary bg-primary/10" : "border-border bg-secondary/30"
      }`}
    >
      <button
        type="button"
        onClick={() => onChange(ativo ? 0 : step)}
        className="w-full text-left"
        aria-pressed={ativo}
      >
        <p className="font-display text-lg leading-none">{label}</p>
        <p className="text-[11px] text-muted-foreground">
          {preco > 0 ? `${brl(preco)} / ${suffix}` : `por ${suffix}`}
        </p>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-10"
          aria-label={`Diminuir ${label}`}
          onClick={() => onChange(Math.max(0, value - step))}
        >
          <Minus className="size-4" />
        </Button>
        <span className={`font-display text-xl ${ativo ? "text-accent" : "text-muted-foreground"}`}>
          {value}
          <span className="ml-1 text-xs">{suffix}</span>
        </span>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-10"
          aria-label={`Aumentar ${label}`}
          onClick={() => onChange(value + step)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
