-- ============================================
-- DIAGNOSE: Constraint Status überprüfen
-- ============================================

-- Schritt 1: Alle Constraints auf "months" Tabelle anzeigen
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.months'::regclass
ORDER BY conname;

-- Erwartete Ausgabe sollte "months_year_month_unique" NICHT enthalten!

-- Schritt 2: Alle Indexes auf "months" Tabelle anzeigen
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'months'
ORDER BY indexname;

-- Schritt 3: Aktuelle Monate anzeigen
SELECT 
    id,
    year,
    month,
    status,
    created_at
FROM months
WHERE year = 2026 AND month = 1
ORDER BY created_at;

