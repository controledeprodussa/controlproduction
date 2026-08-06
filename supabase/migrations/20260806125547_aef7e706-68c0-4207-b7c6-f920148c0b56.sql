CREATE UNIQUE INDEX IF NOT EXISTS manutencao_tecnicos_unico ON public.manutencao_tecnicos (manutencao_id, tecnico);

CREATE OR REPLACE FUNCTION public.sync_manutencao_tecnicos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nome TEXT;
BEGIN
  DELETE FROM public.manutencao_tecnicos WHERE manutencao_id = NEW.id;

  FOR nome IN
    SELECT DISTINCT btrim(x)
    FROM unnest(regexp_split_to_array(
      regexp_replace(COALESCE(NEW.tecnico, ''), '(\s+e\s+|\s*&\s*|,|/)', '|', 'gi'),
      '\|'
    )) AS x
    WHERE btrim(x) <> ''
  LOOP
    INSERT INTO public.manutencao_tecnicos (manutencao_id, tecnico, company_id)
    VALUES (NEW.id, nome, NEW.company_id)
    ON CONFLICT (manutencao_id, tecnico) DO NOTHING;
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_manutencao_tecnicos ON public.manutencoes;
CREATE TRIGGER trg_sync_manutencao_tecnicos
AFTER INSERT OR UPDATE OF tecnico, company_id ON public.manutencoes
FOR EACH ROW EXECUTE FUNCTION public.sync_manutencao_tecnicos();