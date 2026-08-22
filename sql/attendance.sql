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
  check_out_time timestamptz,
  check_out_latitude numeric,
  check_out_longitude numeric,
  check_out_location_name text DEFAULT ''::text,
  check_in_battery smallint,
  check_in_device_name text DEFAULT ''::text,
  check_out_battery smallint,
  check_out_device_name text DEFAULT ''::text,
  check_in_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  check_out_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text DEFAULT ''::text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_records_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id),
  CONSTRAINT attendance_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT attendance_records_employee_date_unique UNIQUE (employee_id, check_in_date)
);

-- Add check-out columns to existing table (for databases created before check-out feature)
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_time timestamptz;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_latitude numeric;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_longitude numeric;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_location_name text DEFAULT ''::text;

-- Add device info columns (battery level + device name)
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_battery smallint;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_device_name text DEFAULT ''::text;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_battery smallint;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_device_name text DEFAULT ''::text;

-- Add extended metadata columns (IP, network, timezone, language, OS, memory)
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_meta jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_date ON public.attendance_records (check_in_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance_records (employee_id);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own records
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance_records;
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
DROP POLICY IF EXISTS "Users can insert own attendance" ON public.attendance_records;
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
DROP POLICY IF EXISTS "Users can update own attendance or admin" ON public.attendance_records;
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
DROP POLICY IF EXISTS "Users can delete own attendance or admin" ON public.attendance_records;
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
