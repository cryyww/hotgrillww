CREATE OR REPLACE FUNCTION public.registrar_venda(
  p_produto TEXT,
  p_valor NUMERIC,
  p_forma_pagamento TEXT,
  p_itens JSONB DEFAULT '[]'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
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