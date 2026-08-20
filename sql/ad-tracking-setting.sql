-- Add Ad Tracking visibility preference
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_ad_tracking boolean NOT NULL DEFAULT false;
