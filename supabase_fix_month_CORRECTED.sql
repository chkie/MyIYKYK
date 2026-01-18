-- ============================================
-- KORRIGIERTE VERSION: Monat zurücksetzen
-- ============================================
-- Tabellennamen: fixed_categories, fixed_items (ohne "cost"!)

-- Schritt 1: Alle Items löschen
DELETE FROM fixed_items 
WHERE category_id IN (
    SELECT id FROM fixed_categories 
    WHERE month_id IN (SELECT id FROM months WHERE status = 'open')
);

-- Schritt 2: Alle Kategorien löschen
DELETE FROM fixed_categories 
WHERE month_id IN (SELECT id FROM months WHERE status = 'open');

-- Schritt 3: Private Ausgaben löschen
DELETE FROM private_expenses 
WHERE month_id IN (SELECT id FROM months WHERE status = 'open');

-- Schritt 4: Einkommen löschen
DELETE FROM month_incomes 
WHERE month_id IN (SELECT id FROM months WHERE status = 'open');

-- Schritt 5: Monat selbst löschen
DELETE FROM months WHERE status = 'open';

-- ============================================
-- VERIFIKATION
-- ============================================

-- Check: Ist der Monat weg?
SELECT 
    COUNT(*) as anzahl_offene_monate,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Gelöscht - App neu laden!'
        ELSE '⚠️ Noch da'
    END as status
FROM months 
WHERE status = 'open';

-- Erwartetes Ergebnis: anzahl_offene_monate = 0

