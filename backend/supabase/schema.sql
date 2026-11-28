-- ==============================================================
-- MediFind – Supabase database schema
-- ==============================================================
-- This file describes the live MediFind database. Use it only to set up a
-- NEW, empty Supabase project (paste it into the SQL Editor, then run the
-- seed files in order). Do not run it on the live database: it would not
-- change existing tables, and the live database already matches it.
--
-- Fresh project: after the first person signs up in the app, make them the
-- admin with STEP 4 of migration_roles.sql (put in their email). Without an
-- admin, nobody can approve anyone.
--
-- Security: every table has Row Level Security (RLS) switched on and NO
-- policies. The backend uses the service_role key, which is not limited by
-- RLS, so the app works normally. The public (anon) key, which ships in
-- the frontend for login only, cannot read or change any rows.
--
-- Three older columns are kept because they exist in the live database,
-- but the app no longer uses them:
--   products.expiration_date  (the app uses expiry_date)
--   orders.total_price        (the app uses total)
--   payments.payment_method   (the app uses method)
--
-- Values the app writes:
--   orders.status            Pending | Completed | Cancelled
--   orders.payment_status    Pending | Paid | Failed | Refunded
--   payments.status          Pending | Completed | Failed | Refunded
--   payments.method          Cash | EcoCash | Card | Bank Transfer
--   restock_orders.status    Ordered | Received
--   staff.role               admin | till
--   staff.status             pending | active | suspended | rejected
-- ==============================================================


-- --------------------------------------------------------------
-- pharmacies
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pharmacies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  lat         NUMERIC NOT NULL,
  lng         NUMERIC NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------
-- products (the pharmacy's own stock)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  form             TEXT,                 -- e.g. tablets, syrup, injection
  category         TEXT,                 -- e.g. Pain Relief, Antibiotic
  quantity         INTEGER DEFAULT 0,
  expiration_date  DATE,                 -- old column, not used by the app
  pharmacy_id      UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT now(),
  price            NUMERIC DEFAULT 0,
  expiry_date      DATE,
  cost_price       NUMERIC               -- what one unit costs the pharmacy (for profit)
);

-- --------------------------------------------------------------
-- customers
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  email       TEXT
);

-- --------------------------------------------------------------
-- orders (one row per medicine sold)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name    TEXT,                 -- the medicine's name, kept if the product is deleted
  quantity        INTEGER DEFAULT 1,
  total_price     NUMERIC,              -- old column, not used by the app
  status          TEXT DEFAULT 'Pending',
  created_at      TIMESTAMPTZ DEFAULT now(),
  total           NUMERIC DEFAULT 0,
  order_date      TIMESTAMPTZ DEFAULT now(),
  payment_status  TEXT DEFAULT 'Pending',
  cashier_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- who made the sale
  cashier_name    TEXT,
  cost_total      NUMERIC               -- what the medicines in this sale cost, saved at the time
);

-- --------------------------------------------------------------
-- payments (one per order)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES orders(id) ON DELETE CASCADE,
  amount          NUMERIC DEFAULT 0,
  payment_method  TEXT,                 -- old column, not used by the app
  status          TEXT DEFAULT 'Pending',
  created_at      TIMESTAMPTZ DEFAULT now(),
  method          TEXT DEFAULT 'Cash',
  payment_date    TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------
-- suppliers (wholesalers the pharmacy restocks from)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  address         TEXT,
  phone           TEXT,
  lat             NUMERIC,
  lng             NUMERIC,
  delivery_hours  INTEGER,
  email           TEXT,
  whatsapp        TEXT,
  notes           TEXT
);

-- --------------------------------------------------------------
-- supplier_products (what each supplier sells, and at what price)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  product_name  TEXT NOT NULL,
  category      TEXT,
  unit_price    NUMERIC DEFAULT 0,
  stock         INTEGER DEFAULT 0
);

-- --------------------------------------------------------------
-- restock_orders (orders the pharmacy places with suppliers)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restock_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  product_name  TEXT,
  quantity      INTEGER,
  total         NUMERIC,
  status        TEXT DEFAULT 'Ordered',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------
-- support_tickets (messages sent from the Help page)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT,
  subject     TEXT,
  message     TEXT,
  status      TEXT DEFAULT 'Open',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------
-- pharmacy_settings (a single row with id = 1, edited on the Settings page;
-- the backend creates it on first use)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pharmacy_settings (
  id                   INTEGER PRIMARY KEY,
  pharmacy_name        TEXT,
  pharmacist_name      TEXT,
  phone                TEXT,
  whatsapp             TEXT,
  email                TEXT,
  address              TEXT,
  city                 TEXT,
  license_number       TEXT,
  low_stock_threshold  INTEGER DEFAULT 20,
  expiry_warning_days  INTEGER DEFAULT 30,
  message_footer       TEXT,
  updated_at           TIMESTAMPTZ DEFAULT now(),
  join_code            TEXT                 -- staff type this to ask to join
);

-- --------------------------------------------------------------
-- staff (who may use the app: role admin or till, approved or not).
-- A row is created when someone asks to join; an admin approves it
-- on the Staff page.
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  full_name       TEXT,
  role            TEXT NOT NULL DEFAULT 'till'    CHECK (role IN ('admin', 'till')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  requested_role  TEXT CHECK (requested_role IN ('admin', 'till')),
  pharmacy_name   TEXT,                -- filled in by "Register pharmacy"
  license_number  TEXT,
  whatsapp        TEXT,
  address         TEXT,
  decided_by      UUID,
  decided_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);


-- --------------------------------------------------------------
-- View: products with a stock status, used by the Products page
-- and the dashboard. security_invoker makes the view follow the
-- tables' RLS, so the public key cannot read products through it.
-- --------------------------------------------------------------
CREATE OR REPLACE VIEW vw_products_with_status
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.name,
  p.form,
  p.category,
  p.quantity,
  p.price,
  p.expiry_date,
  p.pharmacy_id,
  CASE
    WHEN p.quantity = 0 THEN 'Out of Stock'
    WHEN p.quantity < 20 THEN 'Low Stock'
    ELSE 'In Stock'
  END AS status,
  ph.name AS pharmacy_name,
  ph.lat  AS pharmacy_lat,
  ph.lng  AS pharmacy_lng,
  p.cost_price
FROM products p
  LEFT JOIN pharmacies ph ON ph.id = p.pharmacy_id;


-- --------------------------------------------------------------
-- Row Level Security: on for every table, with no policies.
-- Only the backend (service_role key) can read and write.
-- --------------------------------------------------------------
ALTER TABLE pharmacies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff             ENABLE ROW LEVEL SECURITY;

-- ==============================================================
-- End of schema
-- ==============================================================
