
-- Replace overly permissive USING/WITH CHECK (true) on write policies with explicit auth.uid() IS NOT NULL.

-- machines
DROP POLICY IF EXISTS "machines_insert_authenticated" ON public.machines;
DROP POLICY IF EXISTS "machines_update_authenticated" ON public.machines;
DROP POLICY IF EXISTS "machines_delete_authenticated" ON public.machines;
CREATE POLICY "machines_insert_authenticated" ON public.machines FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "machines_update_authenticated" ON public.machines FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "machines_delete_authenticated" ON public.machines FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- machine_models
DROP POLICY IF EXISTS "machine_models_insert_authenticated" ON public.machine_models;
DROP POLICY IF EXISTS "machine_models_update_authenticated" ON public.machine_models;
DROP POLICY IF EXISTS "machine_models_delete_authenticated" ON public.machine_models;
CREATE POLICY "machine_models_insert_authenticated" ON public.machine_models FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "machine_models_update_authenticated" ON public.machine_models FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "machine_models_delete_authenticated" ON public.machine_models FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- machine_process_templates
DROP POLICY IF EXISTS "machine_process_templates_insert_authenticated" ON public.machine_process_templates;
DROP POLICY IF EXISTS "machine_process_templates_update_authenticated" ON public.machine_process_templates;
DROP POLICY IF EXISTS "machine_process_templates_delete_authenticated" ON public.machine_process_templates;
CREATE POLICY "machine_process_templates_insert_authenticated" ON public.machine_process_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "machine_process_templates_update_authenticated" ON public.machine_process_templates FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "machine_process_templates_delete_authenticated" ON public.machine_process_templates FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- machine_processes
DROP POLICY IF EXISTS "machine_processes_insert_authenticated" ON public.machine_processes;
DROP POLICY IF EXISTS "machine_processes_update_authenticated" ON public.machine_processes;
DROP POLICY IF EXISTS "machine_processes_delete_authenticated" ON public.machine_processes;
CREATE POLICY "machine_processes_insert_authenticated" ON public.machine_processes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "machine_processes_update_authenticated" ON public.machine_processes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "machine_processes_delete_authenticated" ON public.machine_processes FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
