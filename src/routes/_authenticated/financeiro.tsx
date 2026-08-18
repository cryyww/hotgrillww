import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORIAS_DESPESA,
  brl,
  calcularFinanceiro,
  fetchConfig,
  fetchDespesas,
  fetchIngredientes,
  fetchVendas,
} from "@/lib/hotgrill";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Hot Grill" },
      {
        name: "description",
        content: "DRE automática, balanço patrimonial e resultado em tempo real da barraca Hot Grill.",
      },
      { property: "og:title", content: "Financeiro — Hot Grill" },
      { property: "og:description", content: "DRE e balanço patrimonial automáticos." },
    ],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const qc = useQueryClient();
  const { data: vendas = [] } = useQuery({ queryKey: ["vendas"], queryFn: fetchVendas });
  const { data: despesas = [] } = useQuery({ queryKey: ["despesas"], queryFn: fetchDespesas });
  const { data: ingredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: fetchIngredientes,
  });
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: fetchConfig });

  const f = calcularFinanceiro({
    vendas,
    despesas,
    ingredientes,
    capitalSocial: Number(config?.capital_social ?? 0),
    aliquota: Number(config?.aliquota_imposto ?? 0),
  });

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState<string>("operacional");
  const [pago, setPago] = useState(true);

  const addDespesa = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("despesas").insert({
        descricao: descricao.trim(),
        valor: Number(valor.replace(",", ".")) || 0,
        categoria,
        pago,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento registrado");
      setDescricao("");
      setValor("");
      qc.invalidateQueries({ queryKey: ["despesas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const salvarConfig = useMutation({
    mutationFn: async (patch: { capital_social?: number; aliquota_imposto?: number }) => {
      if (!config?.id) {
        const { error } = await supabase.from("configuracoes").insert(patch);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("configuracoes").update(patch).eq("id", config.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["config"] }),
  });

  const removerDespesa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("despesas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["despesas"] }),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Financeiro</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label="Receita bruta" value={brl(f.receitaBruta)} />
        <Kpi label="Custos diretos (CMV)" value={brl(f.custosDiretos)} />
        <Kpi label="Custos indiretos" value={brl(f.custosIndiretos)} />
        <Kpi label="Lucro bruto" value={brl(f.lucroBruto)} accent />
        <Kpi label="Lucro líquido" value={brl(f.lucroLiquido)} accent />
        <Kpi label="Caixa" value={brl(f.caixa)} />
      </div>

      <section className="panel p-4">
        <h2 className="text-xl">DRE automática</h2>
        <div className="mt-2 space-y-1 text-sm">
          <Linha label="Receita Bruta" valor={f.receitaBruta} />
          <Linha label="(-) Impostos" valor={-f.impostos} />
          <Linha label="(-) CMV" valor={-f.cmv} />
          <Linha label="= Lucro Bruto" valor={f.lucroBruto} destaque />
          <Linha label="(-) Despesas Operacionais" valor={-f.despesasOperacionais} />
          <Linha label="(-) Custos Indiretos" valor={-f.custosIndiretos} />
          <Linha label="= Lucro Líquido" valor={f.lucroLiquido} destaque />
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-xl">Balanço patrimonial</h2>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Ativo</p>
            <Linha label="Caixa" valor={f.caixa} />
            <Linha label="Estoque" valor={f.estoqueValor} />
            <Linha label="Contas a receber" valor={f.contasReceber} />
            <Linha label="Total" valor={f.ativo} destaque />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Passivo</p>
            <Linha label="Fornecedores" valor={f.fornecedores} />
            <Linha label="Obrigações" valor={f.obrigacoes} />
            <Linha label="Total" valor={f.passivo} destaque />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Patrimônio líquido
            </p>
            <Linha label="Capital social" valor={Number(config?.capital_social ?? 0)} />
            <Linha label="Lucros acumulados" valor={f.lucrosAcumulados} />
            <Linha label="Total" valor={f.patrimonioLiquido} destaque />
          </div>
        </div>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="text-xl">Parâmetros</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Capital social (R$)
            </Label>
            <Input
              className="mt-1"
              inputMode="decimal"
              defaultValue={String(config?.capital_social ?? 0)}
              onBlur={(e) =>
                salvarConfig.mutate({ capital_social: Number(e.target.value.replace(",", ".")) || 0 })
              }
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Alíquota de imposto (%)
            </Label>
            <Input
              className="mt-1"
              inputMode="decimal"
              defaultValue={String(config?.aliquota_imposto ?? 0)}
              onBlur={(e) =>
                salvarConfig.mutate({
                  aliquota_imposto: Number(e.target.value.replace(",", ".")) || 0,
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="text-xl">Custos e despesas</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Descrição (ex.: aluguel do estande)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          <Input
            placeholder="Valor (R$)"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS_DESPESA.map((c) => (
            <Button
              key={c.value}
              variant={categoria === c.value ? "default" : "secondary"}
              size="sm"
              onClick={() => setCategoria(c.value)}
            >
              {c.label}
            </Button>
          ))}
          <Button variant={pago ? "default" : "secondary"} size="sm" onClick={() => setPago(!pago)}>
            {pago ? "Pago" : "A pagar"}
          </Button>
        </div>
        <Button disabled={!descricao.trim()} onClick={() => addDespesa.mutate()}>
          Lançar
        </Button>

        <ul className="divide-y divide-border text-sm">
          {despesas.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2">
              <span>
                {d.descricao}
                <span className="ml-2 text-xs text-muted-foreground">
                  {CATEGORIAS_DESPESA.find((c) => c.value === d.categoria)?.label ?? d.categoria} ·{" "}
                  {d.pago ? "pago" : "a pagar"}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-semibold">{brl(Number(d.valor))}</span>
                <Button variant="ghost" size="sm" onClick={() => removerDespesa.mutate(d.id)}>
                  ×
                </Button>
              </span>
            </li>
          ))}
          {despesas.length === 0 && (
            <li className="py-2 text-muted-foreground">Nenhum lançamento.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="panel p-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`font-display text-2xl ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

function Linha({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div
      className={`flex justify-between border-b border-border/60 py-1 ${
        destaque ? "font-semibold text-accent" : ""
      }`}
    >
      <span>{label}</span>
      <span>{brl(valor)}</span>
    </div>
  );
}