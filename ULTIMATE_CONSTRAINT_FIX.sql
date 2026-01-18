-- ============================================
-- ULTIMATIVE LÖSUNG: Constraint definitiv entfernen
-- ============================================

-- Schritt 1: Den genauen Namen des Constraints finden
SELECT 
    conname as constraint_name,
    contype as type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.months'::regclass
  AND (conname LIKE '%year%' OR conname LIKE '%month%' OR pg_get_constraintdef(oid) LIKE '%year%');

-- Das zeigt dir den EXAKTEN Namen des Constraints!

-- ============================================
-- Schritt 2: Constraint mit FORCE löschen
-- ============================================

-- Methode 1: Standard DROP
ALTER TABLE public.months DROP CONSTRAINT IF EXISTS months_year_month_unique CASCADE;

-- Methode 2: Über Index löschen (falls es ein UNIQUE INDEX ist)
DROP INDEX IF EXISTS public.months_year_month_unique CASCADE;

-- Methode 3: Alle ähnlichen Namen probieren
ALTER TABLE public.months DROP CONSTRAINT IF EXISTS months_year_month_key CASCADE;
ALTER TABLE public.months DROP CONSTRAINT IF EXISTS months_year_month_idx CASCADE;

-- Methode 4: FORCE über System-Tabellen
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.months'::regclass
          AND contype IN ('u', 'p')  -- unique oder primary
          AND pg_get_constraintdef(oid) LIKE '%year%month%'
    LOOP
        EXECUTE format('ALTER TABLE public.months DROP CONSTRAINT %I CASCADE', r.conname);
        RAISE NOTICE 'Dropped: %', r.conname;
    END LOOP;
    
    -- Auch Indexes löschen
    FOR r IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'months'
          AND indexdef LIKE '%year%month%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS public.%I CASCADE', r.indexname);
        RAISE NOTICE 'Dropped index: %', r.indexname;
    END LOOP;
END $$;

-- ============================================
-- Schritt 3: Neuen PARTIAL INDEX erstellen
-- ============================================

-- Erst löschen falls vorhanden
DROP INDEX IF EXISTS public.months_year_month_open_unique;

-- Dann neu erstellen
CREATE UNIQUE INDEX months_year_month_open_unique 
ON public.months (year, month) 
WHERE status = 'open';

-- ============================================
-- Schritt 4: Verifikation
-- ============================================

-- Alle Constraints anzeigen (sollte den alten NICHT mehr zeigen!)
SELECT 
    'CONSTRAINTS' as type,
    conname as name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.months'::regclass
UNION ALL
SELECT 
    'INDEXES' as type,
    indexname as name,
    indexdef as definition
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'months'
ORDER BY type, name;

-- ✅ Erwartete Ausgabe:
-- - Kein "months_year_month_unique"
-- - Nur "months_year_month_open_unique" mit WHERE status = 'open'

