-- ============================================================================
-- Rollback 001: Remove created_by from position tables
-- ============================================================================
-- Author: AI Assistant
-- Date: 2026-01-31
-- Description: 
--   Reverts migration 001 - removes created_by columns and indexes
--
-- WARNING: This will permanently delete creator information!
-- ============================================================================

-- 1. Drop indexes
DROP INDEX IF EXISTS idx_private_expenses_created_by;
DROP INDEX IF EXISTS idx_fixed_items_created_by;

-- 2. Drop columns
ALTER TABLE private_expenses DROP COLUMN IF EXISTS created_by;
ALTER TABLE fixed_items DROP COLUMN IF EXISTS created_by;

-- 3. Confirmation
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Rollback 001 completed ✓';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'created_by columns removed from:';
    RAISE NOTICE '  - private_expenses';
    RAISE NOTICE '  - fixed_items';
END $$;
