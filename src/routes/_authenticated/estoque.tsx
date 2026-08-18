import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  INSUMOS_PADRAO,
  UNIDADES,
  brl,
  fetchIngredientes,
  qtdFmt,
  type Ingrediente,
} from "@/lib/hotgrill";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Hot Grill" },
      {
        name: "description",
        content: "Cadastro de insumos, estoque inicial, saldo em tempo real e alertas de estoque baixo.",
      },
      { property: "og:title", content: "Estoque — Hot Grill" },
      {
        property: "og:description",
        content: "Cadastro de insumos e controle de estoque em tempo real.",
      },
    ],
  }),
  component: EstoquePage,
});

function EstoquePage() {
  const qc = useQueryClient();
  const { data: ingredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: fetchIngredientes,
  });

  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState<string>("un");
  const [quantidade, setQuantidade] = useState("");
  const [valorUnitario, setValorUnitario] = useState("");
  const [minimo, setMinimo] = useState("");

  const num = (v: string) => Number(v.replace(",", ".")) || 0;
  const total = num(quantidade) * num(valorUnitario);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ingredientes"] });
  };

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ingredientes").insert({
        nome: nome.trim(),
        unidade,
        quantidade_comprada: num(quantidade),
        valor_unitario: num(valorUnitario),
        quantidade_atual: num(quantidade),
        estoque_minimo: num(minimo),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Insumo cadastrado");
      setNome("");
      setQuantidade("");
      setValorUnitario("");
      setMinimo("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const criarPadrao = useMutation({
    mutationFn: async () => {
      const existentes = new Set(ingredientes.map((i) => i.nome.toLowerCase()));
      const novos = INSUMOS_PADRAO.filter((i) => !existentes.has(i.nome.toLowerCase())).map((i) => ({
        nome: i.nome,
        unidade: i.unidade,
      }));
      if (novos.length === 0) return 0;
      const { error } = await supabase.from("ingredientes").insert(novos);
      if (error) throw error;
      return novos.length;
    },
    onSuccess: (n) => {
      toast.success(n ? `${n} insumos criados` : "Todos os insumos já existem");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ingredientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Insumo removido");
      invalidate();
    },
    onError: () => toast.error("Não é possível remover um insumo já usado em vendas."),
  });

  const repor = useMutation({
    mutationFn: async ({ ing, qtd }: { ing: Ingrediente; qtd: number }) => {
      const { error } = await supabase
        .from("ingredientes")
        .update({
          quantidade_comprada: Number(ing.quantidade_comprada) + qtd,
          quantidade_atual: Number(ing.quantidade_atual) + qtd,
        })
        .eq("id", ing.id);
      if (error) throw error;
      await supabase
        .from("movimentacoes_estoque")
        .insert({ ingrediente_id: ing.id, quantidade: qtd, tipo: "entrada_compra" });
    },
    onSuccess: () => {
      toast.success("Estoque reposto");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valorEstoque = ingredientes.reduce(
    (s, i) => s + Number(i.quantidade_atual) * Number(i.valor_unitario),
    0,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-3xl">Estoque</h1>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Valor em estoque</p>
          <p className="font-display text-2xl text-accent">{brl(valorEstoque)}</p>
        </div>
      </div>

      <section className="panel space-y-3 p-4">
        <h2 className="text-xl">Cadastrar insumo</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome do produto">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Bacon" />
          </Field>
          <Field label="Unidade de medida">
            <div className="flex gap-1">
              {UNIDADES.map((u) => (
                <Button
                  key={u}
                  type="button"
                  variant={unidade === u ? "default" : "secondary"}
                  className="flex-1"
                  onClick={() => setUnidade(u)}
                >
                  {u}
                </Button>
              ))}
            </div>
          </Field>
          <Field label="Quantidade comprada">
            <Input
              inputMode="decimal"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </Field>
          <Field label="Valor unitário (R$)">
            <Input
              inputMode="decimal"
              value={valorUnitario}
              onChange={(e) => setValorUnitario(e.target.value)}
            />
          </Field>
          <Field label="Estoque mínimo (alerta)">
            <Input inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
          </Field>
          <Field label="Valor total (automático)">
            <div className="flex h-9 items-center rounded-md border border-border bg-secondary/40 px-3 font-semibold">
              {brl(total)}
            </div>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!nome.trim() || criar.isPending} onClick={() => criar.mutate()}>
            Cadastrar insumo
          </Button>
          <Button variant="secondary" onClick={() => criarPadrao.mutate()}>
            Criar insumos padrão
          </Button>
        </div>
      </section>

      <section className="panel divide-y divide-border">
        <h2 className="p-4 text-xl">Saldo em tempo real</h2>
        {ingredientes.map((i) => {
          const baixo = Number(i.quantidade_atual) <= Number(i.estoque_minimo);
          const zerado = Number(i.quantidade_atual) <= 0;
          const pct =
            Number(i.quantidade_comprada) > 0
              ? Math.max(0, Math.min(100, (Number(i.quantidade_atual) / Number(i.quantidade_comprada)) * 100))
              : 0;
          return (
            <div key={i.id} className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {i.nome}
                    {zerado ? (
                      <span className="ml-2 rounded bg-destructive px-2 py-0.5 text-[10px] uppercase text-destructive-foreground">
                        Esgotado
                      </span>
                    ) : baixo ? (
                      <span className="ml-2 rounded bg-accent px-2 py-0.5 text-[10px] uppercase text-accent-foreground">
                        Estoque baixo
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Inicial {qtdFmt(Number(i.quantidade_comprada), i.unidade)} · Restante{" "}
                    {qtdFmt(Number(i.quantidade_atual), i.unidade)} · {brl(Number(i.valor_unitario))}/
                    {i.unidade}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => repor.mutate({ ing: i, qtd: i.unidade === "g" ? 500 : 10 })}
                  >
                    +{i.unidade === "g" ? "500g" : "10"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remover.mutate(i.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full ${zerado || baixo ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {ingredientes.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Nenhum insumo cadastrado.</p>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}