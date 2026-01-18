-- ============================================
-- WORKAROUND: Falls Constraint nicht löschbar
-- ============================================

-- Problem: Manche Supabase-Projekte haben Constraints, die durch
-- Migrationen "geschützt" sind und sich nicht löschen lassen.

-- Lösung: months Tabelle NEU ERSTELLEN ohne den Constraint!

-- WARNUNG: Sichert vorher deine Daten!

-- Schritt 1: Backup erstellen (alle Daten sichern)
CREATE TABLE months_backup AS SELECT * FROM months;
CREATE TABLE month_incomes_backup AS SELECT * FROM month_incomes;
CREATE TABLE fixed_categories_backup AS SELECT * FROM fixed_categories;
CREATE TABLE fixed_items_backup AS SELECT * FROM fixed_items;
CREATE TABLE private_expenses_backup AS SELECT * FROM private_expenses;

-- Schritt 2: Alle Foreign Keys auf months temporär löschen
ALTER TABLE month_incomes DROP CONSTRAINT IF EXISTS month_incomes_month_id_fkey;
ALTER TABLE fixed_categories DROP CONSTRAINT IF EXISTS fixed_categories_month_id_fkey;
ALTER TABLE private_expenses DROP CONSTRAINT IF EXISTS private_expenses_month_id_fkey;

-- Schritt 3: Alte months Tabelle löschen
DROP TABLE IF EXISTS months CASCADE;

-- Schritt 4: Neue months Tabelle OHNE year/month unique constraint
CREATE TABLE months (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INT NOT NULL,
    month INT NOT NULL CHECK (month >= 1 AND month <= 12),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    private_balance_start NUMERIC(10, 2) NOT NULL DEFAULT 0,
    private_balance_end NUMERIC(10, 2),
    total_transfer_this_month NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Schritt 5: PARTIAL INDEX erstellen (nur offene Monate unique)
CREATE UNIQUE INDEX months_year_month_open_unique 
ON months (year, month) 
WHERE status = 'open';

-- Schritt 6: Daten zurück kopieren
INSERT INTO months SELECT * FROM months_backup;

-- Schritt 7: Foreign Keys wieder herstellen
ALTER TABLE month_incomes ADD CONSTRAINT month_incomes_month_id_fkey 
    FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE;
    
ALTER TABLE fixed_categories ADD CONSTRAINT fixed_categories_month_id_fkey 
    FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE;
    
ALTER TABLE private_expenses ADD CONSTRAINT private_expenses_month_id_fkey 
    FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE;

-- Schritt 8: Backups löschen
DROP TABLE months_backup;
DROP TABLE month_incomes_backup;
DROP TABLE fixed_categories_backup;
DROP TABLE fixed_items_backup;
DROP TABLE private_expenses_backup;

-- Schritt 9: Verifikation
SELECT 
    'SUCCESS: Tabelle neu erstellt ohne alten Constraint!' as status,
    COUNT(*) as anzahl_monate
FROM months;

