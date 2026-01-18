-- ============================================
-- ANALYSE: Welche Monate existieren?
-- ============================================

-- Check 1: ALLE Monate anzeigen (auch closed)
SELECT 
    id,
    year,
    month,
    status,
    created_at,
    closed_at,
    CASE 
        WHEN year = EXTRACT(YEAR FROM NOW()) 
         AND month = EXTRACT(MONTH FROM NOW()) 
        THEN '✅ IST AKTUELLER MONAT'
        WHEN status = 'open' 
        THEN '⚠️ OFFEN aber FALSCHES Jahr/Monat!'
        ELSE '❌ Geschlossen'
    END as analyse
FROM months
ORDER BY year DESC, month DESC;


-- Check 2: Aktuelles Jahr/Monat
SELECT 
    EXTRACT(YEAR FROM NOW()) as should_be_year,
    EXTRACT(MONTH FROM NOW()) as should_be_month,
    NOW() as server_time;


-- Check 3: Gibt es einen offenen Monat mit FALSCHEM Jahr/Monat?
SELECT 
    'PROBLEM GEFUNDEN!' as warnung,
    id,
    year,
    month,
    status,
    'Monat ist OFFEN aber nicht aktuelles Jahr/Monat!' as beschreibung
FROM months
WHERE status = 'open'
  AND (year != EXTRACT(YEAR FROM NOW()) OR month != EXTRACT(MONTH FROM NOW()));


-- Check 4: Der Monat aus deinem Log
SELECT 
    'Der Monat aus dem Log:' as info,
    id,
    year,
    month,
    status,
    created_at,
    CASE 
        WHEN status = 'closed' THEN '❌ PROBLEM: Monat ist GESCHLOSSEN!'
        WHEN year != EXTRACT(YEAR FROM NOW()) THEN '❌ PROBLEM: Falsches JAHR!'
        WHEN month != EXTRACT(MONTH FROM NOW()) THEN '❌ PROBLEM: Falscher MONAT!'
        ELSE '✅ Korrekt'
    END as analyse
FROM months
WHERE id = '3bd4138f-dc64-40f9-944d-ed4fad043c8d';

