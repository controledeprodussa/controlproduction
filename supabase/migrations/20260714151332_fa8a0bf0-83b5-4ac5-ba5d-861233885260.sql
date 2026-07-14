ALTER TABLE public.machines ADD CONSTRAINT machines_numero_serie_unique UNIQUE (numero_serie);

CREATE TABLE public.manutencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_serie TEXT NOT NULL REFERENCES public.machines(numero_serie) ON UPDATE CASCADE,
  cliente TEXT NOT NULL,
  tecnico TEXT NOT NULL,
  data_visita DATE NOT NULL,
  relatorio TEXT NOT NULL,
  link_relatorio TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.manutencoes TO authenticated;
GRANT ALL ON public.manutencoes TO service_role;

ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manutencoes_select_authenticated" ON public.manutencoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "manutencoes_insert_service_role" ON public.manutencoes
  FOR INSERT TO service_role WITH CHECK (true);

CREATE INDEX manutencoes_numero_serie_idx ON public.manutencoes (numero_serie);