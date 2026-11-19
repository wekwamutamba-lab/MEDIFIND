-- seed_4_payments.sql
-- One payment per order, with method and status matching order payment_status.
INSERT INTO payments (order_id, amount, method, status, payment_date)
SELECT
  id,
  round(random()*200 + 50)::numeric(10,2),
  CASE floor(random()*4)::int
    WHEN 1 THEN 'Cash'
    WHEN 2 THEN 'Card'
    WHEN 3 THEN 'Mobile Money'
    ELSE 'Bank Transfer'
  END,
  CASE payment_status
    WHEN 'paid' THEN 'completed'
    WHEN 'unpaid' THEN 'pending'
    ELSE 'refunded'
  END,
  current_date - (random()*60)::int
FROM orders;