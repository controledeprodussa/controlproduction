
ALTER TABLE public.machine_models ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0;
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 AS rn
  FROM public.machine_models
)
UPDATE public.machine_models m SET ordem = r.rn FROM ranked r WHERE m.id = r.id;
