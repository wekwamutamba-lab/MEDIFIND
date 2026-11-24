-- ==============================================================
-- MediFind: separate pharmacies
-- Run once in the Supabase SQL Editor, BEFORE deploying the code
-- that keeps each pharmacy's data apart. Safe to run more than once.
--
-- What it does
--   1. Every pharmacy becomes its own space. Products, customers,
--      orders, payments, restock orders and help messages each get a
--      pharmacy_id, and staff belong to one pharmacy.
--   2. Each pharmacy keeps its own settings (name, licence, contact
--      details, stock rules) and its own join code, on its row in the
--      pharmacies table.
--   3. Suppliers with no pharmacy_id are a shared directory that every
--      pharmacy can search. A pharmacy can also add its own private
--      suppliers.
--   4. platform_owners lists who may approve new pharmacy
--      registrations. They see the registration request only, never
--      another pharmacy's sales, stock or staff.
--
-- The FIRST time it runs, it moves everything that exists today into
-- one pharmacy (the one that holds most of the products), copies the
-- current settings and join code onto it, and:
--   - puts all current staff in that pharmacy, except people whose
--     "Register pharmacy" request is still waiting or was declined
--     (those wait for a platform owner to approve a new pharmacy);
--   - makes every current active admin a platform owner;
--   - leaves the current suppliers as the shared directory.
-- It does not delete any data.
-- ==============================================================

-- ---------- 1. columns ----------
-- settings now live on each pharmacy's row
ALTER TABLE pharmacies ALTER COLUMN lat DROP NOT NULL;
ALTER TABLE pharmacies ALTER COLUMN lng DROP NOT NULL;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS pharmacist_name     TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS license_number      TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS phone               TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS whatsapp            TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS email               TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS city                TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 20;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS expiry_warning_days INTEGER DEFAULT 30;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS message_footer      TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS join_code           TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS pharmacies_join_code_key ON pharmacies (join_code) WHERE join_code IS NOT NULL;

-- which pharmacy each row belongs to
ALTER TABLE staff           ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL;
ALTER TABLE customers       ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE;
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE;
ALTER TABLE payments        ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE;
ALTER TABLE restock_orders  ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE;
-- NULL = shared directory, otherwise that pharmacy's private supplier
ALTER TABLE suppliers       ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS staff_pharmacy_idx           ON staff (pharmacy_id);
CREATE INDEX IF NOT EXISTS products_pharmacy_idx        ON products (pharmacy_id);
CREATE INDEX IF NOT EXISTS customers_pharmacy_idx       ON customers (pharmacy_id);
CREATE INDEX IF NOT EXISTS orders_pharmacy_idx          ON orders (pharmacy_id);
CREATE INDEX IF NOT EXISTS payments_pharmacy_idx        ON payments (pharmacy_id);
CREATE INDEX IF NOT EXISTS restock_orders_pharmacy_idx  ON restock_orders (pharmacy_id);
CREATE INDEX IF NOT EXISTS support_tickets_pharmacy_idx ON support_tickets (pharmacy_id);
CREATE INDEX IF NOT EXISTS suppliers_pharmacy_idx       ON suppliers (pharmacy_id);

-- who may approve new pharmacies
CREATE TABLE IF NOT EXISTS platform_owners (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- the old single settings row; only read below to copy it across
CREATE TABLE IF NOT EXISTS pharmacy_settings (id INTEGER PRIMARY KEY);
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
ALTER TABLE pharmacy_settings ADD COLUMN IF NOT EXISTS join_code           TEXT;

-- ---------- 2. move today's data into one pharmacy (first run only) ----------
DO $$
DECLARE
  home UUID;
  s    pharmacy_settings%ROWTYPE;
BEGIN
  IF EXISTS (SELECT 1 FROM staff WHERE pharmacy_id IS NOT NULL) THEN
    RAISE NOTICE 'Pharmacies are already set up; nothing moved.';
    RETURN;
  END IF;

  SELECT pharmacy_id INTO home
    FROM products WHERE pharmacy_id IS NOT NULL
    GROUP BY pharmacy_id ORDER BY count(*) DESC LIMIT 1;
  IF home IS NULL THEN
    SELECT id INTO home FROM pharmacies ORDER BY created_at LIMIT 1;
  END IF;
  IF home IS NULL THEN
    INSERT INTO pharmacies (name) VALUES ('My Pharmacy') RETURNING id INTO home;
  END IF;

  SELECT * INTO s FROM pharmacy_settings WHERE id = 1;
  IF FOUND THEN
    UPDATE pharmacies SET
      name                = COALESCE(NULLIF(trim(s.pharmacy_name), ''), name),
      address             = COALESCE(NULLIF(trim(s.address), ''), address),
      pharmacist_name     = s.pharmacist_name,
      license_number      = s.license_number,
      phone               = s.phone,
      whatsapp            = s.whatsapp,
      email               = s.email,
      city                = s.city,
      low_stock_threshold = COALESCE(s.low_stock_threshold, 20),
      expiry_warning_days = COALESCE(s.expiry_warning_days, 30),
      message_footer      = s.message_footer,
      join_code           = s.join_code
    WHERE id = home;
  END IF;

  -- everything in the app today was one pharmacy's data
  UPDATE products        SET pharmacy_id = home;
  UPDATE customers       SET pharmacy_id = home WHERE pharmacy_id IS NULL;
  UPDATE orders          SET pharmacy_id = home WHERE pharmacy_id IS NULL;
  UPDATE payments        SET pharmacy_id = home WHERE pharmacy_id IS NULL;
  UPDATE restock_orders  SET pharmacy_id = home WHERE pharmacy_id IS NULL;
  UPDATE support_tickets SET pharmacy_id = home WHERE pharmacy_id IS NULL;

  -- staff: everyone except open or declined "Register pharmacy" requests
  UPDATE staff SET pharmacy_id = home
    WHERE NOT (requested_role = 'admin' AND status IN ('pending', 'rejected'));

  INSERT INTO platform_owners (user_id)
    SELECT user_id FROM staff WHERE role = 'admin' AND status = 'active'
    ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'All current data now belongs to pharmacy %', home;
END $$;

-- ---------- 3. security ----------
-- Only the backend (service_role key) may read or change these
ALTER TABLE pharmacies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_owners ENABLE ROW LEVEL SECURITY;

-- ---------- check ----------
-- Who can approve new pharmacies (should be you):
--   SELECT s.email FROM platform_owners o JOIN staff s ON s.user_id = o.user_id;
-- Your pharmacy and how much it holds:
--   SELECT ph.name, (SELECT count(*) FROM products p WHERE p.pharmacy_id = ph.id) AS products,
--          (SELECT count(*) FROM staff st WHERE st.pharmacy_id = ph.id) AS staff
--   FROM pharmacies ph ORDER BY 2 DESC;
