-- CRM logo storage bucket
-- Run this in Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm',
  'crm',
  true,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view CRM assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'crm');

CREATE POLICY "Admins can upload CRM assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'crm');

CREATE POLICY "Admins can update CRM assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'crm')
WITH CHECK (bucket_id = 'crm');
