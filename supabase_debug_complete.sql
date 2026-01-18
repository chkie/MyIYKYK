-- ============================================
-- SYSTEMATISCHE DEBUG-ANALYSE
-- ============================================

-- ========== SCHRITT 1: Templates Check ==========
-- Sind die Templates in der DB?

SELECT 
    '1. Templates vorhanden?' as check_step,
    COUNT(*) as anzahl,
    CASE 
        WHEN COUNT(*) = 14 THEN '✅ Templates OK'
        ELSE '❌ Templates fehlen'
    END as status
FROM fixed_cost_template_items;


-- ========== SCHRITT 2: Monat Check ==========
-- Gibt es einen offenen Monat?

SELECT 
    '2. Offener Monat vorhanden?' as check_step,
    id,
    year,
    month,
    created_at,
    CASE 
        WHEN id IS NOT NULL THEN '✅ Monat existiert'
        ELSE '❌ Kein Monat'
    END as status
FROM months
WHERE status = 'open'
ORDER BY created_at DESC
LIMIT 1;


-- ========== SCHRITT 3: Kategorien im Monat ==========
-- Hat der offene Monat Kategorien?

SELECT 
    '3. Kategorien im Monat?' as check_step,
    COUNT(*) as anzahl_kategorien,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ LEER - Templates wurden nicht kopiert!'
        WHEN COUNT(*) = 3 THEN '✅ OK - 3 Kategorien'
        ELSE '⚠️ Unerwartete Anzahl'
    END as status
FROM fixed_categories
WHERE month_id = (SELECT id FROM months WHERE status = 'open' LIMIT 1);


-- ========== SCHRITT 4: Items im Monat ==========
-- Hat der offene Monat Items?

SELECT 
    '4. Items im Monat?' as check_step,
    COUNT(*) as anzahl_items,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ LEER - Templates wurden nicht kopiert!'
        WHEN COUNT(*) = 14 THEN '✅ OK - 14 Items'
        ELSE '⚠️ Unerwartete Anzahl'
    END as status
FROM fixed_items
WHERE category_id IN (
    SELECT id FROM fixed_categories 
    WHERE month_id = (SELECT id FROM months WHERE status = 'open' LIMIT 1)
);


-- ========== SCHRITT 5: Detail-Ansicht ==========
-- Was ist genau im Monat?

SELECT 
    c.label as kategorie,
    c.is_from_template as von_template,
    i.label as item,
    i.amount as betrag,
    i.split_mode as aufteilung,
    i.is_from_template as item_von_template
FROM fixed_categories c
LEFT JOIN fixed_items i ON i.category_id = c.id
WHERE c.month_id = (SELECT id FROM months WHERE status = 'open' LIMIT 1)
ORDER BY c.label, i.label;


-- ========== ZUSAMMENFASSUNG ==========

SELECT 
    'ZUSAMMENFASSUNG' as titel,
    '' as leer,
    (SELECT COUNT(*) FROM fixed_cost_template_items) as template_items,
    (SELECT COUNT(*) FROM months WHERE status = 'open') as offene_monate,
    (SELECT COUNT(*) FROM fixed_categories WHERE month_id IN (SELECT id FROM months WHERE status = 'open')) as kategorien_im_monat,
    (SELECT COUNT(*) FROM fixed_items WHERE category_id IN (SELECT id FROM fixed_categories WHERE month_id IN (SELECT id FROM months WHERE status = 'open'))) as items_im_monat;


-- ========== DIAGNOSE ==========

SELECT 
    CASE
        WHEN (SELECT COUNT(*) FROM months WHERE status = 'open') = 0 
            THEN '❌ PROBLEM: Kein offener Monat! Wurde die App neu geladen?'
        WHEN (SELECT COUNT(*) FROM fixed_categories WHERE month_id IN (SELECT id FROM months WHERE status = 'open')) = 0
            THEN '❌ PROBLEM: Monat hat keine Kategorien! Templates wurden nicht kopiert. Code-Problem!'
        WHEN (SELECT COUNT(*) FROM fixed_categories WHERE month_id IN (SELECT id FROM months WHERE status = 'open')) = 3
            AND (SELECT COUNT(*) FROM fixed_items WHERE category_id IN (SELECT id FROM fixed_categories WHERE month_id IN (SELECT id FROM months WHERE status = 'open'))) = 14
            THEN '✅ ALLES OK: Monat hat alle Templates! Frontend-Problem?'
        ELSE '⚠️ UNBEKANNTES PROBLEM: Unerwarteter Zustand'
    END as diagnose;

