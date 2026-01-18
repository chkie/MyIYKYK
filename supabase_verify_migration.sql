-- ============================================
-- SCHRITT 1: Tabellen überprüfen
-- ============================================

-- Check 1: Existieren die Template-Tabellen?
SELECT 
    tablename,
    CASE 
        WHEN tablename IN ('fixed_cost_template_categories', 'fixed_cost_template_items') 
        THEN '✅ Tabelle existiert'
        ELSE '❌ Tabelle fehlt'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE '%template%'
ORDER BY tablename;

-- Erwartete Ausgabe: 2 Zeilen
-- fixed_cost_template_categories | ✅ Tabelle existiert
-- fixed_cost_template_items      | ✅ Tabelle existiert


-- ============================================
-- SCHRITT 2: Columns überprüfen (bestehende Tabellen)
-- ============================================

-- Check 2: Wurden neue Columns zu fixed_cost_categories hinzugefügt?
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'fixed_cost_categories'
  AND column_name IN ('is_from_template', 'template_category_id')
ORDER BY column_name;

-- Erwartete Ausgabe: 2 Zeilen
-- is_from_template      | boolean
-- template_category_id  | uuid


-- Check 3: Wurden neue Columns zu fixed_cost_items hinzugefügt?
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'fixed_cost_items'
  AND column_name IN ('is_from_template', 'template_item_id')
ORDER BY column_name;

-- Erwartete Ausgabe: 2 Zeilen
-- is_from_template | boolean
-- template_item_id | uuid


-- ============================================
-- SCHRITT 3: Template-Daten überprüfen
-- ============================================

-- Check 4: Wie viele Template-Kategorien existieren?
SELECT 
    COUNT(*) as anzahl_kategorien,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ Korrekt (3 Kategorien)'
        WHEN COUNT(*) = 0 THEN '⚠️ Keine Daten - Seed-Script ausführen!'
        ELSE '⚠️ Falsche Anzahl'
    END as status
FROM fixed_cost_template_categories;

-- Erwartete Ausgabe: anzahl_kategorien = 3


-- Check 5: Template-Kategorien im Detail
SELECT 
    label,
    sort_order,
    (SELECT COUNT(*) FROM fixed_cost_template_items WHERE template_category_id = c.id) as anzahl_items
FROM fixed_cost_template_categories c
ORDER BY sort_order;

-- Erwartete Ausgabe:
-- Wohnung & Haushalt | 1 | 8
-- Auto               | 2 | 3
-- Haustiere          | 3 | 3


-- Check 6: Alle Template-Items anzeigen
SELECT 
    c.label as kategorie,
    i.label as item,
    i.amount as betrag,
    i.split_mode as aufteilung,
    i.sort_order
FROM fixed_cost_template_categories c
LEFT JOIN fixed_cost_template_items i ON i.template_category_id = c.id
ORDER BY c.sort_order, i.sort_order;

-- Erwartete Ausgabe: 14 Zeilen mit allen deinen Fixkosten


-- ============================================
-- SCHRITT 4: RLS Policies überprüfen
-- ============================================

-- Check 7: Sind RLS Policies aktiv?
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_aktiviert
FROM pg_tables
WHERE tablename LIKE '%template%'
  AND schemaname = 'public';

-- Erwartete Ausgabe: rls_aktiviert = true für beide Tabellen


-- ============================================
-- SCHNELL-CHECK: Alles auf einen Blick
-- ============================================

-- Check 8: Komplett-Übersicht
SELECT 
    'Template Categories' as check_name,
    (SELECT COUNT(*) FROM fixed_cost_template_categories)::text as wert,
    CASE WHEN (SELECT COUNT(*) FROM fixed_cost_template_categories) = 3 
         THEN '✅ OK' ELSE '❌ FEHLER' END as status
UNION ALL
SELECT 
    'Template Items',
    (SELECT COUNT(*) FROM fixed_cost_template_items)::text,
    CASE WHEN (SELECT COUNT(*) FROM fixed_cost_template_items) = 14 
         THEN '✅ OK' ELSE '❌ FEHLER' END
UNION ALL
SELECT 
    'Neue Columns (categories)',
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'fixed_cost_categories' 
       AND column_name IN ('is_from_template', 'template_category_id'))::text,
    CASE WHEN (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_name = 'fixed_cost_categories' 
                 AND column_name IN ('is_from_template', 'template_category_id')) = 2 
         THEN '✅ OK' ELSE '❌ FEHLER' END
UNION ALL
SELECT 
    'Neue Columns (items)',
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'fixed_cost_items' 
       AND column_name IN ('is_from_template', 'template_item_id'))::text,
    CASE WHEN (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_name = 'fixed_cost_items' 
                 AND column_name IN ('is_from_template', 'template_item_id')) = 2 
         THEN '✅ OK' ELSE '❌ FEHLER' END;

-- Erwartete Ausgabe: Alle 4 Zeilen mit "✅ OK"

