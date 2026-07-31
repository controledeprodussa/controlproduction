-- Função para sincronizar a tabela manutencao_tecnicos
CREATE OR REPLACE FUNCTION public.sincronizar_manutencao_tecnicos()
RETURNS TRIGGER AS $$
DECLARE
  tecnico_raw TEXT;
  names TEXT[];
  nome TEXT;
  lower_nome TEXT;
BEGIN
  -- 1. Limpa registros anteriores para evitar duplicados
  DELETE FROM public.manutencao_tecnicos WHERE manutencao_id = NEW.id;

  -- 2. Se o campo técnico estiver preenchido, processa e insere
  IF NEW.tecnico IS NOT NULL AND NEW.tecnico <> '' THEN
    tecnico_raw := NEW.tecnico;
    -- Normaliza separadores (' e ', ' E ', ',', '/', '&') substituindo por '|'
    tecnico_raw := regexp_replace(tecnico_raw, '\s+e\s+', '|', 'gi');
    tecnico_raw := regexp_replace(tecnico_raw, '\s+&\s+', '|', 'g');
    tecnico_raw := replace(tecnico_raw, ',', '|');
    tecnico_raw := replace(tecnico_raw, '/', '|');

    names := string_to_array(tecnico_raw, '|');

    FOREACH nome IN ARRAY names LOOP
      nome := TRIM(nome);
      lower_nome := LOWER(nome);

      -- Ignora placeholders vazios ou inválidos
      IF nome <> '' AND nome <> '-' AND nome <> '—' AND lower_nome <> 'não informado' AND lower_nome <> 'nao informado' THEN
        -- Unifica Augustin e Agustin para Augustin
        IF lower_nome = 'augustin' OR lower_nome = 'agustin' THEN
          nome := 'Augustin';
        END IF;

        INSERT INTO public.manutencao_tecnicos (manutencao_id, tecnico, company_id)
        VALUES (NEW.id, nome, NEW.company_id);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria o trigger na tabela manutencoes
DROP TRIGGER IF EXISTS trg_sincronizar_manutencao_tecnicos ON public.manutencoes;
CREATE TRIGGER trg_sincronizar_manutencao_tecnicos
AFTER INSERT OR UPDATE OF tecnico ON public.manutencoes
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_manutencao_tecnicos();

-- Recarrega os dados históricos para corrigir inconsistências passadas
DELETE FROM public.manutencao_tecnicos;

INSERT INTO public.manutencao_tecnicos (manutencao_id, tecnico, company_id)
SELECT m.id, TRIM(t), m.company_id
FROM public.manutencoes m,
LATERAL (
  SELECT regexp_split_to_table(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          m.tecnico, 
          '\s+e\s+', ',', 'gi'
        ),
        '\s+&\s+', ',', 'g'
      ),
      '/', ',', 'g'
    ),
    ','
  ) AS t
) sub
WHERE TRIM(t) <> '' 
  AND TRIM(t) <> '-' 
  AND TRIM(t) <> '—' 
  AND LOWER(TRIM(t)) <> 'não informado' 
  AND LOWER(TRIM(t)) <> 'nao informado';

-- Garante Augustin unificado na carga histórica
UPDATE public.manutencao_tecnicos
SET tecnico = 'Augustin'
WHERE LOWER(tecnico) = 'augustin' OR LOWER(tecnico) = 'agustin';
