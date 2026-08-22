-- Attendance: add device + extended metadata columns
-- Run this in Supabase SQL Editor to fix "فشل تسجيل الحضور" (missing columns).
-- Safe to run multiple times (uses IF NOT EXISTS).

-- Device info (battery level + device name)
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_battery smallint;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_device_name text DEFAULT ''::text;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_battery smallint;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_device_name text DEFAULT ''::text;

-- Extended metadata (IP, network type, timezone, language, OS, memory)
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_meta jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_meta jsonb NOT NULL DEFAULT '{}'::jsonb;
