-- WhatsApp Campaign tables
-- Tracks bulk WhatsApp sending campaigns

CREATE TABLE public.whatsapp_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'stopped'::text])),
  total_count integer NOT NULL DEFAULT 0,
  delay_ms integer NOT NULL DEFAULT 1000,
  delay_max_ms integer NOT NULL DEFAULT 2000,
  message_template text NOT NULL DEFAULT '',
  processed_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

CREATE TABLE public.whatsapp_campaign_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  record_id uuid NOT NULL,
  owner_name text NOT NULL DEFAULT ''::text,
  unit_area text NOT NULL DEFAULT ''::text,
  building_number text NOT NULL DEFAULT ''::text,
  unit_number text NOT NULL DEFAULT ''::text,
  owner_phone text NOT NULL DEFAULT ''::text,
  owner_phone_alt text NOT NULL DEFAULT ''::text,
  affiliated_company text NOT NULL DEFAULT ''::text,
  last_feedback text NOT NULL DEFAULT ''::text,
  last_contact_date text DEFAULT ''::text,
  extra_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  phone_normalized text NOT NULL DEFAULT ''::text,
  phone_alt_normalized text NOT NULL DEFAULT ''::text,
  state text NOT NULL DEFAULT ''::text CHECK (state = ANY (ARRAY[''::text, 'send'::text, 'failed'::text])),
  error_message text NOT NULL DEFAULT ''::text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_campaign_records_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_campaign_records_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT whatsapp_campaign_records_record_id_fkey FOREIGN KEY (record_id) REFERENCES public.unconfirmed_records(id)
);

-- Add whatsapp_state column to unconfirmed_records for display convenience
ALTER TABLE public.unconfirmed_records ADD COLUMN IF NOT EXISTS whatsapp_state text NOT NULL DEFAULT ''::text;

-- Indexes
CREATE INDEX idx_whatsapp_campaign_records_campaign ON public.whatsapp_campaign_records(campaign_id);
CREATE INDEX idx_whatsapp_campaign_records_record ON public.whatsapp_campaign_records(record_id);
CREATE INDEX idx_whatsapp_campaigns_created_by ON public.whatsapp_campaigns(created_by);
CREATE INDEX idx_whatsapp_campaigns_status ON public.whatsapp_campaigns(status);

-- Enable RLS
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaign_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_campaigns
CREATE POLICY "Users can view their own campaigns"
  ON public.whatsapp_campaigns FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own campaigns"
  ON public.whatsapp_campaigns FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own campaigns"
  ON public.whatsapp_campaigns FOR UPDATE
  USING (auth.uid() = created_by);

-- RLS policies for whatsapp_campaign_records
CREATE POLICY "Users can view records from their campaigns"
  ON public.whatsapp_campaign_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_campaigns
      WHERE id = whatsapp_campaign_records.campaign_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert records to their campaigns"
  ON public.whatsapp_campaign_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.whatsapp_campaigns
      WHERE id = campaign_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update records from their campaigns"
  ON public.whatsapp_campaign_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_campaigns
      WHERE id = whatsapp_campaign_records.campaign_id
      AND created_by = auth.uid()
    )
  );

-- Admins can see everything
CREATE POLICY "Admins can view all campaigns"
  ON public.whatsapp_campaigns FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all campaigns"
  ON public.whatsapp_campaigns FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view all campaign records"
  ON public.whatsapp_campaign_records FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all campaign records"
  ON public.whatsapp_campaign_records FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
