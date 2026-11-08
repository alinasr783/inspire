-- =========================================================
-- Migration: Add backup_employee and backup_feedback to unconfirmed_records
-- Run this script in: Supabase -> SQL Editor -> Run
-- =========================================================

ALTER TABLE public.unconfirmed_records
ADD COLUMN IF NOT EXISTS backup_employee uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.unconfirmed_records
ADD COLUMN IF NOT EXISTS backup_feedback text NOT NULL DEFAULT ''::text;

CREATE INDEX IF NOT EXISTS idx_unconfirmed_records_backup_employee ON public.unconfirmed_records(backup_employee);
