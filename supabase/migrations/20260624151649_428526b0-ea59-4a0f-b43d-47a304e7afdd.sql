
-- machines
DROP POLICY IF EXISTS "public all machines" ON public.machines;
CREATE POLICY "machines_select_public" ON public.machines FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "machines_insert_authenticated" ON public.machines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "machines_update_authenticated" ON public.machines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "machines_delete_authenticated" ON public.machines FOR DELETE TO authenticated USING (true);

-- machine_models
DROP POLICY IF EXISTS "public all models" ON public.machine_models;
CREATE POLICY "machine_models_select_public" ON public.machine_models FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "machine_models_insert_authenticated" ON public.machine_models FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "machine_models_update_authenticated" ON public.machine_models FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "machine_models_delete_authenticated" ON public.machine_models FOR DELETE TO authenticated USING (true);

-- machine_process_templates
DROP POLICY IF EXISTS "public all templates" ON public.machine_process_templates;
CREATE POLICY "machine_process_templates_select_public" ON public.machine_process_templates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "machine_process_templates_insert_authenticated" ON public.machine_process_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "machine_process_templates_update_authenticated" ON public.machine_process_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "machine_process_templates_delete_authenticated" ON public.machine_process_templates FOR DELETE TO authenticated USING (true);

-- machine_processes
DROP POLICY IF EXISTS "public all processes" ON public.machine_processes;
CREATE POLICY "machine_processes_select_public" ON public.machine_processes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "machine_processes_insert_authenticated" ON public.machine_processes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "machine_processes_update_authenticated" ON public.machine_processes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "machine_processes_delete_authenticated" ON public.machine_processes FOR DELETE TO authenticated USING (true);
