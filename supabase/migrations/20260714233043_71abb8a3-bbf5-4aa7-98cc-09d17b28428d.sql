DROP POLICY IF EXISTS manutencoes_select_authenticated ON public.manutencoes;
CREATE POLICY manutencoes_select_public ON public.manutencoes FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.manutencoes TO anon;