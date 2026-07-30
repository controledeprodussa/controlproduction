GRANT SELECT ON public.manutencao_tecnicos TO authenticated;
GRANT ALL ON public.manutencao_tecnicos TO service_role;
ALTER TABLE public.manutencao_tecnicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_company_select" ON public.manutencao_tecnicos
FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  OR EXISTS (
    SELECT 1 FROM public.manutencoes m
    WHERE m.id = manutencao_tecnicos.manutencao_id
      AND m.company_id = public.current_company_id()
  )
);
CREATE POLICY "mt_insert_service_role" ON public.manutencao_tecnicos
FOR INSERT TO service_role WITH CHECK (true);