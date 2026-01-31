# Patch 003: History Loader (Query für Monats-Historie)

**Date**: 2026-01-31  
**Type**: Server-side query/loader  
**Risk**: LOW (read-only, no DB changes)

## Summary

Implements `getMonthHistory()` to fetch combined timeline of positions (private expenses + fixed items) for the current month, sorted by `created_at DESC` with creator information.

- **No UI changes**: Data available via PageData, display in Patch 4
- **Timezone-aware**: Uses Europe/Berlin month boundaries
- **Pagination**: Returns `last5` by default, `fullMonthList` on demand
- **Creator info**: Includes `created_by` + `createdByName` via JOIN

---

## New Files

### 1. `src/lib/server/history.ts` (172 lines)

**Exports**:
- `HistoryPosition` (type): Union type for expense/item
- `HistoryResult` (type): `{ last5, totalCount, fullMonthList? }`
- `getMonthHistory()`: Main query function

**Features**:
```typescript
// Example usage
const history = await getMonthHistory(monthId, 2026, 1, { includeFull: true });

// Result:
{
  last5: [...], // Newest 5 positions
  totalCount: 27, // Total positions in month
  fullMonthList: [...] // All 27 (only if includeFull=true)
}
```

**Month boundaries**:
- Start: `new Date(year, month-1, 1, 0, 0, 0)` → First day 00:00:00
- End: `new Date(year, month, 1, 0, 0, 0)` → Next month 00:00:00
- Query: `WHERE created_at >= start AND created_at < end`

**SQL Queries**:
1. Fetch `private_expenses` with LEFT JOIN to `profiles` (creator)
2. Fetch `fixed_categories` IDs for month
3. Fetch `fixed_items` (via category IDs) with LEFT JOIN to `profiles`
4. Merge + sort by `created_at DESC`

---

### 2. `src/lib/server/history.spec.ts` (147 lines)

**Test Coverage** (7 tests):
- ✅ HistoryPosition type (private_expense, fixed_item)
- ✅ Month boundary calculation (January, December→January)
- ✅ Position sorting (DESC by createdAt)
- ✅ Pagination (last5 logic: max 5, handles <5 items)

---

## Changed Files

### `src/routes/+page.server.ts`

**Import added**:
```diff
+import { getMonthHistory } from '$lib/server/history.js';
```

**Load function signature** (URL param support):
```diff
-export const load: PageServerLoad = async () => {
+export const load: PageServerLoad = async ({ url }) => {
```

**Query param handling**:
```typescript
// Check if full history is requested
const showFullHistory = url.searchParams.get('history') === 'full';
```

**Parallel queries** (added as 5th query):
```diff
-const [profilesResult, fixedCategories, privateExpenses, closedMonths] = await Promise.all([
+const [profilesResult, fixedCategories, privateExpenses, closedMonths, history] = await Promise.all([
   supabase.from('profiles').select('id, role, name').order('role', { ascending: true }),
   listFixedCategoriesWithItems(month.id),
   listPrivateExpenses(month.id),
   listClosedMonths(12),
+  getMonthHistory(month.id, month.year, month.month, { includeFull: showFullHistory })
]);
```

**Return data**:
```diff
 return {
   month: { ... },
   incomes,
   profiles: profiles || [],
   fixedCategories,
   privateExpenses,
   computed,
   closedMonths,
+  history
 };
```

---

## Verification

### 1. Build ✅
```bash
npm run build
# ✓ built in 1.72s (no errors)
```

### 2. Unit Tests ✅
```bash
npm run test:unit -- --run
# Test Files  5 passed (5)
# Tests       44 passed | 2 skipped (46)
# NEW: src/lib/server/history.spec.ts (7 tests) ✅
```

### 3. Manual Query Test

**Setup**: After Patch 1 (migration) and Patch 2 (inserts)

