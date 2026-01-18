-- ============================================
-- VERIFIKATION: Template-System funktioniert
-- ============================================

-- Check 1: Templates sind persistent (unabhängig vom Monat)
SELECT 
    'TEMPLATE-DATEN (persistent, monatunabhängig)' as typ,
    c.label as kategorie,
    i.label as item,
    i.amount as betrag,
    i.split_mode as aufteilung
FROM fixed_cost_template_categories c
JOIN fixed_cost_template_items i ON i.template_category_id = c.id
ORDER BY c.sort_order, i.sort_order;

-- Erwartete Ausgabe: 14 Zeilen mit deinen Standard-Fixkosten


-- Check 2: Aktueller Monat hat Kopien der Templates
SELECT 
    'MONAT-DATEN (Kopie der Templates für diesen Monat)' as typ,
    c.label as kategorie,
    c.is_from_template as ist_template_kopie,
    i.label as item,
    i.amount as betrag,
    i.split_mode as aufteilung,
    i.is_from_template as item_ist_template_kopie
FROM fixed_categories c
JOIN fixed_items i ON i.category_id = c.id
WHERE c.month_id = (SELECT id FROM months WHERE status = 'open' LIMIT 1)
ORDER BY c.label, i.label;

-- Erwartete Ausgabe: 14 Zeilen, alle mit ist_template_kopie = true


-- Check 3: Prüfen ob Template-IDs verlinkt sind
SELECT 
    c.label as kategorie,
    c.template_category_id as verlinkt_mit_template_kategorie,
    i.label as item,
    i.template_item_id as verlinkt_mit_template_item,
    CASE 
        WHEN c.template_category_id IS NOT NULL AND i.template_item_id IS NOT NULL 
        THEN '✅ Korrekt verlinkt'
        ELSE '⚠️ Nicht verlinkt'
    END as status
FROM fixed_categories c
JOIN fixed_items i ON i.category_id = c.id
WHERE c.month_id = (SELECT id FROM months WHERE status = 'open' LIMIT 1)
ORDER BY c.label, i.label;


-- ============================================
-- SIMULATION: Neuer Monat erstellen (Test)
-- ============================================

-- WICHTIG: Nur zum Testen! Führe das NUR aus wenn du testen willst!
-- Erstellt einen Test-Monat für Februar 2026

/*
-- NICHT AUSFÜHREN - NUR ZUM ANSCHAUEN:

-- 1. Monat erstellen
INSERT INTO months (year, month, status, private_balance_start, total_transfer_this_month)
VALUES (2026, 2, 'open', 0, 0)
RETURNING id;

-- 2. Templates würden automatisch kopiert werden durch die App
-- (Das passiert in getOrCreateCurrentMonth() automatisch)

-- 3. Prüfen ob Templates kopiert wurden
SELECT COUNT(*) FROM fixed_categories WHERE month_id = [neue-monat-id];
-- Sollte 3 sein

SELECT COUNT(*) FROM fixed_items 
WHERE category_id IN (SELECT id FROM fixed_categories WHERE month_id = [neue-monat-id]);
-- Sollte 14 sein
*/


-- ============================================
-- ZUSAMMENFASSUNG
-- ============================================

SELECT 
    'ZUSAMMENFASSUNG - Template-System' as titel,
    (SELECT COUNT(*) FROM fixed_cost_template_categories) as template_kategorien,
    (SELECT COUNT(*) FROM fixed_cost_template_items) as template_items,
    (SELECT COUNT(*) FROM fixed_categories WHERE month_id IN (SELECT id FROM months WHERE status = 'open')) as monat_kategorien,
    (SELECT COUNT(*) FROM fixed_items WHERE category_id IN (SELECT id FROM fixed_categories WHERE month_id IN (SELECT id FROM months WHERE status = 'open'))) as monat_items,
    CASE 
        WHEN (SELECT COUNT(*) FROM fixed_cost_template_items) = 14 
         AND (SELECT COUNT(*) FROM fixed_items WHERE category_id IN (SELECT id FROM fixed_categories WHERE month_id IN (SELECT id FROM months WHERE status = 'open'))) = 14
        THEN '✅ PERFEKT: Templates persistent und im Monat kopiert!'
        ELSE '⚠️ Problem'
    END as status;

