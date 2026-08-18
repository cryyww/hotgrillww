import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const custoEstimado = itensMontagem().reduce((s, item) => {
    const ing = ingredientes.find((i) => i.id === item.ingrediente_id);
    return s + (ing ? Number(ing.valor_unitario) * item.quantidade : 0);
  }, 0);

  const venda = useMutation({
    mutationFn: (forma: string) =>
      registrarVenda({
        produto,
        valor: Number(valor.replace(",", ".")) || 0,
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

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-3xl">Registrar venda</h1>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Total vendido</p>
          <p className="font-display text-2xl text-accent">{brl(totalHoje)}</p>
        </div>
      </div>

      <section className="panel p-4">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">Produto</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PRODUTOS.map((p) => (
            <button
              key={p.nome}
              type="button"
              onClick={() => selecionarProduto(p.nome)}
              className={`rounded-lg border px-3 py-4 text-left transition-colors ${
                produto === p.nome
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground"
              }`}
            >
              <span className="block font-display text-xl leading-none">{p.nome}</span>
              <span className="text-xs">{brl(p.valor)}</span>
            </button>
          ))}
        </div>
      </section>

      {produtoAtual.montagem && (
        <section className="panel space-y-4 p-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Base (obrigatório)
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {BASE_INSUMOS.map((b) => (
                <Stepper
                  key={b.nome}
                  label={b.nome}
                  suffix="un"
                  value={base[b.nome] ?? 0}
                  step={1}
                  onChange={(v) => setBase((s) => ({ ...s, [b.nome]: v }))}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Adicionais (gramas)
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {ADICIONAIS_INSUMOS.map((a) => (
                <Stepper
                  key={a.nome}
                  label={a.nome}
                  suffix="g"
                  value={adicionais[a.nome] ?? 0}
                  step={ADICIONAL_STEP}
                  onChange={(v) => setAdicionais((s) => ({ ...s, [a.nome]: v }))}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="panel space-y-3 p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="valor" className="text-xs uppercase tracking-widest text-muted-foreground">
              Valor da venda
            </Label>
            <Input
              id="valor"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="mt-1 h-12 text-lg"
            />
          </div>
          <div className="text-right text-sm">
            <p className="text-muted-foreground">Custo estimado</p>
            <p className="font-semibold">{brl(custoEstimado)}</p>
          </div>
        </div>

        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Confirmar com forma de pagamento
        </p>
        <div className="grid grid-cols-2 gap-2">
          {FORMAS_PAGAMENTO.map((f) => (
            <Button
              key={f}
              size="lg"
              disabled={venda.isPending}
              onClick={() => venda.mutate(f)}
              className="h-14 font-display text-xl"
            >
              {f}
            </Button>
          ))}
        </div>
        {ingredientes.length === 0 && (
          <p className="text-xs text-destructive">
            Nenhum insumo cadastrado — cadastre o estoque para a baixa automática funcionar.
          </p>
        )}
      </section>

      <section className="panel p-4">
        <h2 className="text-xl">Últimas vendas</h2>
        <ul className="mt-2 divide-y divide-border text-sm">
          {vendas.slice(0, 12).map((v) => (
            <li key={v.id} className="flex items-center justify-between py-2">
              <span>
                {v.produto}
                <span className="ml-2 text-xs text-muted-foreground">
                  {v.forma_pagamento} · {hora(v.created_at)}
                </span>
              </span>
              <span className="font-semibold">{brl(Number(v.valor))}</span>
            </li>
          ))}
          {vendas.length === 0 && (
            <li className="py-3 text-muted-foreground">Nenhuma venda registrada ainda.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Stepper({
  label,
  value,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-9"
          onClick={() => onChange(Math.max(0, value - step))}
        >
          −
        </Button>
        <span className="flex-1 text-center text-sm">
          {value} {suffix}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-9"
          onClick={() => onChange(value + step)}
        >
          +
        </Button>
      </div>
    </div>
  );
}
