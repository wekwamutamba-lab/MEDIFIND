-- migration_cost_price.sql
-- Cost prices, so profit is worked out from what each medicine cost instead of
-- a flat 30% of sales.
--   products.cost_price  what the pharmacy pays for one unit (typed on Products,
--                        or set from the supplier's price when a restock is
--                        marked Received)
--   orders.cost_total    what the medicines in that sale cost, saved at the time
--                        of the sale, so a later change to the cost price does not
--                        rewrite past profit
-- Safe to run more than once. It does not change or delete any data.

ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC;
ALTER TABLE orders   ADD COLUMN IF NOT EXISTS cost_total NUMERIC;

-- The Products page reads products through this view, so it needs the new column
-- (added at the end, as Postgres requires when replacing a view).
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

-- Same access as before: only the server (service role) reads the view
REVOKE ALL ON vw_products_with_status FROM anon, authenticated, public;

-- Tell the API about the new columns straight away
NOTIFY pgrst, 'reload schema';
