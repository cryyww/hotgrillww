import { supabase } from "@/integrations/supabase/client";

export type Ingrediente = {
  id: string;
  nome: string;
  unidade: string;
  quantidade_comprada: number;
  valor_unitario: number;
  quantidade_atual: number;
  estoque_minimo: number;
  created_at: string;
};

export type Venda = {
  id: string;
  produto: string;
  valor: number;
  forma_pagamento: string;
  cmv: number;
  created_at: string;
};

export type Despesa = {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  pago: boolean;
  created_at: string;
};

export type ItemVenda = {
  id: string;
  venda_id: string;
  ingrediente_id: string;
  quantidade: number;
  custo: number;
};

export const UNIDADES = ["un"] as const;

export const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Débito", "Crédito"] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export const PAO = "Pão";
export const SALSICHA = "Salsicha";
export const BEBIDA = "Bebida 200ml";

export type ProdutoDef = {
  nome: string;
  valor: number;
  insumos: { nome: string; qtd: number }[];
};

export const PRODUTOS: ProdutoDef[] = [
  {
    nome: "Cachorro-Quente Padrão",
    valor: 12.5,
    insumos: [
      { nome: PAO, qtd: 1 },
      { nome: SALSICHA, qtd: 1 },
    ],
  },
  {
    nome: "Cachorro-Quente Completo + Bebida",
    valor: 15,
    insumos: [
      { nome: PAO, qtd: 1 },
      { nome: SALSICHA, qtd: 1 },
      { nome: BEBIDA, qtd: 1 },
    ],
  },
  {
    nome: "Cachorro-Quente Padrão + Bebida",
    valor: 14.5,
    insumos: [
      { nome: PAO, qtd: 1 },
      { nome: SALSICHA, qtd: 1 },
      { nome: BEBIDA, qtd: 1 },
    ],
  },
  {
    nome: "Bebida 200ml",
    valor: 2,
    insumos: [{ nome: BEBIDA, qtd: 1 }],
  },
];

export const INSUMOS_PADRAO = [
  { nome: PAO, unidade: "un" },
  { nome: SALSICHA, unidade: "un" },
  { nome: BEBIDA, unidade: "un" },
];


export const CATEGORIAS_DESPESA = [
  { value: "indireta", label: "Custo indireto" },
  { value: "operacional", label: "Despesa operacional" },
  { value: "imposto", label: "Imposto" },
  { value: "fornecedor", label: "Fornecedor" },
] as const;

export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(n) ? n : 0,
  );

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const qtdFmt = (n: number, unidade: string) =>
  `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n)} ${unidade}`;

export async function fetchIngredientes() {
  const { data, error } = await supabase.from("ingredientes").select("*").order("nome");
  if (error) throw error;
  return (data ?? []) as Ingrediente[];
}

