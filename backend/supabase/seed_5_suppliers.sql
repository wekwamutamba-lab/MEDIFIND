-- seed_5_suppliers.sql
-- 4 demo suppliers (made-up names and numbers) and the medicines each one sells,
-- so the Suppliers and Restock pages have something to show.
INSERT INTO suppliers (name, address, phone, whatsapp, email, lat, lng, delivery_hours, notes) VALUES
('Greenleaf Pharma Wholesale', '14 Kenneth Kaunda Ave, Harare', '+263242700100', '+263772700100', 'orders@greenleaf.example', -17.8310, 31.0490, 24, 'Demo supplier'),
('Msasa Medical Supplies', '8 Mutare Rd, Msasa, Harare', '+263242700200', '+263772700200', 'sales@msasamed.example', -17.8420, 31.1150, 48, 'Demo supplier'),
('Avondale Drug Distributors', '3 King George Rd, Avondale, Harare', '+263242700300', '+263772700300', 'restock@avondaledd.example', -17.8030, 31.0360, 12, 'Demo supplier'),
('Southerton Pharmaceuticals', '21 Dunmore St, Southerton, Harare', '+263242700400', '+263772700400', 'info@southertonpharma.example', -17.8680, 31.0150, 72, 'Demo supplier');

INSERT INTO supplier_products (supplier_id, product_name, category, unit_price, stock)
SELECT s.id, v.product_name, v.category, v.unit_price, v.stock
FROM (VALUES
  ('Greenleaf Pharma Wholesale', 'Paracetamol', 'Pain Relief', 1.20, 500),
  ('Greenleaf Pharma Wholesale', 'Ibuprofen', 'Pain Relief', 1.60, 300),
  ('Greenleaf Pharma Wholesale', 'Amoxicillin', 'Antibiotic', 2.80, 250),
  ('Greenleaf Pharma Wholesale', 'Cetirizine', 'Allergy', 0.90, 400),
  ('Greenleaf Pharma Wholesale', 'Vitamin C', 'Supplements', 1.10, 600),
  ('Msasa Medical Supplies', 'Paracetamol', 'Pain Relief', 1.05, 800),
  ('Msasa Medical Supplies', 'Insulin', 'Diabetes', 9.50, 60),
  ('Msasa Medical Supplies', 'Metformin', 'Diabetes', 1.40, 350),
  ('Msasa Medical Supplies', 'Salbutamol', 'Respiratory', 5.20, 90),
  ('Msasa Medical Supplies', 'ORS', 'Rehydration', 0.40, 1000),
  ('Avondale Drug Distributors', 'Ciprofloxacin', 'Antibiotic', 3.40, 200),
  ('Avondale Drug Distributors', 'Metronidazole', 'Antibiotic', 1.90, 280),
  ('Avondale Drug Distributors', 'Omeprazole', 'Digestive', 1.70, 320),
  ('Avondale Drug Distributors', 'Amlodipine', 'Cardiovascular', 1.80, 260),
  ('Avondale Drug Distributors', 'Ibuprofen', 'Pain Relief', 1.45, 150),
  ('Southerton Pharmaceuticals', 'Losartan', 'Cardiovascular', 2.60, 180),
  ('Southerton Pharmaceuticals', 'Gentamicin', 'Antibiotic', 4.80, 70),
  ('Southerton Pharmaceuticals', 'Hydrocortisone', 'Skin Care', 2.10, 140),
  ('Southerton Pharmaceuticals', 'Diclofenac', 'Pain Relief', 1.75, 220),
  ('Southerton Pharmaceuticals', 'Fluconazole', 'Antifungal', 2.90, 110)
) AS v(supplier_name, product_name, category, unit_price, stock)
JOIN suppliers s ON s.name = v.supplier_name;
