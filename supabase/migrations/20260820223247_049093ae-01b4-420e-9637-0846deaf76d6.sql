
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'equipe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_equipe()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('equipe','admin')
  );
$$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'equipe'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

DROP POLICY IF EXISTS equipe_configuracoes ON public.configuracoes;
CREATE POLICY equipe_configuracoes ON public.configuracoes FOR ALL TO authenticated
USING (public.is_equipe()) WITH CHECK (public.is_equipe());

DROP POLICY IF EXISTS equipe_despesas ON public.despesas;
CREATE POLICY equipe_despesas ON public.despesas FOR ALL TO authenticated
USING (public.is_equipe()) WITH CHECK (public.is_equipe());

DROP POLICY IF EXISTS equipe_ingredientes ON public.ingredientes;
CREATE POLICY equipe_ingredientes ON public.ingredientes FOR ALL TO authenticated
USING (public.is_equipe()) WITH CHECK (public.is_equipe());

DROP POLICY IF EXISTS equipe_itens_venda ON public.itens_venda;
CREATE POLICY equipe_itens_venda ON public.itens_venda FOR ALL TO authenticated
USING (public.is_equipe()) WITH CHECK (public.is_equipe());

DROP POLICY IF EXISTS equipe_movimentacoes ON public.movimentacoes_estoque;
CREATE POLICY equipe_movimentacoes ON public.movimentacoes_estoque FOR ALL TO authenticated
USING (public.is_equipe()) WITH CHECK (public.is_equipe());

DROP POLICY IF EXISTS equipe_vendas ON public.vendas;
CREATE POLICY equipe_vendas ON public.vendas FOR ALL TO authenticated
USING (public.is_equipe()) WITH CHECK (public.is_equipe());

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
  IF NOT public.is_equipe() THEN
    RAISE EXCEPTION 'Acesso negado: apenas membros da equipe autenticados podem registrar vendas.';
  END IF;

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
$function$;
