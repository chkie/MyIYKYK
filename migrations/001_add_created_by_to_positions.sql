-- ============================================================================
-- Migration 001: Add created_by to position tables
-- ============================================================================
-- Author: AI Assistant
-- Date: 2026-01-31
-- Description:
--   Adds created_by column to private_expenses and fixed_items tables
--   to track who created each entry (Christian vs Steffi).
--
-- Safety:
--   - Nullable column (backward compatible with existing data)
--   - ON DELETE SET NULL (preserves data if profile deleted)
--   - No data migration required (old rows remain NULL = "Unbekannt")
-- ============================================================================

-- 1. Add created_by to private_expenses
-- ============================================================================
ALTER TABLE private_expenses
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles (id) ON DELETE SET NULL;

-- Create index for performance (filtering by creator)
CREATE INDEX IF NOT EXISTS idx_private_expenses_created_by ON private_expenses (created_by);

COMMENT ON COLUMN private_expenses.created_by IS 'Profile ID of user who created this expense (NULL = unknown/legacy)';

-- 2. Add created_by to fixed_items
-- ============================================================================
ALTER TABLE fixed_items
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles (id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_fixed_items_created_by ON fixed_items (created_by);

COMMENT ON COLUMN fixed_items.created_by IS 'Profile ID of user who created this fixed cost item (NULL = unknown/legacy)';

-- 3. Verify profiles table exists and has expected structure
-- ============================================================================
-- This is just a check - no changes made
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
    ) THEN
        RAISE EXCEPTION 'profiles table does not exist. Migration cannot proceed.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'role'
    ) THEN
        RAISE EXCEPTION 'profiles.role column does not exist. Migration cannot proceed.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'name'
    ) THEN
        RAISE EXCEPTION 'profiles.name column does not exist. Migration cannot proceed.';
    END IF;

    RAISE NOTICE 'Migration 001: Schema validation passed ✓';
END $$;

-- 4. Show summary
-- ============================================================================
DO $$ 
DECLARE
    private_count bigint;
    fixed_count bigint;
BEGIN
    SELECT COUNT(*) INTO private_count FROM private_expenses;
    SELECT COUNT(*) INTO fixed_count FROM fixed_items;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 001 completed successfully ✓';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'private_expenses rows: % (all created_by = NULL)', private_count;
    RAISE NOTICE 'fixed_items rows: % (all created_by = NULL)', fixed_count;
    RAISE NOTICE 'Next step: Update application code to populate created_by';
END $$;