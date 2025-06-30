
-- Add missing fields to support_tickets table
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS customer_sentiment text CHECK (customer_sentiment IN ('positive', 'neutral', 'negative'));
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS sla_deadline timestamp with time zone;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS auto_assigned boolean DEFAULT false;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS escalated boolean DEFAULT false;

-- Update profiles table to have the correct column name
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS navn text;
UPDATE profiles SET navn = full_name WHERE navn IS NULL;
