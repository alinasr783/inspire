-- User bans table for employee management
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.user_bans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text,
  ban_type text NOT NULL CHECK (ban_type = ANY (ARRAY['temporary', 'permanent'])),
  banned_until timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  lifted_at timestamp with time zone,
  lifted_by uuid,

  CONSTRAINT user_bans_pkey PRIMARY KEY (id),
  CONSTRAINT user_bans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_bans_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES public.profiles(id),
  CONSTRAINT user_bans_lifted_by_fkey FOREIGN KEY (lifted_by) REFERENCES public.profiles(id)
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_user_bans" ON public.user_bans FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_bans_user_id_active ON public.user_bans(user_id, is_active);
