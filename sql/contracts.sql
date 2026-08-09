-- Contracts module: contract templates & filled instances
-- Run this in Supabase SQL Editor

-- Contract templates table (admin creates these with the Tiptap editor)
CREATE TABLE public.contract_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT contract_templates_pkey PRIMARY KEY (id),
  CONSTRAINT contract_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- Contract instances table (users fill & save contracts)
CREATE TABLE public.contract_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  filled_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  related_client_id uuid,
  related_unit_id uuid,
  related_deal_id uuid,
  CONSTRAINT contract_instances_pkey PRIMARY KEY (id),
  CONSTRAINT contract_instances_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  CONSTRAINT contract_instances_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT contract_instances_client_id_fkey FOREIGN KEY (related_client_id) REFERENCES public.clients(id) ON DELETE SET NULL,
  CONSTRAINT contract_instances_unit_id_fkey FOREIGN KEY (related_unit_id) REFERENCES public.units(id) ON DELETE SET NULL,
  CONSTRAINT contract_instances_deal_id_fkey FOREIGN KEY (related_deal_id) REFERENCES public.generated_deals(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_instances ENABLE ROW LEVEL SECURITY;

-- contract_templates policies
-- SELECT: all authenticated users can view active templates
CREATE POLICY "users_select_templates" ON public.contract_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: only admin
CREATE POLICY "admin_insert_templates" ON public.contract_templates
  FOR INSERT
  WITH CHECK (public.is_admin());

-- UPDATE: only admin
CREATE POLICY "admin_update_templates" ON public.contract_templates
  FOR UPDATE
  USING (public.is_admin());

-- DELETE: only admin
CREATE POLICY "admin_delete_templates" ON public.contract_templates
  FOR DELETE
  USING (public.is_admin());

-- contract_instances policies
-- SELECT: user sees own instances, admin sees all
CREATE POLICY "users_select_own_instances" ON public.contract_instances
  FOR SELECT
  USING (created_by = auth.uid() OR public.is_admin());

-- INSERT: any authenticated user
CREATE POLICY "users_insert_instances" ON public.contract_instances
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: creator or admin
CREATE POLICY "users_update_own_instances" ON public.contract_instances
  FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin());

-- DELETE: creator or admin
CREATE POLICY "users_delete_own_instances" ON public.contract_instances
  FOR DELETE
  USING (created_by = auth.uid() OR public.is_admin());

-- Indexes
CREATE INDEX idx_contract_templates_created_by ON public.contract_templates(created_by);
CREATE INDEX idx_contract_templates_is_active ON public.contract_templates(is_active);
CREATE INDEX idx_contract_instances_template_id ON public.contract_instances(template_id);
CREATE INDEX idx_contract_instances_created_by ON public.contract_instances(created_by);
CREATE INDEX idx_contract_instances_client_id ON public.contract_instances(related_client_id);
CREATE INDEX idx_contract_instances_unit_id ON public.contract_instances(related_unit_id);
