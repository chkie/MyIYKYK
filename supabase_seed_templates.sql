-- Seed Script: Initial Template Data
-- Standard-Fixkosten die jeden Monat vorhanden sein sollen

-- Kategorie: Wohnung & Haushalt
INSERT INTO fixed_cost_template_categories (id, label, sort_order) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Wohnung & Haushalt', 1);

INSERT INTO fixed_cost_template_items (template_category_id, label, amount, split_mode, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', 'Miete', 550.00, 'income', 1),
('00000000-0000-0000-0000-000000000001', 'Strom', 110.00, 'income', 2),
('00000000-0000-0000-0000-000000000001', 'Amazon Prime', 8.00, 'income', 3),
('00000000-0000-0000-0000-000000000001', 'Netflix', 20.00, 'partner', 4),
('00000000-0000-0000-0000-000000000001', 'Apple TV', 25.00, 'me', 5),
('00000000-0000-0000-0000-000000000001', 'DAZN', 35.00, 'me', 6),
('00000000-0000-0000-0000-000000000001', 'Rundfunk', 18.00, 'income', 7),
('00000000-0000-0000-0000-000000000001', 'Versicherungen', 36.00, 'income', 8);

-- Kategorie: Auto
INSERT INTO fixed_cost_template_categories (id, label, sort_order) 
VALUES ('00000000-0000-0000-0000-000000000002', 'Auto', 2);

INSERT INTO fixed_cost_template_items (template_category_id, label, amount, split_mode, sort_order) VALUES
('00000000-0000-0000-0000-000000000002', 'Versicherung KIA', 60.00, 'income', 1),
('00000000-0000-0000-0000-000000000002', 'Versicherung BMW', 35.00, 'income', 2),
('00000000-0000-0000-0000-000000000002', 'Bankkredit KIA&BMW', 350.00, 'income', 3);

-- Kategorie: Haustiere
INSERT INTO fixed_cost_template_categories (id, label, sort_order) 
VALUES ('00000000-0000-0000-0000-000000000003', 'Haustiere', 3);

INSERT INTO fixed_cost_template_items (template_category_id, label, amount, split_mode, sort_order) VALUES
('00000000-0000-0000-0000-000000000003', 'Futter Bakari', 150.00, 'income', 1),
('00000000-0000-0000-0000-000000000003', 'Futter Dadööö', 80.00, 'income', 2),
('00000000-0000-0000-0000-000000000003', 'Versicherung Bakari', 50.00, 'income', 3);

