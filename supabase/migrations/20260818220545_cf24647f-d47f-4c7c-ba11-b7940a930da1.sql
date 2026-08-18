CREATE TABLE public.ingredientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade_comprada NUMERIC NOT NULL DEFAULT 0,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  quantidade_atual NUMERIC NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredientes TO anon, authenticated;
GRANT ALL ON public.ingredientes TO service_role;
ALTER TABLE public.ingredientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_interno_ingredientes" ON public.ingredientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento TEXT NOT NULL,
  cmv NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO anon, authenticated;
GRANT ALL ON public.vendas TO service_role;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_interno_vendas" ON public.vendas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.itens_venda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  ingrediente_id UUID NOT NULL REFERENCES public.ingredientes(id) ON DELETE RESTRICT,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  custo NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_venda TO anon, authenticated;
GRANT ALL ON public.itens_venda TO service_role;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_interno_itens_venda" ON public.itens_venda FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.movimentacoes_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingrediente_id UUID NOT NULL REFERENCES public.ingredientes(id) ON DELETE CASCADE,
  quantidade NUMERIC NOT NULL,
  tipo TEXT NOT NULL,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO anon, authenticated;
GRANT ALL ON public.movimentacoes_estoque TO service_role;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_interno_movimentacoes" ON public.movimentacoes_estoque FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL DEFAULT 'operacional',
  pago BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas TO anon, authenticated;
GRANT ALL ON public.despesas TO service_role;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_interno_despesas" ON public.despesas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  capital_social NUMERIC NOT NULL DEFAULT 0,
  aliquota_imposto NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes TO anon, authenticated;
GRANT ALL ON public.configuracoes TO service_role;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_interno_configuracoes" ON public.configuracoes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.configuracoes (capital_social, aliquota_imposto) VALUES (0, 6);

CREATE OR REPLACE FUNCTION public.registrar_venda(
  p_produto TEXT,
  p_valor NUMERIC,
  p_forma_pagamento TEXT,
  p_itens JSONB DEFAULT '[]'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda_id UUID;
  v_item JSONB;
  v_ing public.ingredientes;
  v_qtd NUMERIC;
  v_custo NUMERIC;
  v_cmv NUMERIC := 0;
BEGIN
  INSERT INTO public.vendas (produto, valor, forma_pagamento)
  VALUES (p_produto, p_valor, p_forma_pagamento)
  RETURNING id INTO v_venda_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_itens, '[]'::jsonb))
  LOOP
    v_qtd := COALESCE((v_item->>'quantidade')::numeric, 0);
    IF v_qtd <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_ing FROM public.ingredientes WHERE id = (v_item->>'ingrediente_id')::uuid FOR UPDATE;
    IF v_ing.id IS NULL THEN CONTINUE; END IF;

    v_custo := v_qtd * v_ing.valor_unitario;
    v_cmv := v_cmv + v_custo;

    INSERT INTO public.itens_venda (venda_id, ingrediente_id, quantidade, valor_unitario, custo)
    VALUES (v_venda_id, v_ing.id, v_qtd, v_ing.valor_unitario, v_custo);

    UPDATE public.ingredientes SET quantidade_atual = quantidade_atual - v_qtd WHERE id = v_ing.id;

    INSERT INTO public.movimentacoes_estoque (ingrediente_id, quantidade, tipo, venda_id)
    VALUES (v_ing.id, -v_qtd, 'saida_venda', v_venda_id);
  END LOOP;

  UPDATE public.vendas SET cmv = v_cmv WHERE id = v_venda_id;
  RETURN v_venda_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_venda(TEXT, NUMERIC, TEXT, JSONB) TO anon, authenticated, service_role;