-- ==============================================================
-- MediFind Backend – Supabase SQL schema
-- ==============================================================
-- Run with: supabase db reset or psql postgresql://...
-- RLS is enabled below with service‑role bypass policies.

-- --------------------------------------------------------------
-- Table: pharmacies
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  lat NUMERIC(10, 6) NOT NULL,
  lng NUMERIC(10, 6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_pharmacies" ON pharmacies
  USING (true) WITH CHECK (true); -- service_role can do anything

-- --------------------------------------------------------------
-- Table: products
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  form TEXT NOT NULL,          -- e.g. tablet, syrup, injection
  category TEXT NOT NULL,      -- e.g. analgesic, antibiotic
  quantity INTEGER NOT NULL DEFAULT 0,
  expiration_date DATE,
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_products" ON products
  USING (true) WITH CHECK (true);

-- --------------------------------------------------------------
-- Table: customers
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_customers" ON customers
  USING (true) WITH CHECK (true);

-- --------------------------------------------------------------
-- Table: orders
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending, confirmed, delivered, cancelled
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_orders" ON orders
  USING (true) WITH CHECK (true);

-- --------------------------------------------------------------
-- Table: payments
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,   -- cash, card, mpesa
  status TEXT NOT NULL DEFAULT 'pending',   -- pending, completed, failed
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_payments" ON payments
  USING (true) WITH CHECK (true);

-- --------------------------------------------------------------
-- Helper view: product status (computed from quantity)
-- --------------------------------------------------------------
CREATE OR REPLACE VIEW vw_products_with_status AS
SELECT
  p.id,
  p.name,
  p.form,
  p.category,
  p.quantity,
  p.expiration_date,
  p.pharmacy_id,
  CASE
    WHEN p.quantity = 0 THEN 'Out of Stock'
    WHEN p.quantity < 20 THEN 'Low Stock'
    ELSE 'In Stock'
  END AS status,
  ph.name AS pharmacy_name,
  ph.lat AS pharmacy_lat,
  ph.lng AS pharmacy_lng
FROM products p
  JOIN pharmacies ph ON ph.id = p.pharmacy_id;

-- Grant public read access to the view (useful for API without RLS hassle)
GRANT SELECT ON vw_products_with_status TO public;

-- ==============================================================
-- End of schema
-- ==============================================================