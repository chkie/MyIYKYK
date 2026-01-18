-- ============================================
-- Aktuellen leeren Monat löschen
-- ============================================

-- Monat-ID: 97d349fe-ac18-4ed8-b649-f4403ef3ea4d

DELETE FROM fixed_items 
WHERE category_id IN (
    SELECT id FROM fixed_categories 
    WHERE month_id = '97d349fe-ac18-4ed8-b649-f4403ef3ea4d'
);

DELETE FROM fixed_categories 
WHERE month_id = '97d349fe-ac18-4ed8-b649-f4403ef3ea4d';

DELETE FROM private_expenses 
WHERE month_id = '97d349fe-ac18-4ed8-b649-f4403ef3ea4d';

DELETE FROM month_incomes 
WHERE month_id = '97d349fe-ac18-4ed8-b649-f4403ef3ea4d';

DELETE FROM months 
WHERE id = '97d349fe-ac18-4ed8-b649-f4403ef3ea4d';

-- Verifikation
SELECT COUNT(*) as anzahl_offene_monate 
FROM months 
WHERE status = 'open';

-- Sollte 0 sein!

