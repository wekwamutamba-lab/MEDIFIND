-- ==============================================================
-- MediFind: Settings page
-- Run once in the Supabase SQL Editor, BEFORE deploying the code
-- that has the new Settings page. Safe to run more than once.
--
-- The Settings page saves the pharmacy profile and the stock rules
-- in the pharmacy_settings table (one row, id = 1). This makes sure
-- every column it uses exists. It only adds columns that are missing:
-- it does not change or delete any data.
-- ==============================================================

CREATE TABLE IF NOT EXISTS pharmacy_settings (
  id INTEGER PRIMARY KEY
);

ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS pharmacy_name       TEXT;
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS pharmacist_name     TEXT;
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS phone               TEXT;
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS whatsapp            TEXT;
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS email               TEXT;
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS address             TEXT;
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS city                TEXT;
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS license_number      TEXT;
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 20;
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS expiry_warning_days INTEGER DEFAULT 30;
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS message_footer      TEXT;
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT now();
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS join_code           TEXT;

-- The one settings row, with the default rules (20 units, 30 days)
INSERT INTO pharmacy_settings (id, low_stock_threshold, expiry_warning_days)
VALUES (1, 20, 30)
ON CONFLICT (id) DO NOTHING;

-- Only the backend (service_role key) may read or change settings
ALTER TABLE pharmacy_settings ENABLE ROW LEVEL SECURITY;
