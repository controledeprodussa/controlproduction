
-- 1. Add columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usuario TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user'));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_usuario_key ON public.profiles(usuario);

-- 2. has_role helper (security definer, avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role);
$$;

-- 3. Drop old profiles policies, recreate
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_select_self_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (company_id = current_company_id() AND public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY profiles_update_self_or_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR (company_id = current_company_id() AND public.has_role(auth.uid(), 'admin')))
  WITH CHECK (id = auth.uid() OR (company_id = current_company_id() AND public.has_role(auth.uid(), 'admin')));

CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (company_id = current_company_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE TO authenticated
  USING (company_id = current_company_id() AND public.has_role(auth.uid(), 'admin'));

-- 4. companies insert policy for admins
DROP POLICY IF EXISTS companies_insert_admin ON public.companies;
CREATE POLICY companies_insert_admin ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Update handle_new_user to accept usuario/role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_company UUID;
  meta_company UUID;
  meta_role TEXT;
  meta_usuario TEXT;
BEGIN
  SELECT id INTO default_company FROM public.companies WHERE nome = 'Lufati' LIMIT 1;
  meta_company := NULLIF(NEW.raw_user_meta_data->>'company_id','')::uuid;
  meta_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'user');
  meta_usuario := COALESCE(NULLIF(NEW.raw_user_meta_data->>'usuario',''), split_part(NEW.email, '@', 1));
  INSERT INTO public.profiles (id, company_id, nome, usuario, role)
  VALUES (
    NEW.id,
    COALESCE(meta_company, default_company),
    COALESCE(NEW.raw_user_meta_data->>'nome', meta_usuario),
    meta_usuario,
    meta_role
  );
  RETURN NEW;
END;
$$;

-- 6. Seed admin user admin2303 / admin2303
DO $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_email text := 'admin2303@lufati.internal';
BEGIN
  SELECT id INTO v_company_id FROM public.companies WHERE nome = 'Lufati' LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (nome) VALUES ('Lufati') RETURNING id INTO v_company_id;
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, crypt('admin2303', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('usuario','admin2303','role','admin','nome','Administrador'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id, jsonb_build_object('sub', v_user_id::text, 'email', v_email), 'email', v_user_id::text, now(), now(), now());
  END IF;

  INSERT INTO public.profiles (id, company_id, nome, usuario, role)
  VALUES (v_user_id, v_company_id, 'Administrador', 'admin2303', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', usuario = 'admin2303', company_id = v_company_id;
END $$;
