-- ==============================================================
-- security_fix.sql – OPTIONAL, for the LIVE database
-- ==============================================================
-- What it does: stops anyone with the public (anon) key from reading or
-- changing data. It does not change any table, column or row.
--
-- Why it is safe: the frontend only uses Supabase for login. All data goes
-- through the backend, which uses the service_role key, and that key is not
-- limited by these rules. So the app keeps working exactly as before.
--
-- How to run: Supabase dashboard -> SQL Editor -> New query.
--   1. Run STEP 1 on its own and look at the result.
--   2. Run STEP 2.
--   3. Run STEP 1 again: it should return no rows.
-- Then open the app and check that the pages still load.
-- ==============================================================


-- STEP 1 (check): lists every security rule on the app's tables.
-- A rule with qual = 'true' lets anyone with the public key see everything.
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- STEP 2 (fix)
BEGIN;

-- Remove the "allow everything" rules from the old schema.sql, if present
DROP POLICY IF EXISTS "service_role_full_access_pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "service_role_full_access_products"   ON products;
DROP POLICY IF EXISTS "service_role_full_access_customers"  ON customers;
DROP POLICY IF EXISTS "service_role_full_access_orders"     ON orders;
DROP POLICY IF EXISTS "service_role_full_access_payments"   ON payments;

-- Make sure RLS is on for every table (no rules = only the backend has access)
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

-- The products view: make it follow the tables' rules, and stop the public
-- key reading it (the old schema.sql gave everyone read access)
ALTER VIEW vw_products_with_status SET (security_invoker = true);
REVOKE ALL ON vw_products_with_status FROM anon, authenticated, public;

COMMIT;

-- If STEP 1 still shows other rules after this (ones not created by the old
-- schema.sql), send the list before removing them.
