# Patch 002: Add created_by to Insert Operations

**Date**: 2026-01-31  
**Type**: Code change (server-side only)  
**Risk**: LOW (backward compatible, no UI changes)

## Summary

Extends `createPrivateExpense()` and `createFixedItem()` to populate `created_by` column when inserting new positions.

- **No UI changes**: Forms unchanged
- **No logic changes**: Split calculation unchanged
- **Backward compatible**: `createdBy` is optional, defaults to 'me' profile
- **No breaking changes**: Existing code continues to work

---

## Changed Files

### 1. `src/lib/server/supabase.ts`

**Added**: Helper function `getProfileIdByRole()`

```diff
+/**
+ * Gets the profile ID for a given role.
+ * Used as fallback when created_by is not provided.
+ * 
+ * @param role - Profile role ('me' or 'partner')
+ * @returns Profile ID (UUID)
+ * @throws {Error} If profile not found
+ */
+export async function getProfileIdByRole(role: 'me' | 'partner'): Promise<string> {
+	const supabase = getSupabaseServerClient();
+
+	const { data: profile, error } = await supabase
+		.from('profiles')
+		.select('id')
+		.eq('role', role)
+		.single();
+
+	if (error || !profile) {
+		throw new Error(`Failed to find profile with role '${role}': ${error?.message || 'not found'}`);
+	}
+
+	return profile.id;
+}
```

---

### 2. `src/lib/server/private-expenses.ts`

**Import change**:
```diff
-import { getSupabaseServerClient } from './supabase.js';
+import { getSupabaseServerClient, getProfileIdByRole } from './supabase.js';
```

**Function signature change** (optional parameter):
```diff
 export async function createPrivateExpense(
 	monthId: string,
 	input: {
 		dateISO: string;
 		description: string;
 		amount: number;
+		createdBy?: string; // Optional: profile ID, defaults to 'me' if not provided
 	}
 )
```

**Insert logic change**:
```diff
+	// Determine created_by: use provided value or fallback to 'me' profile
+	const createdBy = input.createdBy || await getProfileIdByRole('me');
+
 	// Create expense
 	const { data: newExpense, error: createError } = await supabase
 		.from('private_expenses')
 		.insert({
 			month_id: monthId,
 			date: input.dateISO,
 			description: trimmedDescription,
-			amount: input.amount
+			amount: input.amount,
+			created_by: createdBy
 		})
```

---

### 3. `src/lib/server/fixed-costs.ts`

**Import change**:
```diff
-import { getSupabaseServerClient } from './supabase.js';
+import { getSupabaseServerClient, getProfileIdByRole } from './supabase.js';
```

**Function signature change** (optional parameter):
```diff
 export async function createFixedItem(
 	categoryId: string,
 	input: {
 		label: string;
 		amount: number;
 		splitMode: 'income' | 'me' | 'partner' | 'half';
+		createdBy?: string; // Optional: profile ID, defaults to 'me' if not provided
 	}
 )
```

**Insert logic change**:
```diff
+	// Determine created_by: use provided value or fallback to 'me' profile
+	const createdBy = input.createdBy || await getProfileIdByRole('me');
+
 	// Create item
 	const { data: newItem, error: createError } = await supabase
 		.from('fixed_items')
 		.insert({
 			category_id: categoryId,
 			label: trimmedLabel,
 			amount: input.amount,
-			split_mode: input.splitMode
+			split_mode: input.splitMode,
+			created_by: createdBy
 		})
```

---

## Verification

### 1. Build Test ✅
```bash
npm run build
# ✓ built in 1.77s (no errors)
```

### 2. Unit Tests ✅
```bash
npm run test:unit -- --run
# Test Files  4 passed (4)
# Tests       37 passed | 2 skipped (39)
```

### 3. Manual Flow Test (After DB Migration)

**Setup**: Apply migration 001 first (`migrations/001_add_created_by_to_positions.sql`)

**Test private expense creation**:
1. Navigate to `/ausgaben`
2. Add new expense (e.g., "Test Ausgabe 10€")
3. Check DB:
   ```sql
   SELECT id, description, amount, created_by 
   FROM private_expenses 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   **Expected**: `created_by` = UUID of 'me' profile (not NULL)

**Test fixed item creation**:
1. Navigate to `/fixkosten`
2. Add new item to any category
3. Check DB:
   ```sql
   SELECT id, label, amount, created_by 
   FROM fixed_items 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   **Expected**: `created_by` = UUID of 'me' profile (not NULL)

**Test backward compatibility** (if migration NOT applied):
- Inserts should FAIL with FK constraint error
- This is expected - migration 001 must be applied first

---

## Rollback

### Option A: Code Rollback Only

Restore backup files:
```bash
mv src/lib/server/supabase.ts.backup src/lib/server/supabase.ts
mv src/lib/server/private-expenses.ts.backup src/lib/server/private-expenses.ts
mv src/lib/server/fixed-costs.ts.backup src/lib/server/fixed-costs.ts
npm run build
```

**Effect**:
- New positions will have `created_by = NULL`
- No errors (column is nullable)
- Safe rollback

### Option B: Full Rollback (Code + DB)

1. Code rollback (see Option A)
2. DB rollback:
   ```bash
   # Apply migrations/001_rollback.sql via Supabase SQL Editor
   ```

**Effect**:
- Column removed completely
- All creator information lost

---

## Notes

- **created_at**: Already exists with `DEFAULT now()` in DB (no changes needed)
- **Default behavior**: All new positions default to 'me' profile if not specified
- **Future work**: UI to select creator (Patch 3)
- **No breaking changes**: Existing forms/routes work unchanged

---

## Dependencies

**Requires**:
- Migration 001 applied (`created_by` columns exist)

**Does NOT require**:
- UI changes
- Client-side changes
- New environment variables
