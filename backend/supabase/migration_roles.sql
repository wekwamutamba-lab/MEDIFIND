-- ==============================================================
-- migration_roles.sql – run ONCE on the LIVE database, BEFORE deploying zip 6
-- ==============================================================
-- What it does (it only adds things; no data is changed or deleted):
--   1. Adds a "staff" table: who may use the app, their role (admin or till
--      operator) and whether they are approved.
--   2. Adds two columns to orders to record which staff member made each sale.
--   3. Adds a join_code column to pharmacy_settings (the code staff use to
--      ask to join).
--   4. Makes YOUR account the first admin.
--
-- How to run: Supabase dashboard -> SQL Editor -> New query.
--   1. In STEP 4 below, replace you@example.com with the email you log in with.
--   2. Paste the whole file and click Run.
--   3. The last query shows the staff table. You should see your email with
--      role "admin" and status "active". If it is empty, the email in STEP 4
--      didn't match: fix it and run the file again (it is safe to run twice).
--
-- Until this has run, the new backend will refuse every request, so run it
-- first and deploy afterwards.
-- ==============================================================

BEGIN;

-- STEP 1: staff
CREATE TABLE IF NOT EXISTS staff (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  full_name       TEXT,
  role            TEXT NOT NULL DEFAULT 'till'    CHECK (role IN ('admin', 'till')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  requested_role  TEXT CHECK (requested_role IN ('admin', 'till')),
  -- filled in when someone uses "Register pharmacy"
  pharmacy_name   TEXT,
  license_number  TEXT,
  whatsapp        TEXT,
  address         TEXT,
  decided_by      UUID,
  decided_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
-- Only the backend (service_role key) may read or change it
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- STEP 2: who made each sale
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_name TEXT;

-- STEP 3: join code (the app creates the first code when an admin opens the Staff page)
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS join_code TEXT;

-- STEP 4: the first admin  >>> replace the email <<<
INSERT INTO staff (user_id, email, full_name, role, status, requested_role, decided_at)
SELECT id, email, raw_user_meta_data->>'full_name', 'admin', 'active', 'admin', now()
FROM auth.users
WHERE lower(email) = lower('you@example.com')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', status = 'active';

COMMIT;

-- Check: you should see your email as an active admin
SELECT email, role, status FROM staff ORDER BY created_at;
