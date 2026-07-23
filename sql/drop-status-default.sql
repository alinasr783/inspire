-- Remove the DEFAULT value from unconfirmed_records.status
-- This prevents any record from getting an automatic 'pending' status.
-- Status is now only set explicitly via application code.
ALTER TABLE public.unconfirmed_records ALTER COLUMN status DROP DEFAULT;
