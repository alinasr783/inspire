-- =========================================================
-- Migration: Add backup_employee to units and clients
-- Run this script in: Supabase -> SQL Editor -> Run
-- =========================================================

-- 1) Add backup_employee column to units
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS backup_employee uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_units_backup_employee ON public.units(backup_employee);

-- 2) Add backup_employee column to clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS backup_employee uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_backup_employee ON public.clients(backup_employee);

-- 2b) Add backup_employee and backup_feedback columns to unconfirmed_records
ALTER TABLE public.unconfirmed_records
ADD COLUMN IF NOT EXISTS backup_employee uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.unconfirmed_records
ADD COLUMN IF NOT EXISTS backup_feedback text NOT NULL DEFAULT ''::text;

CREATE INDEX IF NOT EXISTS idx_unconfirmed_records_backup_employee ON public.unconfirmed_records(backup_employee);

-- 3) Seed backup_employee into unit_column_config
INSERT INTO public.unit_column_config (key, label_ar, label_en, type, sort_order, enabled, is_builtin)
VALUES ('backup_employee', 'موظف احتياطي', 'Backup Employee', 'text', 14, true, true)
ON CONFLICT (key) DO UPDATE SET
  label_ar = EXCLUDED.label_ar,
  label_en = EXCLUDED.label_en,
  is_builtin = true;

-- 4) Seed backup_employee into client_column_config
INSERT INTO public.client_column_config (key, label_ar, label_en, type, sort_order, enabled, is_builtin)
VALUES ('backup_employee', 'موظف احتياطي', 'Backup Employee', 'text', 14, true, true)
ON CONFLICT (key) DO UPDATE SET
  label_ar = EXCLUDED.label_ar,
  label_en = EXCLUDED.label_en,
  is_builtin = true;

-- 5) Update unit gallery RLS policies to grant gallery access to backup_employee as well
DROP POLICY IF EXISTS "Authorized users can insert gallery sections" ON public.unit_gallery_sections;
CREATE POLICY "Authorized users can insert gallery sections"
  ON public.unit_gallery_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.units
      WHERE id = unit_id
        AND (
          created_by = auth.uid()
          OR assigned_employee = auth.uid()
          OR backup_employee = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "Authorized users can update gallery sections" ON public.unit_gallery_sections;
CREATE POLICY "Authorized users can update gallery sections"
  ON public.unit_gallery_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.units
      WHERE id = unit_id
        AND (
          created_by = auth.uid()
          OR assigned_employee = auth.uid()
          OR backup_employee = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "Authorized users can delete gallery sections" ON public.unit_gallery_sections;
CREATE POLICY "Authorized users can delete gallery sections"
  ON public.unit_gallery_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.units
      WHERE id = unit_id
        AND (
          created_by = auth.uid()
          OR assigned_employee = auth.uid()
          OR backup_employee = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "Authorized users can insert gallery images" ON public.unit_gallery_images;
CREATE POLICY "Authorized users can insert gallery images"
  ON public.unit_gallery_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.unit_gallery_sections s
      JOIN public.units u ON u.id = s.unit_id
      WHERE s.id = section_id
        AND (
          u.created_by = auth.uid()
          OR u.assigned_employee = auth.uid()
          OR u.backup_employee = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "Authorized users can update gallery images" ON public.unit_gallery_images;
CREATE POLICY "Authorized users can update gallery images"
  ON public.unit_gallery_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.unit_gallery_sections s
      JOIN public.units u ON u.id = s.unit_id
      WHERE s.id = section_id
        AND (
          u.created_by = auth.uid()
          OR u.assigned_employee = auth.uid()
          OR u.backup_employee = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "Authorized users can delete gallery images" ON public.unit_gallery_images;
CREATE POLICY "Authorized users can delete gallery images"
  ON public.unit_gallery_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.unit_gallery_sections s
      JOIN public.units u ON u.id = s.unit_id
      WHERE s.id = section_id
        AND (
          u.created_by = auth.uid()
          OR u.assigned_employee = auth.uid()
          OR u.backup_employee = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
  );
