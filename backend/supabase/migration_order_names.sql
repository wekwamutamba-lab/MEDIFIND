-- ==============================================================
-- MediFind: keep the medicine's name on every sale
-- Run once in the Supabase SQL Editor, BEFORE copying the new code.
-- Safe to run more than once.
--
-- Until now a sale only pointed at the product. Deleting a product
-- blanked that link, so its old sales showed "Unknown" on Orders,
-- customer history, Sales, the dashboard and the weekly summary.
-- This adds the medicine's name to each sale and fills it in for the
-- sales already recorded. It does not change or delete any data.
-- ==============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Fill in the name for sales made before this change
UPDATE orders o
SET product_name = p.name
FROM products p
WHERE o.product_id = p.id
  AND o.product_name IS NULL;

-- Tell the API about the new column straight away
NOTIFY pgrst, 'reload schema';

-- ---------- check ----------
-- Sales that still have no name (their product was deleted before today):
--   SELECT count(*) FROM orders WHERE product_name IS NULL;
