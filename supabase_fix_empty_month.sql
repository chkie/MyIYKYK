-- ============================================
-- PROBLEM-ANALYSE: Hat der aktuelle Monat Kategorien?
-- ============================================

-- Check 1: Aktueller Monat
SELECT 
    id,
    year,
    month,
    status,
    created_at
FROM months
WHERE status = 'open'
ORDER BY year DESC, month DESC
LIMIT 1;

-- Check 2: Hat dieser Monat Fixkosten-Kategorien?
SELECT 
    COUNT(*) as anzahl_kategorien,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ LEER - Monat wurde vor Migration erstellt!'
        WHEN COUNT(*) > 0 THEN '✅ Hat Kategorien'
    END as status
FROM fixed_cost_categories
WHERE month_id = (SELECT id FROM months WHERE status = 'open' LIMIT 1);

-- Check 3: Detaillierte Kategorien-Übersicht
SELECT 
    c.label as kategorie,
    c.is_from_template as ist_von_template,
    COUNT(i.id) as anzahl_items
FROM fixed_cost_categories c
LEFT JOIN fixed_cost_items i ON i.category_id = c.id
WHERE c.month_id = (SELECT id FROM months WHERE status = 'open' LIMIT 1)
GROUP BY c.id, c.label, c.is_from_template
ORDER BY c.label;

-- ============================================
-- LÖSUNG: Monat zurücksetzen und Templates kopieren
-- ============================================

-- VORSICHT: Dies löscht den aktuellen Monat komplett!
-- Nur ausführen wenn noch keine wichtigen Daten drin sind!

-- Schritt 1: Aktuellen offenen Monat löschen
DELETE FROM fixed_cost_items 
WHERE category_id IN (
    SELECT id FROM fixed_cost_categories 
    WHERE month_id IN (SELECT id FROM months WHERE status = 'open')
);

DELETE FROM fixed_cost_categories 
WHERE month_id IN (SELECT id FROM months WHERE status = 'open');

DELETE FROM private_expenses 
WHERE month_id IN (SELECT id FROM months WHERE status = 'open');

DELETE FROM month_incomes 
WHERE month_id IN (SELECT id FROM months WHERE status = 'open');

DELETE FROM months WHERE status = 'open';

-- Schritt 2: App neu laden!
-- Die App wird automatisch einen neuen Monat erstellen - MIT Templates!

-- ============================================
-- VERIFIKATION: Nach dem Löschen
-- ============================================

-- Prüfe dass der Monat weg ist
SELECT 
    COUNT(*) as anzahl_offene_monate,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Gelöscht - App neu laden!'
        ELSE '⚠️ Noch da'
    END as status
FROM months 
WHERE status = 'open';