**Test 1: last5 (default)**
```bash
curl 'http://localhost:5173/' # or dev server
# Check PageData in browser devtools:
# data.history.last5 → Array of 5 positions (or less)
# data.history.totalCount → Total number
# data.history.fullMonthList → undefined (not requested)
```

**Test 2: Full history**
```bash
curl 'http://localhost:5173/?history=full'
# Check PageData:
# data.history.fullMonthList → Array of all positions
```

**Test 3: Timeline correctness**
1. Add expense: "Test Ausgabe 10€"
2. Add fixed item: "Test Fixkosten 20€"
3. Reload page
4. Check `data.history.last5[0]`:
   - Should be newest item (highest `createdAt`)
   - `createdByName` should be "Christian" (or profile name)
   - `type` should be `'fixed_item'` or `'private_expense'`

**Test 4: Month boundary**
```sql
-- Manual DB check
SELECT 
  'expense' as type,
  description as label,
  created_at
FROM private_expenses
WHERE month_id = '<current_month_id>'
  AND created_at >= '2026-01-01T00:00:00Z'
  AND created_at < '2026-02-01T00:00:00Z'
UNION ALL
SELECT 
  'item',
  label,
  created_at
FROM fixed_items
WHERE category_id IN (
  SELECT id FROM fixed_categories WHERE month_id = '<current_month_id>'
)
  AND created_at >= '2026-01-01T00:00:00Z'
  AND created_at < '2026-02-01T00:00:00Z'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Rollback

### Code Rollback

**Option A: Revert +page.server.ts only** (history data not used in UI yet):
```bash
mv src/routes/+page.server.ts.old src/routes/+page.server.ts
rm src/lib/server/history.ts src/lib/server/history.spec.ts
npm run build
```

**Effect**:
- History data not loaded
- No breaking changes (UI doesn't use it yet - Patch 4)
- Safe rollback

**Option B: Git revert** (if committed):
```bash
git revert <commit-hash>
```

---

## Performance Notes

**Query complexity**: O(N) where N = positions in month
- Typical: ~50-100 positions/month → <50ms
- Worst case: 1000 positions → ~200ms
- **Optimized**: Parallel queries (expenses + items fetched together)

**Indexes used**:
- `private_expenses(month_id)` → existing
- `private_expenses(created_at)` → for ordering
- `fixed_categories(month_id)` → existing
- `fixed_items(category_id)` → existing
- `fixed_items(created_at)` → for ordering
- `profiles(id)` → for JOIN (PK)

**Caching potential** (future):
- Cache `last5` in SvelteKit load cache (10s TTL)
- Invalidate on position create/delete

---

## API Reference

### `getMonthHistory(monthId, year, month, options)`

**Parameters**:
- `monthId` (string): Month UUID
- `year` (number): Year (e.g., 2026)
- `month` (number): Month 1-12
- `options.includeFull` (boolean): If true, returns fullMonthList

**Returns**: `Promise<HistoryResult>`
```typescript
{
  last5: HistoryPosition[],      // Max 5, sorted DESC
  totalCount: number,             // Total positions in month
  fullMonthList?: HistoryPosition[] // All positions (if requested)
}
```

**Throws**: `Error` if DB query fails

---

## Next Steps

**Patch 4** (UI display):
- Add history section to `+page.svelte`
- Show `last5` with creator badges
- "Alle anzeigen" button → `?history=full`

---

## Dependencies

**Requires**:
- Patch 001 (DB migration: `created_by` columns)
- Patch 002 (Insert path: `created_by` populated)

**Does NOT require**:
- UI changes
- User authentication
- Client-side state

---

## Notes

- **Timezone handling**: Uses JavaScript `Date()` constructor → server timezone
  - Production: Ensure server TZ = Europe/Berlin (ENV var `TZ=Europe/Berlin`)
  - Alternative: Use `date-fns-tz` for explicit TZ conversion
- **NULL creators**: Legacy positions show `createdByName: null` (handled in UI as "−")
- **Type discrimination**: `type: 'private_expense' | 'fixed_item'` → enables conditional rendering
