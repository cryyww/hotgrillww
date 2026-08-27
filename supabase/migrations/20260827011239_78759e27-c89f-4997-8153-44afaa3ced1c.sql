CREATE OR REPLACE FUNCTION public.registrar_venda(p_produto text, p_valor numeric, p_forma_pagamento text, p_itens jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_venda_id UUID;
  v_item JSONB;
  v_ing public.ingredientes;
  v_qtd NUMERIC;
  v_custo NUMERIC;
  v_cmv NUMERIC := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('equipe','admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas membros da equipe autenticados podem registrar vendas.';
  END IF;

  IF COALESCE(jsonb_array_length(COALESCE(p_itens, '[]'::jsonb)), 0) = 0 THEN
    RAISE EXCEPTION 'Nao e possivel registrar a venda: nenhum insumo vinculado ao produto.';
  END IF;

  -- valida estoque antes de gravar qualquer coisa
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_qtd := COALESCE((v_item->>'quantidade')::numeric, 0);
    IF v_qtd <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_ing FROM public.ingredientes WHERE id = (v_item->>'ingrediente_id')::uuid FOR UPDATE;
    IF v_ing.id IS NULL THEN
      RAISE EXCEPTION 'Insumo nao encontrado no estoque. Cadastre o insumo antes de vender.';
    END IF;
    IF v_ing.quantidade_atual < v_qtd THEN
      RAISE EXCEPTION 'Estoque insuficiente de %: disponivel % %, necessario % %.',
        v_ing.nome, v_ing.quantidade_atual, v_ing.unidade, v_qtd, v_ing.unidade;
    END IF;
  END LOOP;

  INSERT INTO public.vendas (produto, valor, forma_pagamento)
  VALUES (p_produto, p_valor, p_forma_pagamento)
  RETURNING id INTO v_venda_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_qtd := COALESCE((v_item->>'quantidade')::numeric, 0);
    IF v_qtd <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_ing FROM public.ingredientes WHERE id = (v_item->>'ingrediente_id')::uuid FOR UPDATE;

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
$function$;