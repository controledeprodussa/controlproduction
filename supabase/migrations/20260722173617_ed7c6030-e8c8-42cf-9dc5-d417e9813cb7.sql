
CREATE POLICY "manut_pdf_select_company" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'relatorios-manutencao'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);

CREATE POLICY "manut_pdf_insert_company" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'relatorios-manutencao'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);

CREATE POLICY "manut_pdf_delete_company" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'relatorios-manutencao'
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);
