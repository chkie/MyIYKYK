-- ============================================
-- FIX: Unique Constraint Problem
-- ============================================

-- Problem: Der Constraint "months_year_month_unique" erlaubt nur EINEN Monat pro Jahr/Monat.
-- Das verhindert, dass wir geschlossene Monate behalten können!

-- Lösung: Constraint löschen und durch einen PARTIAL INDEX ersetzen,
-- der nur OFFENE Monate einzigartig macht.

-- 1. Alten Constraint löschen
ALTER TABLE months DROP CONSTRAINT IF EXISTS months_year_month_unique;

-- 2. Neuen PARTIAL INDEX erstellen (nur für offene Monate)
CREATE UNIQUE INDEX months_year_month_open_unique 
ON months (year, month) 
WHERE status = 'open';

-- Jetzt können wir:
-- ✅ Mehrere geschlossene Monate für 2026-01 haben
-- ✅ Aber nur EINEN offenen Monat für 2026-01

-- Verifikation:
SELECT 
    year,
    month,
    status,
    COUNT(*) as anzahl
FROM months
GROUP BY year, month, status
ORDER BY year DESC, month DESC, status;

-- Sollte zeigen: Mehrere "closed" pro Jahr/Monat ist OK, aber nur ein "open"

