-- Add profile customization columns
-- Run this in Supabase SQL Editor (after running profile_avatar.sql if not already done)

-- 1. Primary color for theme customization
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS primary_color text;

-- 2. Notification preferences (JSON object)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{}'::jsonb;
