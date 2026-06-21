
CREATE TYPE machine_status AS ENUM ('engenharia','compras','producao','embarque','entregue');

CREATE TABLE public.machine_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.machine_process_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.machine_models(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  peso NUMERIC NOT NULL,
  ordem INT NOT NULL DEFAULT 0
);

CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  numero_serie TEXT NOT NULL,
  cliente TEXT NOT NULL,
  data_entrega DATE NOT NULL,
  modelo_id UUID REFERENCES public.machine_models(id) ON DELETE SET NULL,
  modelo_nome TEXT,
  status machine_status NOT NULL DEFAULT 'engenharia',
  progresso NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.machine_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  peso NUMERIC NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_em TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_models TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_process_templates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machines TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_processes TO anon, authenticated;
GRANT ALL ON public.machine_models, public.machine_process_templates, public.machines, public.machine_processes TO service_role;

ALTER TABLE public.machine_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_process_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all models" ON public.machine_models FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all templates" ON public.machine_process_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all machines" ON public.machines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all processes" ON public.machine_processes FOR ALL USING (true) WITH CHECK (true);

-- Auto recompute progresso when processes change
CREATE OR REPLACE FUNCTION public.recompute_machine_progress() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  target_machine UUID;
  total NUMERIC;
BEGIN
  target_machine := COALESCE(NEW.machine_id, OLD.machine_id);
  SELECT COALESCE(SUM(CASE WHEN concluido THEN peso ELSE 0 END), 0)
    INTO total
    FROM public.machine_processes
    WHERE machine_id = target_machine;
  UPDATE public.machines SET progresso = total WHERE id = target_machine;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_recompute_progress
AFTER INSERT OR UPDATE OR DELETE ON public.machine_processes
FOR EACH ROW EXECUTE FUNCTION public.recompute_machine_progress();
