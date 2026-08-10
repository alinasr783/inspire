-- Attendance Records table
-- Each employee can have at most one attendance record per day
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  check_in_date date NOT NULL DEFAULT CURRENT_DATE,
  check_in_time timestamptz NOT NULL DEFAULT now(),
  latitude numeric,
  longitude numeric,
  location_name text DEFAULT ''::text,
  notes text DEFAULT ''::text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_records_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id),
  CONSTRAINT attendance_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT attendance_records_employee_date_unique UNIQUE (employee_id, check_in_date)
);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_date ON public.attendance_records (check_in_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance_records (employee_id);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own records
CREATE POLICY "Users can view own attendance" ON public.attendance_records
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

-- Users can insert their own attendance record (once per day)
CREATE POLICY "Users can insert own attendance" ON public.attendance_records
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

-- Users can update their own records; admins can update any
CREATE POLICY "Users can update own attendance or admin" ON public.attendance_records
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

-- Users can delete their own records; admins can delete any
CREATE POLICY "Users can delete own attendance or admin" ON public.attendance_records
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