export async function fetchVendas() {
  const { data, error } = await supabase
    .from("vendas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Venda[];
}

export async function fetchDespesas() {
  const { data, error } = await supabase
    .from("despesas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Despesa[];
}

export async function fetchItensVenda() {
  const { data, error } = await supabase
    .from("itens_venda")
    .select("id, venda_id, ingrediente_id, quantidade, custo");
  if (error) throw error;
  return (data ?? []) as ItemVenda[];
}

export async function fetchConfig() {
  const { data, error } = await supabase
    .from("configuracoes")
    .select("*")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? { id: "", capital_social: 0, aliquota_imposto: 0 }) as {
    id: string;
    capital_social: number;
    aliquota_imposto: number;
  };
}

export type ItemMontagem = { ingrediente_id: string; quantidade: number };

export async function registrarVenda(input: {
  produto: string;
  valor: number;
  forma_pagamento: string;
  itens: ItemMontagem[];
}) {
  const { data, error } = await supabase.rpc("registrar_venda", {
    p_produto: input.produto,
    p_valor: input.valor,
    p_forma_pagamento: input.forma_pagamento,
    p_itens: input.itens,
  });
  if (error) throw error;
  return data as string;
}

export type Financeiro = ReturnType<typeof calcularFinanceiro>;

export function calcularFinanceiro(params: {
  vendas: Venda[];
  despesas: Despesa[];
  ingredientes: Ingrediente[];
  capitalSocial: number;
  aliquota: number;
}) {
  const { vendas, despesas, ingredientes, capitalSocial, aliquota } = params;
  const receitaBruta = vendas.reduce((s, v) => s + Number(v.valor), 0);
  const cmv = vendas.reduce((s, v) => s + Number(v.cmv), 0);
  const soma = (fn: (d: Despesa) => boolean) =>
    despesas.filter(fn).reduce((s, d) => s + Number(d.valor), 0);

  const custosIndiretos = soma((d) => d.categoria === "indireta");
  const despesasOperacionais = soma((d) => d.categoria === "operacional" || d.categoria === "fornecedor");
  const impostoCalculado = (receitaBruta * aliquota) / 100;
  const impostosLancados = soma((d) => d.categoria === "imposto");
  const impostos = impostoCalculado + impostosLancados;

  const lucroBruto = receitaBruta - impostos - cmv;
  const lucroLiquido = lucroBruto - despesasOperacionais - custosIndiretos;

  const despesasPagas = despesas.filter((d) => d.pago).reduce((s, d) => s + Number(d.valor), 0);
  const despesasAPagar = despesas.filter((d) => !d.pago).reduce((s, d) => s + Number(d.valor), 0);
  const fornecedores = despesas
    .filter((d) => !d.pago && d.categoria === "fornecedor")
    .reduce((s, d) => s + Number(d.valor), 0);
  const obrigacoes = despesasAPagar - fornecedores + impostoCalculado;

  const contasReceber = vendas
    .filter((v) => v.forma_pagamento === "Crédito")
    .reduce((s, v) => s + Number(v.valor), 0);
  const estoqueValor = ingredientes.reduce(
    (s, i) => s + Number(i.quantidade_atual) * Number(i.valor_unitario),
    0,
  );
  const comprasTotais = ingredientes.reduce(
    (s, i) => s + Number(i.quantidade_comprada) * Number(i.valor_unitario),
    0,
  );
  const caixa = capitalSocial + (receitaBruta - contasReceber) - despesasPagas - comprasTotais;

  const ativo = caixa + estoqueValor + contasReceber;
  const passivo = fornecedores + obrigacoes;
  const patrimonioLiquido = capitalSocial + lucroLiquido;

  return {
    receitaBruta,
    cmv,
    custosDiretos: cmv,
    custosIndiretos,
    despesasOperacionais,
    impostos,
    impostoCalculado,
    impostosLancados,
    lucroBruto,
    lucroLiquido,
    caixa,
    estoqueValor,
    comprasTotais,
    contasReceber,
    fornecedores,
    obrigacoes,
    ativo,
    passivo,
    patrimonioLiquido,
    lucrosAcumulados: lucroLiquido,
  };
}
export async function excluirVenda(id: string) {
  const { data: itens, error: e1 } = await supabase
    .from("itens_venda")
    .select("ingrediente_id, quantidade")
    .eq("venda_id", id);
  if (e1) throw e1;

  for (const item of itens ?? []) {
    const { data: ing } = await supabase
      .from("ingredientes")
      .select("quantidade_atual")
      .eq("id", item.ingrediente_id)
      .maybeSingle();
    if (ing) {
      const { error } = await supabase
        .from("ingredientes")
        .update({ quantidade_atual: Number(ing.quantidade_atual) + Number(item.quantidade) })
        .eq("id", item.ingrediente_id);
      if (error) throw error;
    }
  }

  const del = async (table: "movimentacoes_estoque" | "itens_venda") => {
    const { error } = await supabase.from(table).delete().eq("venda_id", id);
    if (error) throw error;
  };
  await del("movimentacoes_estoque");
  await del("itens_venda");

  const { error } = await supabase.from("vendas").delete().eq("id", id);
  if (error) throw error;
}

export async function excluirTodasVendas(ids: string[]) {
  for (const id of ids) await excluirVenda(id);
}
