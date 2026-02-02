-- ============================================================================
-- Rollback Migration 002: Remove transfers table
-- ============================================================================
-- Use this if you need to undo the migration
-- WARNING: This will delete all transfer data!
-- ============================================================================

-- 1. Drop RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read transfers" ON transfers;
DROP POLICY IF EXISTS "Allow authenticated users to insert transfers" ON transfers;
DROP POLICY IF EXISTS "Allow authenticated users to delete transfers" ON transfers;

-- 2. Drop indexes
DROP INDEX IF EXISTS idx_transfers_month_id;
DROP INDEX IF EXISTS idx_transfers_created_at;
DROP INDEX IF EXISTS idx_transfers_created_by;

-- 3. Drop table
DROP TABLE IF EXISTS transfers;

-- ============================================================================
-- Rollback complete!
-- ============================================================================
