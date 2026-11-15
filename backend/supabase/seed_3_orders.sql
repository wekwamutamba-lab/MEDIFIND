-- seed_3_orders.sql
-- 40 orders over the last 6 months, linking customers and products.
INSERT INTO orders (customer_id, product_id, quantity, order_date, status, payment_status)
SELECT
  floor(random()*20 + 1)::int AS customer_id,
  floor(random()*40 + 1)::int AS product_id,
  floor(random()*5 + 1)::int AS quantity,
  current_date - (random()*180)::int AS order_date,
  CASE floor(random()*3)::int
    WHEN 1 THEN 'delivered'
    WHEN 2 THEN 'pending'
    ELSE 'cancelled'
  END AS status,
  CASE floor(random()*3)::int
    WHEN 1 THEN 'paid'
    WHEN 2 THEN 'unpaid'
    ELSE 'refunded'
  END AS payment_status
FROM generate_series(1,40);