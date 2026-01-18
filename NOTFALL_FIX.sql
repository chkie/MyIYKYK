-- ============================================
-- NOTFALL-LÖSUNG A: Constraint komplett entfernen
-- ============================================

-- Diese Queries NACHEINANDER ausführen!

-- 1. Constraint über Index-Namen löschen
DROP INDEX IF EXISTS public.months_year_month_unique;

-- 2. Constraint über Constraint-Namen löschen
ALTER TABLE public.months DROP CONSTRAINT IF EXISTS months_year_month_unique;

-- 3. ALLE Unique Constraints auf (year, month) finden und löschen
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.months'::regclass
        AND contype = 'u'  -- unique constraint
        AND pg_get_constraintdef(oid) LIKE '%year%'
    LOOP
        EXECUTE format('ALTER TABLE public.months DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- 4. Neuen PARTIAL INDEX erstellen
CREATE UNIQUE INDEX months_year_month_open_unique 
ON public.months (year, month) 
WHERE status = 'open';

-- 5. Verifikation
SELECT 'SUCCESS: Constraint entfernt, neuer Index erstellt!' as status;

-- ============================================
-- NOTFALL-LÖSUNG B: Geschlossenen Monat löschen
-- (Falls Lösung A nicht funktioniert)
-- ============================================

-- WARNUNG: Löscht den geschlossenen Januar 2026!
-- Nur ausführen wenn Lösung A nicht hilft!

/*
DELETE FROM fixed_items 
WHERE category_id IN (
    SELECT id FROM fixed_categories 
    WHERE month_id IN (
        SELECT id FROM months 
        WHERE year = 2026 AND month = 1 AND status = 'closed'
    )
);

DELETE FROM fixed_categories 
WHERE month_id IN (
    SELECT id FROM months 
    WHERE year = 2026 AND month = 1 AND status = 'closed'
);

DELETE FROM private_expenses 
WHERE month_id IN (
    SELECT id FROM months 
    WHERE year = 2026 AND month = 1 AND status = 'closed'
);

DELETE FROM month_incomes 
WHERE month_id IN (
    SELECT id FROM months 
    WHERE year = 2026 AND month = 1 AND status = 'closed'
);

DELETE FROM months 
WHERE year = 2026 AND month = 1 AND status = 'closed';

SELECT 'Geschlossener Monat gelöscht!' as status;
*/

