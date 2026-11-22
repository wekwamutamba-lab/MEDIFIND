-- seed_4_payments.sql
-- One payment per order, for the order's total, on the order's date.
-- The payment status follows the order's payment_status:
--   Paid -> Completed, Pending -> Pending, Failed -> Failed
INSERT INTO payments (order_id, amount, method, status, payment_date, created_at)
SELECT
  o.id,
  o.total,
  (ARRAY['Cash', 'EcoCash', 'Card', 'Bank Transfer'])[floor(random() * 4 + 1)::int],
  CASE o.payment_status
    WHEN 'Paid'    THEN 'Completed'
    WHEN 'Pending' THEN 'Pending'
    ELSE 'Failed'
  END,
  o.order_date,
  o.order_date
FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id);
