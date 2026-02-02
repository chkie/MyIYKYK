-- ============================================================================
-- Migration 002: Add transfers table for tracking individual payments
-- ============================================================================
-- This migration adds support for multiple separate payments/transfers
-- instead of a single total_transfer_this_month value.
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Create transfers table
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    month_id UUID NOT NULL REFERENCES months (id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES profiles (id) ON DELETE SET NULL
);

-- 2. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transfers_month_id ON transfers (month_id);

CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transfers_created_by ON transfers (created_by);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies (allow authenticated users to read/write)
CREATE POLICY "Allow authenticated users to read transfers" ON transfers FOR
SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert transfers" ON transfers FOR
INSERT
    TO authenticated
WITH
    CHECK (true);

CREATE POLICY "Allow authenticated users to delete transfers" ON transfers FOR DELETE TO authenticated USING (true);

-- 5. Migrate existing total_transfer_this_month values to transfers
-- This creates one transfer entry for each month that has a non-zero transfer amount
INSERT INTO
    transfers (
        month_id,
        amount,
        description,
        created_by
    )
SELECT
    m.id AS month_id,
    m.total_transfer_this_month AS amount,
    'Initiale Vorauszahlung (migriert)' AS description,
    p.id AS created_by
FROM months m
    CROSS JOIN profiles p
WHERE
    m.total_transfer_this_month > 0
    AND p.role = 'me' -- Assign to 'me' profile as creator
    AND NOT EXISTS (
        -- Don't migrate if transfers already exist for this month
        SELECT 1
        FROM transfers t
        WHERE
            t.month_id = m.id
    );

-- 6. Add comment to document the table
COMMENT ON
TABLE transfers IS 'Individual payment/transfer records for tracking multiple payments per month';

COMMENT ON COLUMN transfers.month_id IS 'Reference to the month this transfer belongs to';

COMMENT ON COLUMN transfers.amount IS 'Transfer amount in EUR (must be >= 0)';

COMMENT ON COLUMN transfers.description IS 'Optional description/note for this transfer';

COMMENT ON COLUMN transfers.created_at IS 'Timestamp when the transfer was recorded';

COMMENT ON COLUMN transfers.created_by IS 'Profile ID of the user who created this transfer';

-- ============================================================================
-- Migration complete!
-- ============================================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify that transfers table was created: SELECT * FROM transfers;
-- 3. Check that existing payments were migrated (if any)
-- ============================================================================