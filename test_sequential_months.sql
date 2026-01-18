-- ============================================
-- TEST: Sequentielle Monatserstellung
-- ============================================

-- Aktueller Status anzeigen
SELECT 
    year,
    month,
    status,
    created_at,
    CASE 
        WHEN status = 'open' THEN '👈 AKTUELLER MONAT'
        ELSE ''
    END as info
FROM months
ORDER BY year DESC, month DESC;

-- Erwartetes Verhalten nach dem Fix:
-- 1. Monat abschließen → Januar wird "closed"
-- 2. App neu laden → Februar wird als "open" erstellt
-- 3. Monat abschließen → Februar wird "closed"
-- 4. App neu laden → März wird als "open" erstellt
-- usw.

-- ============================================
-- OPTIONAL: Reset zum Testen
-- ============================================

-- Falls du nochmal von vorne testen willst:
-- (Löscht ALLE Monate und zugehörige Daten!)

/*
DELETE FROM fixed_items;
DELETE FROM fixed_categories;
DELETE FROM private_expenses;
DELETE FROM month_incomes;
DELETE FROM months;

-- Dann App neu laden → Erstellt Januar 2026
*/

