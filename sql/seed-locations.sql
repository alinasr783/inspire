-- Seed location similarities (run this in Supabase SQL Editor)
INSERT INTO public.location_similarity (area_a, area_b, similarity) VALUES
  ('The Brooks','The Brooks',100), ('The Brooks','Stone Residence',45)
ON CONFLICT (area_a, area_b) DO NOTHING;
