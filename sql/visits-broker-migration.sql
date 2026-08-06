-- Visits: support external brokers + multiple properties
-- Run in Supabase SQL Editor

ALTER TABLE public.visits ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.visits ALTER COLUMN unit_id DROP NOT NULL;

ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_external_client boolean DEFAULT false;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS client_broker_phone text;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_external_property boolean DEFAULT false;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS property_broker_phone text;
