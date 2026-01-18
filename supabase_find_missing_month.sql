-- ============================================
-- PROBLEM-ANALYSE: Wo ist der Monat?
-- ============================================

-- Check 1: Existiert dieser Monat überhaupt?
SELECT 
    id,
    year,
    month,
    status,
    created_at
FROM months
WHERE id = '3bd4138f-dc64-40f9-944d-ed4fad043c8d';

-- Wenn nichts kommt: Monat wurde nicht gespeichert!
-- Wenn was kommt: Prüfe den Status!


-- Check 2: Alle Monate anzeigen
SELECT 
    id,
    year,
    month,
    status,
    created_at
FROM months
ORDER BY created_at DESC
LIMIT 10;


-- Check 3: Gibt es RLS Policies die blockieren könnten?
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'months';


-- Check 4: Gibt es Constraints die fehlschlagen könnten?
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'months'::regclass;

