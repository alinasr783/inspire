-- Create staging tables for unconfirmed (Excel) data uploads

CREATE TABLE public.unconfirmed_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  status text NOT NULL DEFAULT 'processing'::text CHECK (status = ANY (ARRAY['processing'::text, 'ai_complete'::text, 'confirmed'::text, 'rejected'::text])),
  total_rows integer NOT NULL DEFAULT 0,
  warnings_count integer NOT NULL DEFAULT 0,
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
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  owner_name text NOT NULL DEFAULT ''::text,
  unit_area text NOT NULL DEFAULT ''::text,
  building_number text NOT NULL DEFAULT ''::text,
  unit_number text NOT NULL DEFAULT ''::text,
  owner_phone text NOT NULL DEFAULT ''::text,
  owner_phone_alt text NOT NULL DEFAULT ''::text,
  affiliated_company text NOT NULL DEFAULT ''::text,
  last_feedback text NOT NULL DEFAULT ''::text,
  last_contact_date text DEFAULT NULL,
  extra_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  phone_normalized text NOT NULL DEFAULT ''::text,
  phone_alt_normalized text NOT NULL DEFAULT ''::text,
  ai_notes text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unconfirmed_records_pkey PRIMARY KEY (id),
  CONSTRAINT unconfirmed_records_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.unconfirmed_uploads(id) ON DELETE CASCADE
);

-- Index for fast lookups by upload_id
CREATE INDEX idx_unconfirmed_records_upload_id ON public.unconfirmed_records(upload_id);
CREATE INDEX idx_unconfirmed_records_status ON public.unconfirmed_records(status);
CREATE INDEX idx_unconfirmed_uploads_status ON public.unconfirmed_uploads(status);
CREATE INDEX idx_unconfirmed_uploads_created_by ON public.unconfirmed_uploads(created_by);

-- Enable RLS
ALTER TABLE public.unconfirmed_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unconfirmed_records ENABLE ROW LEVEL SECURITY;

-- RLS: all authenticated users can read/write their own uploads
CREATE POLICY "Users can view their own uploads"
  ON public.unconfirmed_uploads FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own uploads"
  ON public.unconfirmed_uploads FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own uploads"
  ON public.unconfirmed_uploads FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can view all uploads"
  ON public.unconfirmed_uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view records from their uploads"
  ON public.unconfirmed_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.unconfirmed_uploads
      WHERE id = unconfirmed_records.upload_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert records to their uploads"
  ON public.unconfirmed_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.unconfirmed_uploads
      WHERE id = upload_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update records from their uploads"
  ON public.unconfirmed_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.unconfirmed_uploads
      WHERE id = unconfirmed_records.upload_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can view all records"
  ON public.unconfirmed_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all records"
  ON public.unconfirmed_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
