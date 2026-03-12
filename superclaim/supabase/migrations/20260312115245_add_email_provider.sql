-- Add email provider columns to org_settings
ALTER TABLE org_settings
ADD COLUMN IF NOT EXISTS email_provider text NOT NULL DEFAULT 'agentmail',
ADD COLUMN IF NOT EXISTS email_provider_address text,
ADD COLUMN IF NOT EXISTS email_provider_tokens jsonb;

COMMENT ON COLUMN org_settings.email_provider IS 'agentmail | google | microsoft | custom_domain';
COMMENT ON COLUMN org_settings.email_provider_address IS 'Connected email address, e.g. ekonomi@company.se';
COMMENT ON COLUMN org_settings.email_provider_tokens IS 'Encrypted OAuth tokens { access_token, refresh_token, expiry_date }';
