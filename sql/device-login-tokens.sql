-- Device Login Tokens table for QR code device pairing
-- Replaces the magic-link approach to avoid email scanner consumption

CREATE TABLE IF NOT EXISTS public.device_login_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_login_tokens_token ON public.device_login_tokens(token);
CREATE INDEX IF NOT EXISTS idx_device_login_tokens_user_id ON public.device_login_tokens(user_id);

-- Allow authenticated users to create tokens for their own user_id
ALTER TABLE public.device_login_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own tokens"
  ON public.device_login_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tokens"
  ON public.device_login_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role bypasses RLS (for admin client in route.ts)
