-- seed_3_orders.sql
-- 40 demo orders over the last 6 months, each for a random customer and medicine.
-- Uses the status values the app writes:
--   status:         Completed | Pending | Cancelled
--   payment_status: Paid (completed), Pending (pending), Failed (cancelled)
INSERT INTO orders (customer_id, product_id, quantity, total, order_date, created_at, status, payment_status)
SELECT
  c.id,
  p.id,
  r.qty,
  round(r.qty * coalesce(p.price, 0), 2),
  r.order_date,
  r.order_date,
  r.status,
  CASE r.status
    WHEN 'Completed' THEN 'Paid'
    WHEN 'Pending'   THEN 'Pending'
    ELSE 'Failed'
  END
FROM generate_series(1, 40) AS g(n)
CROSS JOIN LATERAL (
  SELECT
    floor(random() * 5 + 1)::int AS qty,
    now() - (random() * 180) * INTERVAL '1 day' AS order_date,
    CASE floor(random() * 10)::int
      WHEN 0 THEN 'Cancelled'
      WHEN 1 THEN 'Pending'
      WHEN 2 THEN 'Pending'
      ELSE 'Completed'
    END AS status,
    g.n AS n
) AS r
-- "WHERE r.n = r.n" makes each row pick its own random customer and medicine
CROSS JOIN LATERAL (SELECT id FROM customers WHERE r.n = r.n ORDER BY random() LIMIT 1) AS c
CROSS JOIN LATERAL (SELECT id, price FROM products WHERE r.n = r.n ORDER BY random() LIMIT 1) AS p;
