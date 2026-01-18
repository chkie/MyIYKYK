-- ============================================
-- LÖSUNG: Monat manuell erstellen und Templates kopieren
-- ============================================

-- Schritt 1: Aktuelles Jahr/Monat ermitteln
SELECT 
    EXTRACT(YEAR FROM NOW()) as current_year,
    EXTRACT(MONTH FROM NOW()) as current_month;


-- Schritt 2: Monat manuell erstellen (passe year/month an!)
INSERT INTO months (year, month, status, private_balance_start, total_transfer_this_month)
VALUES (2026, 1, 'open', 0, 0)  -- <-- HIER: Jahr 2026, Monat 1 (Januar)
RETURNING id, year, month, status;

-- Merke dir die ID die zurückkommt!


-- Schritt 3: Templates manuell kopieren
-- WICHTIG: Ersetze 'MONTH_ID_HIER' mit der ID aus Schritt 2!

DO $$
DECLARE
    v_month_id UUID := 'MONTH_ID_HIER';  -- <-- HIER die ID eintragen!
    v_template_cat RECORD;
    v_new_cat_id UUID;
    v_template_item RECORD;
BEGIN
    -- Für jede Template-Kategorie
    FOR v_template_cat IN 
        SELECT id, label, sort_order 
        FROM fixed_cost_template_categories 
        ORDER BY sort_order
    LOOP
        -- Kategorie erstellen
        INSERT INTO fixed_categories (month_id, label, is_from_template, template_category_id, sort_order)
        VALUES (v_month_id, v_template_cat.label, true, v_template_cat.id, v_template_cat.sort_order)
        RETURNING id INTO v_new_cat_id;
        
        -- Items für diese Kategorie kopieren
        FOR v_template_item IN 
            SELECT label, amount, split_mode, sort_order
            FROM fixed_cost_template_items
            WHERE template_category_id = v_template_cat.id
            ORDER BY sort_order
        LOOP
            INSERT INTO fixed_items (category_id, label, amount, split_mode, is_from_template, template_item_id)
            VALUES (v_new_cat_id, v_template_item.label, v_template_item.amount, 
                    v_template_item.split_mode, true, v_template_item.template_item_id);
        END LOOP;
        
        RAISE NOTICE 'Kategorie kopiert: %', v_template_cat.label;
    END LOOP;
    
    RAISE NOTICE 'Templates erfolgreich kopiert!';
END $$;


-- Schritt 4: Verifizieren
SELECT 
    'Kategorien' as typ,
    COUNT(*) as anzahl
FROM fixed_categories
WHERE month_id = 'MONTH_ID_HIER'  -- <-- HIER die ID eintragen!
UNION ALL
SELECT 
    'Items',
    COUNT(*)
FROM fixed_items
WHERE category_id IN (SELECT id FROM fixed_categories WHERE month_id = 'MONTH_ID_HIER');  -- <-- HIER die ID eintragen!

-- Erwartete Ausgabe:
-- Kategorien | 3
-- Items      | 14

