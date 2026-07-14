ALTER TABLE public.manutencoes ADD COLUMN relatorio_id TEXT UNIQUE;

COMMENT ON COLUMN public.manutencoes.relatorio_id IS 'Identificador único do relatório, usado para upsert via webhook';