-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  first_name text,
  second_name text,
  phone text,
  role text NOT NULL DEFAULT 'user'::text CHECK (role = ANY (ARRAY['user'::text, 'admin'::text])),
  approval_status text NOT NULL DEFAULT 'pending'::text CHECK (approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  position text DEFAULT ''::text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  area text,
  building_number text,
  finishing_status text,
  rent_sale text,
  unit_type text,
  cash_required numeric,
  remaining numeric,
  last_contact_date date,
  additional_notes text,
  feedback text,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  compound_name text NOT NULL DEFAULT ''::text,
  CONSTRAINT units_pkey PRIMARY KEY (id),
  CONSTRAINT units_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.unit_column_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  type text NOT NULL DEFAULT 'text'::text CHECK (type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'select'::text, 'textarea'::text])),
  options jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_builtin boolean NOT NULL DEFAULT false,
  CONSTRAINT unit_column_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  phone_alt text,
  budget_from numeric,
  budget_to numeric,
  payment_method text,
  preferred_area text,
  unit_type text,
  bedrooms text,
  preferred_developer text,
  source text,
  additional_notes text,
  assigned_employee uuid,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_contact_date date,
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_assigned_employee_fkey FOREIGN KEY (assigned_employee) REFERENCES public.profiles(id),
  CONSTRAINT clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.client_column_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  type text NOT NULL DEFAULT 'text'::text CHECK (type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'select'::text, 'textarea'::text])),
  options jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_builtin boolean NOT NULL DEFAULT false,
  CONSTRAINT client_column_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.client_dropdown_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category text NOT NULL,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT client_dropdown_options_pkey PRIMARY KEY (id)
);
CREATE TABLE public.unit_dropdown_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category text NOT NULL,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unit_dropdown_options_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'overdue'::text, 'completed'::text])),
  due_date date NOT NULL,
  assigned_to uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.unconfirmed_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_filename text NOT NULL,
  status text NOT NULL DEFAULT 'uploaded'::text CHECK (status = ANY (ARRAY['uploaded'::text, 'processing'::text, 'ai_processing'::text, 'ai_complete'::text, 'confirmed'::text, 'rejected'::text])),
  total_rows integer NOT NULL DEFAULT 0,
  columns_found jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unconfirmed_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT unconfirmed_uploads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.unconfirmed_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL,
  row_number integer NOT NULL,
  owner_name text DEFAULT ''::text,
  unit_area text DEFAULT ''::text,
  building_number text DEFAULT ''::text,
  unit_number text DEFAULT ''::text,
  owner_phone text DEFAULT ''::text,
  owner_phone_alt text DEFAULT ''::text,
  affiliated_company text DEFAULT ''::text,
  last_feedback text DEFAULT ''::text,
  last_contact_date text DEFAULT ''::text,
  extra_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  phone_normalized text DEFAULT ''::text,
  phone_alt_normalized text DEFAULT ''::text,
  ai_notes text DEFAULT ''::text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unconfirmed_records_pkey PRIMARY KEY (id),
  CONSTRAINT unconfirmed_records_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.unconfirmed_uploads(id)
);