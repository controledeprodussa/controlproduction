
-- Revert auth-only write policies back to public (anon) access for all four tables.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['machines','machine_models','machine_processes','machine_process_templates'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_insert_authenticated ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update_authenticated ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete_authenticated ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_select_public ON public.%I', t, t);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', t||'_select_public', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', t||'_insert_public', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', t||'_update_public', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO anon, authenticated USING (true)', t||'_delete_public', t);

    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
