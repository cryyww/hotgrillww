import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Crown, Flame, Package, TrendingUp } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/states";
import {
  brl,
  calcularFinanceiro,
  fetchConfig,
  fetchDespesas,
  fetchIngredientes,
  fetchItensVenda,
  fetchVendas,
  qtdFmt,
} from "@/lib/hotgrill";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Hot Grill" },
      {
        name: "description",
        content: "Dashboard final com total vendido, produto mais vendido, receita por pagamento e consumo de insumos.",
      },
      { property: "og:title", content: "Relatórios — Hot Grill" },
      { property: "og:description", content: "Dashboard final da operação da barraca." },
    ],
  }),
  component: RelatoriosPage,
});

const CORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function RelatoriosPage() {
  const { data: vendas = [] } = useQuery({ queryKey: ["vendas"], queryFn: fetchVendas });
  const { data: itens = [] } = useQuery({ queryKey: ["itens-venda"], queryFn: fetchItensVenda });
  const { data: ingredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: fetchIngredientes,
  });
  const { data: despesas = [] } = useQuery({ queryKey: ["despesas"], queryFn: fetchDespesas });
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: fetchConfig });

  const f = calcularFinanceiro({
    vendas,
    despesas,
    ingredientes,
    capitalSocial: Number(config?.capital_social ?? 0),
    aliquota: 0,
  });

  const porProduto = new Map<string, { unidades: number; receita: number; lucro: number }>();
  for (const v of vendas) {
    const cur = porProduto.get(v.produto) ?? { unidades: 0, receita: 0, lucro: 0 };
    cur.unidades += 1;
    cur.receita += Number(v.valor);
    cur.lucro += Number(v.valor) - Number(v.cmv);
    porProduto.set(v.produto, cur);
  }
  const produtos = [...porProduto.entries()].map(([nome, d]) => ({ nome, ...d }));
  const maisVendido = [...produtos].sort((a, b) => b.unidades - a.unidades)[0];
  const maisLucrativo = [...produtos].sort((a, b) => b.lucro - a.lucro)[0];

  const receitaPor = (forma: string) =>
    vendas.filter((v) => v.forma_pagamento === forma).reduce((s, v) => s + Number(v.valor), 0);
  const pagamentos = [
    { nome: "Pix", valor: receitaPor("Pix") },
    { nome: "Dinheiro", valor: receitaPor("Dinheiro") },
    { nome: "Cartão", valor: receitaPor("Débito") + receitaPor("Crédito") },
  ];

  const consumo = ingredientes
    .map((i) => ({
      nome: i.nome,
      unidade: i.unidade,
      quantidade: itens
        .filter((it) => it.ingrediente_id === i.id)
        .reduce((s, it) => s + Number(it.quantidade), 0),
      custo: itens
        .filter((it) => it.ingrediente_id === i.id)
        .reduce((s, it) => s + Number(it.custo), 0),
    }))
    .filter((c) => c.quantidade > 0)
    .sort((a, b) => b.custo - a.custo);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Relatórios finais</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total vendido"
          value={brl(f.receitaBruta)}
          sub={`${vendas.length} unidades`}
          icon={Flame}
        />
        <KpiCard
          label="Lucro final"
          value={brl(f.lucroLiquido)}
          icon={TrendingUp}
          tone={f.lucroLiquido >= 0 ? "accent" : "destructive"}
          trend={f.lucroLiquido >= 0 ? "up" : "down"}
        />
        <KpiCard
          label="Mais vendido"
          value={maisVendido?.nome ?? "—"}
          sub={maisVendido ? `${maisVendido.unidades} un` : "sem vendas"}
          icon={Crown}
          tone="primary"
        />
        <KpiCard
          label="Mais lucrativo"
          value={maisLucrativo?.nome ?? "—"}
          sub={maisLucrativo ? brl(maisLucrativo.lucro) : "sem vendas"}
          icon={Package}
          tone="accent"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="panel p-4">
          <h2 className="text-xl">Receita por forma de pagamento</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pagamentos} dataKey="valor" nameKey="nome" outerRadius={80} label>
                  {pagamentos.map((_, idx) => (
                    <Cell key={idx} fill={CORES[idx % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => brl(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="text-sm">
            {pagamentos.map((p) => (
              <li key={p.nome} className="flex justify-between border-b border-border/60 py-1">
                <span>{p.nome}</span>
                <span className="font-semibold">{brl(p.valor)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-4">
          <h2 className="text-xl">Unidades por produto</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={produtos}>
                <XAxis dataKey="nome" tick={{ fontSize: 10 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="unidades" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="panel p-4">
        <h2 className="text-xl">Estoque consumido por ingrediente</h2>
        <ul className="mt-2 text-sm">
          {consumo.map((c) => (
            <li key={c.nome} className="flex justify-between border-b border-border/60 py-1">
              <span>{c.nome}</span>
              <span className="text-muted-foreground">
                {qtdFmt(c.quantidade, c.unidade)} · {brl(c.custo)}
              </span>
            </li>
          ))}
          {consumo.length === 0 && (
            <li>
              <EmptyState
                icon={Package}
                title="Nenhum consumo registrado"
                description="Os insumos aparecem aqui conforme as vendas dão baixa automática no estoque."
              />
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
