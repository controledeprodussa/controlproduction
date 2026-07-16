
-- COMPANIES
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
INSERT INTO public.companies (nome) VALUES ('Lufati');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "companies_select_own" ON public.companies
  FOR SELECT TO authenticated
  USING (id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- helper
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT company_id FROM public.profiles WHERE id = auth.uid() $$;

-- signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE default_company UUID;
BEGIN
  SELECT id INTO default_company FROM public.companies WHERE nome = 'Lufati' LIMIT 1;
  INSERT INTO public.profiles (id, company_id, nome)
  VALUES (NEW.id, default_company, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add company_id
ALTER TABLE public.machines        ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.machine_models  ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.manutencoes     ADD COLUMN company_id UUID REFERENCES public.companies(id);

UPDATE public.machines        SET company_id = (SELECT id FROM public.companies WHERE nome = 'Lufati');
UPDATE public.machine_models  SET company_id = (SELECT id FROM public.companies WHERE nome = 'Lufati');
UPDATE public.manutencoes     SET company_id = (SELECT id FROM public.companies WHERE nome = 'Lufati');

ALTER TABLE public.machines        ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.machine_models  ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.manutencoes     ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX ON public.machines (company_id);
CREATE INDEX ON public.machine_models (company_id);
CREATE INDEX ON public.manutencoes (company_id);

-- machines policies
DROP POLICY IF EXISTS machines_select_public ON public.machines;
DROP POLICY IF EXISTS machines_insert_public ON public.machines;
DROP POLICY IF EXISTS machines_update_public ON public.machines;
DROP POLICY IF EXISTS machines_delete_public ON public.machines;
REVOKE ALL ON public.machines FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machines TO authenticated;

CREATE POLICY "machines_company_select" ON public.machines FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "machines_company_insert" ON public.machines FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "machines_company_update" ON public.machines FOR UPDATE TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "machines_company_delete" ON public.machines FOR DELETE TO authenticated USING (company_id = public.current_company_id());

-- machine_models policies
DROP POLICY IF EXISTS machine_models_select_public ON public.machine_models;
DROP POLICY IF EXISTS machine_models_insert_public ON public.machine_models;
DROP POLICY IF EXISTS machine_models_update_public ON public.machine_models;
DROP POLICY IF EXISTS machine_models_delete_public ON public.machine_models;
REVOKE ALL ON public.machine_models FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_models TO authenticated;

CREATE POLICY "machine_models_company_select" ON public.machine_models FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "machine_models_company_insert" ON public.machine_models FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "machine_models_company_update" ON public.machine_models FOR UPDATE TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "machine_models_company_delete" ON public.machine_models FOR DELETE TO authenticated USING (company_id = public.current_company_id());

-- machine_process_templates via parent
DROP POLICY IF EXISTS machine_process_templates_select_public ON public.machine_process_templates;
DROP POLICY IF EXISTS machine_process_templates_insert_public ON public.machine_process_templates;
DROP POLICY IF EXISTS machine_process_templates_update_public ON public.machine_process_templates;
DROP POLICY IF EXISTS machine_process_templates_delete_public ON public.machine_process_templates;
REVOKE ALL ON public.machine_process_templates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_process_templates TO authenticated;

CREATE POLICY "mpt_company_all" ON public.machine_process_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.machine_models m WHERE m.id = model_id AND m.company_id = public.current_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.machine_models m WHERE m.id = model_id AND m.company_id = public.current_company_id()));

-- machine_processes via parent
DROP POLICY IF EXISTS machine_processes_select_public ON public.machine_processes;
DROP POLICY IF EXISTS machine_processes_insert_public ON public.machine_processes;
DROP POLICY IF EXISTS machine_processes_update_public ON public.machine_processes;
DROP POLICY IF EXISTS machine_processes_delete_public ON public.machine_processes;
REVOKE ALL ON public.machine_processes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_processes TO authenticated;

CREATE POLICY "mp_company_all" ON public.machine_processes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.machines m WHERE m.id = machine_id AND m.company_id = public.current_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.machines m WHERE m.id = machine_id AND m.company_id = public.current_company_id()));

-- manutencoes
DROP POLICY IF EXISTS manutencoes_select_public ON public.manutencoes;
DROP POLICY IF EXISTS manutencoes_insert_service_role ON public.manutencoes;
REVOKE ALL ON public.manutencoes FROM anon;
GRANT SELECT ON public.manutencoes TO authenticated;

CREATE POLICY "manutencoes_company_select" ON public.manutencoes FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "manutencoes_insert_service_role" ON public.manutencoes FOR INSERT TO service_role WITH CHECK (true);
