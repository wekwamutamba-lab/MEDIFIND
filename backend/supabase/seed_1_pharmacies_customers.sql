-- seed_1_pharmacies_customers.sql
-- Pharmacies
INSERT INTO pharmacies (name, address, lat, lng) VALUES
('Harare Central Pharmacy', '10 Cecil Ave, Harare', -17.8260, 31.0320),
('Mbare Medicentre', '76 Mbare Muslake, Harare', -17.8450, 31.0500),
('Eastgate Drug Store', '22 Borrowdale Rd, Harare', -17.8100, 31.0400);

-- Customers (20 rows)
INSERT INTO customers (name, phone, email, address) VALUES
('Aaron Masuka', '+263712345678', 'aaron.m@test.com', 'Marlborough, Harare'),
('Betty Chikosi', '+263712345679', 'betty.c@test.com', 'Mufakose, Harare'),
('Carlos Dube', '+263712345680', 'carlos.d@test.com', 'Kilimani, Harare'),
('Dorothy Gumbo', '+263712345681', 'dorothy.g@test.com', 'Marlborough, Harare'),
('Evan Ndebele', '+263712345682', 'evan.n@test.com', 'Mbare, Harare'),
('Fatima Moyo', '+263712345683', 'fatima.m@test.com', 'Westgate, Harare'),
('Gabriel Tafira', '+263712345684', 'gabriel.t@test.com', 'Borough, Harare'),
('Helen Mwale', '+263712345685', 'helen.m@test.com', 'CBD, Harare'),
('Ian Sakala', '+263712345686', 'ian.s@test.com', 'Epworth, Harare'),
('Jackie Banda', '+263712345687', 'jackie.b@test.com', 'Highfield, Harare'),
('Kelly Nyoni', '+263712345688', 'kelly.n@test.com', 'Southfield, Harare'),
('Liam Dube', '+263712345689', 'liam.d@test.com', 'Zengeza, Harare'),
('Martha Gwatidzo', '+263712345690', 'martha.g@test.com', 'Harare Gardens, Harare'),
('Norman Moyo', '+263712345691', 'norman.m@test.com', 'Hatfield, Harare'),
('Olivia Nkomo', '+263712345692', 'olivia.n@test.com', 'Kilbourgh, Harare'),
('Peter Chikomba', '+263712345693', 'peter.c@test.com', 'Warren Park, Harare'),
('Queen Dube', '+263712345694', 'queen.d@test.com', 'Marlborough, Harare'),
('Richard Tshuma', '+263712345695', 'richard.t@test.com', 'Marondera, Harare'),
('Susan Moyo', '+263712345696', 'susan.m@test.com', 'Chitungwiza, Harare');