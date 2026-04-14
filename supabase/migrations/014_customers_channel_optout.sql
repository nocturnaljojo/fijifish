-- Migration 014: channel-specific opt-out columns on customers
-- Allows customers to opt out of SMS independently from WhatsApp.
-- broadcast_opt_out remains as the master opt-out for all channels.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS sms_opt_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN customers.sms_opt_out IS 'Customer replied STOP to an SMS broadcast';
COMMENT ON COLUMN customers.whatsapp_opt_out IS 'Customer replied STOP to a WhatsApp broadcast';
