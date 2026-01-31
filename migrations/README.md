# Database Migrations

Manual SQL migrations for Supabase database.

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://app.supabase.com → Your Project → SQL Editor
2. Copy contents of migration file (e.g., `001_add_created_by_to_positions.sql`)
3. Paste and run
4. Verify success in logs

### Option 2: Supabase CLI
```bash
supabase db push migrations/001_add_created_by_to_positions.sql
```

## Migrations

| # | Name | Date | Description | Status |
|---|------|------|-------------|--------|
| 001 | add_created_by_to_positions | 2026-01-31 | Add created_by to private_expenses & fixed_items | ⏳ Pending |

## Rollback

To rollback a migration, run the corresponding `*_rollback.sql` file:

```bash
# Example: Rollback migration 001
supabase db push migrations/001_rollback.sql
```

⚠️ **WARNING**: Rollbacks may cause data loss. Always backup before rollback.

## Verification

After applying migration 001:

```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('private_expenses', 'fixed_items') 
AND column_name = 'created_by';

-- Check indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('private_expenses', 'fixed_items')
AND indexname LIKE '%created_by%';

-- Count NULL values (should be all existing rows)
SELECT 
  'private_expenses' as table_name,
  COUNT(*) as total_rows,
  COUNT(created_by) as with_creator,
  COUNT(*) - COUNT(created_by) as without_creator
FROM private_expenses
UNION ALL
SELECT 
  'fixed_items',
  COUNT(*),
  COUNT(created_by),
  COUNT(*) - COUNT(created_by)
FROM fixed_items;
```
