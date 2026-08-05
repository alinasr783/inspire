-- Visits table: tracks employee visits to properties with clients
-- Run this in Supabase SQL Editor

CREATE TABLE public.visits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  compound_name text NOT NULL,
  building_number text NOT NULL,
  apartment_number text NOT NULL,
  visit_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'upcoming'::text CHECK (status = ANY (ARRAY['upcoming'::text, 'completed'::text, 'cancelled'::text])),
  notes text DEFAULT ''::text,
  created_by uuid NOT NULL,
  assigned_to uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT visits_pkey PRIMARY KEY (id),
  CONSTRAINT visits_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT visits_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE,
  CONSTRAINT visits_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT visits_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
);

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Enable RLS
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- SELECT: creator sees their own, admin sees all
CREATE POLICY "users_see_own_visits" ON public.visits
  FOR SELECT
  USING (created_by = auth.uid() OR public.is_admin());

-- INSERT: any authenticated user
CREATE POLICY "users_insert_visits" ON public.visits
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: creator or admin
CREATE POLICY "users_update_own_visits" ON public.visits
  FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin());

-- DELETE: creator or admin
CREATE POLICY "users_delete_own_visits" ON public.visits
  FOR DELETE
  USING (created_by = auth.uid() OR public.is_admin());

-- Indexes
CREATE INDEX idx_visits_created_by ON public.visits(created_by);
CREATE INDEX idx_visits_assigned_to ON public.visits(assigned_to);
CREATE INDEX idx_visits_client_id ON public.visits(client_id);
CREATE INDEX idx_visits_unit_id ON public.visits(unit_id);
CREATE INDEX idx_visits_visit_date ON public.visits(visit_date);
CREATE INDEX idx_visits_status ON public.visits(status);
