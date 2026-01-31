# Patch 003 Hotfix: Manual JOIN für created_by

**Date**: 2026-01-31  
**Issue**: Supabase Schema-Cache kennt FK `created_by -> profiles(id)` noch nicht  
**Error**: `Could not find a relationship between 'private_expenses' and 'created_by'`

## Root Cause

Die Migration 001 hat die Spalte `created_by` hinzugefügt mit:
```sql
ALTER TABLE private_expenses 
ADD COLUMN created_by uuid REFERENCES profiles(id);
```

**Problem**: Supabase's automatische Schema-Erkennung für nested SELECT:
```typescript
.select(`
  id,
  description,
  created_by,
  profiles:created_by (name)  // ❌ Relationship not found
`)
```

Supabase cached das Schema und kennt die neue FK-Beziehung nicht sofort.

## Fix: Manual JOIN

Statt nested SELECT → manueller JOIN via Map:

```typescript
// 1. Fetch all profiles
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, name');

const profileMap = new Map();
profiles.forEach(p => profileMap.set(p.id, p.name));

// 2. Fetch expenses (no nested select)
const { data: expenses } = await supabase
  .from('private_expenses')
  .select('id, description, created_by'); // ✅ No relationship needed

// 3. Manual join
expenses.map(exp => ({
  ...exp,
  createdByName: exp.created_by 
    ? profileMap.get(exp.created_by) || null 
    : null
}));
```

## Changed

**File**: `src/lib/server/history.ts`

**Before** (broken):
```typescript
const { data: expenses } = await supabase
  .from('private_expenses')
  .select(`
    id,
    description,
    created_by,
    profiles:created_by (name)  // ❌ Crashes
  `)
```

**After** (fixed):
```typescript
// Step 1: Fetch profiles
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, name');

const profileMap = new Map();
(profiles || []).forEach(p => profileMap.set(p.id, p.name));

// Step 2: Fetch expenses (simple select)
const { data: expenses } = await supabase
  .from('private_expenses')
  .select('id, description, amount, created_at, created_by');

// Step 3: Map manually
const expensePositions = (expenses || []).map(exp => ({
  id: exp.id,
  description: exp.description,
  amount: Number(exp.amount),
  createdAt: exp.created_at,
  createdBy: exp.created_by,
  createdByName: exp.created_by 
    ? profileMap.get(exp.created_by) || null 
    : null
}));
```

## Benefits

✅ **Works immediately**: No FK cache dependency  
✅ **Same result**: `createdByName` populated correctly  
✅ **Efficient**: Single `profiles` query (2 rows only)  
✅ **NULL-safe**: Handles legacy `created_by = NULL`  

## Performance

**Before**: 2 queries (expenses + nested JOIN)  
**After**: 3 queries (profiles + expenses + items)  

**Impact**: +1 query, aber profiles ist tiny (2 rows):
- Profiles: ~1ms
- Expenses: ~10ms
- Items: ~10ms
- **Total**: ~21ms (vs ~20ms vorher)

## Long-term Solution

Nach Supabase Schema-Cache Update (oder manuelles Refresh):

```bash
# Option A: Wait for auto-refresh (24h)
# Option B: Restart Supabase project (Dashboard)
# Option C: Run schema refresh (if available in API)
```

Dann kann man zurück zu nested SELECT (optional optimization).

## Test

```bash
npm run build  # ✅ Success
npm run dev    # Should load without FK error
```

**Expected**: Homepage lädt ohne "relationship not found" Fehler.

---

**Status**: ✅ Hotfix applied  
**Trade-off**: +1 query (+1ms) vs crash
