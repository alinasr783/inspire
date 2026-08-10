-- Daily Work Logs table
-- Each employee can log multiple work entries per day
-- Run this in Supabase SQL Editor
--
-- ALSO: Create a Storage bucket named "work-log-attachments" from Supabase Dashboard:
--   1. Go to Storage > New Bucket
--   2. Name: "work-log-attachments"
--   3. Make it public (or private with appropriate policies)
--   4. Create upload policy for authenticated users
--
-- Storage bucket policy SQL (run separately in SQL Editor):
--   CREATE POLICY "Allow authenticated uploads" ON storage.objects
--     FOR INSERT TO authenticated
--     WITH CHECK (bucket_id = 'work-log-attachments');
--   CREATE POLICY "Allow authenticated deletes" ON storage.objects
--     FOR DELETE TO authenticated
--     USING (bucket_id = 'work-log-attachments');
--   CREATE POLICY "Allow public read" ON storage.objects
--     FOR SELECT TO public
--     USING (bucket_id = 'work-log-attachments');

CREATE TABLE IF NOT EXISTS public.daily_work_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  description text,
  hours numeric(4,1) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'تطوير',
  status text NOT NULL DEFAULT 'مكتملة',
  department text,
  attachment_paths jsonb DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_work_logs_pkey PRIMARY KEY (id),
  CONSTRAINT daily_work_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT daily_work_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_work_logs_log_date ON public.daily_work_logs (log_date);
CREATE INDEX IF NOT EXISTS idx_daily_work_logs_employee_id ON public.daily_work_logs (employee_id);
CREATE INDEX IF NOT EXISTS idx_daily_work_logs_employee_date ON public.daily_work_logs (employee_id, log_date);

-- Enable RLS
ALTER TABLE public.daily_work_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own records; admins can read all
CREATE POLICY "Users can view own logs or admin" ON public.daily_work_logs
  FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can insert their own log entries; admins can insert for anyone
CREATE POLICY "Users can insert own logs or admin" ON public.daily_work_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update their own entries; admins can update any
CREATE POLICY "Users can update own logs or admin" ON public.daily_work_logs
  FOR UPDATE
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can delete their own entries; admins can delete any
CREATE POLICY "Users can delete own logs or admin" ON public.daily_work_logs
  FOR DELETE
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Storage bucket policies for work-log-attachments
-- (this requires the "work-log-attachments" bucket to exist in Storage)
CREATE POLICY "Allow authenticated uploads to work-log-attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'work-log-attachments');

CREATE POLICY "Allow authenticated deletes from work-log-attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'work-log-attachments');

CREATE POLICY "Allow public read from work-log-attachments" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'work-log-attachments');
