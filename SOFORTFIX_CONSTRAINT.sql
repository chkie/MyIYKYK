-- ============================================
-- SCHNELLFIX: Constraint Problem beheben
-- ============================================

-- Schritt 1: Aktuellen Status prüfen
SELECT 
    id,
    year,
    month,
    status,
    created_at,
    closed_at,
    '👈 Dieser Monat blockiert!' as info
FROM months
WHERE year = 2026 AND month = 1
ORDER BY created_at;

-- Schritt 2: Alten Constraint löschen
ALTER TABLE months DROP CONSTRAINT IF EXISTS months_year_month_unique;

-- Schritt 3: Neuen PARTIAL INDEX erstellen
CREATE UNIQUE INDEX IF NOT EXISTS months_year_month_open_unique 
ON months (year, month) 
WHERE status = 'open';

-- Schritt 4: Verifikation
SELECT 
    'Constraint gefixt!' as status,
    COUNT(*) FILTER (WHERE status = 'closed') as geschlossene_monate,
    COUNT(*) FILTER (WHERE status = 'open') as offene_monate
FROM months
WHERE year = 2026 AND month = 1;

-- Erwartetes Ergebnis:
-- geschlossene_monate: 1 (der alte)
-- offene_monate: 0 (wird beim nächsten Login erstellt)

