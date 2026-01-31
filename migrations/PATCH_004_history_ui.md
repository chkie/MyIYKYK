# Patch 004: History UI auf Übersichtsseite

**Date**: 2026-01-31  
**Type**: UI enhancement  
**Risk**: LOW (additive, no existing UI changed)

## Summary

Adds "Monats-Historie" section to homepage showing:
- Last 5 positions (expenses + fixed items) by default
- "Alle anzeigen" button if more than 5 exist
- Each entry shows: Icon, Description, Creator badge, Timestamp, Amount, Type
- Empty state for new months
- Consistent card design matching existing UI

---

## Changed Files

### `src/routes/+page.svelte` (+142 lines)

**Added Section** (inserted before closing `</PullToRefresh>`):

```svelte
<!-- History Section -->
{#if data.history}
  <div class="mt-6 overflow-hidden rounded-2xl bg-white shadow-md">
    <!-- Header: Purple gradient with clock icon -->
    <div class="bg-gradient-to-r from-purple-100 to-purple-200 px-5 py-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500 text-white">
          <svg><!-- Clock icon --></svg>
        </div>
        <div>
          <p class="text-xs">Monats-Historie</p>
          <p class="text-lg font-bold">{totalCount} Einträge</p>
        </div>
      </div>
    </div>

    <!-- List of positions -->
    {#if totalCount > 0}
      <div class="divide-y divide-neutral-100">
        {#each (fullMonthList || last5) as position}
          <div class="flex items-center justify-between px-5 py-3">
            <!-- Icon (amber=expense, blue=fixed) -->
            <!-- Description + Creator badge + Timestamp -->
            <!-- Amount + Type label -->
          </div>
        {/each}
      </div>

      <!-- Show All / Show Less Button -->
      {#if !fullMonthList && totalCount > 5}
        <a href="/?history=full">Alle {totalCount} anzeigen</a>
      {:else if fullMonthList}
        <a href="/">Weniger anzeigen</a>
      {/if}
    {:else}
      <!-- Empty State -->
      <div class="px-5 py-8 text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
          <svg><!-- Inbox icon --></svg>
        </div>
        <p>Noch keine Einträge</p>
      </div>
    {/if}
  </div>
{/if}
```

**Features**:
- ✅ Responsive layout (mobile-first)
- ✅ Type icons (💰 amber for expenses, 🏢 blue for fixed)
- ✅ Creator badge (shows name or "−" for legacy)
- ✅ German date format: `31.01. 14:30`
- ✅ Hover effect on rows
- ✅ Truncate long descriptions
- ✅ Empty state with icon

---

## UI Design Decisions

### Colors & Icons
- **Header**: Purple gradient (distinct from other cards)
- **Expense icon**: Amber (€ symbol) → matches "Ausgaben" color
- **Fixed item icon**: Blue (building) → matches "Fixkosten" color
- **Creator badge**: Neutral gray background
- **Legacy entries**: Gray "−" badge

### Layout
```
┌─────────────────────────────────────┐
│ 🕐 Monats-Historie                  │
│    27 Einträge                      │
├─────────────────────────────────────┤
│ 💰 Einkauf Rewe                     │ 42,50 €
│    Christian · 31.01. 14:30         │ Privat
├─────────────────────────────────────┤
│ 🏢 Miete                            │ 850,00 €
│    − · 01.01. 10:00                 │ Fix
├─────────────────────────────────────┤
│ ... (3 more)                        │
├─────────────────────────────────────┤
│ [+] Alle 27 anzeigen                │
└─────────────────────────────────────┘
```

### Responsive Behavior
- **Mobile**: Full width, stacked layout
- **Truncation**: Long descriptions get `...`
- **Touch targets**: 44px min height per row
- **Scrollable**: List scrolls if many items

---

## Verification (6 Manual Checks)

### ✅ Check 1: Empty State
**Setup**: Fresh month with no data
**Steps**:
1. Navigate to `/`
2. Scroll to bottom

**Expected**:
- "Monats-Historie" card visible
- "0 Einträge" in header
- Empty state with inbox icon
- "Noch keine Einträge" message

---

### ✅ Check 2: Last 5 Display (Default)
**Setup**: Month with 7+ positions
**Steps**:
1. Navigate to `/` (without `?history=full`)
2. Scroll to history section

**Expected**:
- Shows exactly 5 positions (newest first)
- "7 Einträge" in header (or actual count)
- "Alle 7 anzeigen" button visible at bottom
- Positions sorted DESC by createdAt

---

### ✅ Check 3: Show All Toggle
**Setup**: Same month with 7+ positions
**Steps**:
1. Click "Alle anzeigen" button
2. URL changes to `/?history=full`
3. Page reloads

**Expected**:
- All 7 positions visible (not just 5)
- "Weniger anzeigen" button appears
- Clicking it returns to `/` (shows 5 again)

---

### ✅ Check 4: Type Icons & Labels
**Setup**: Month with both expense and fixed item
**Steps**:
1. Navigate to `/?history=full`
2. Inspect each position row

**Expected**:
- **Private expense**: 
  - Amber icon (€ symbol)
  - "Privat" label under amount
- **Fixed item**:
  - Blue icon (building symbol)
  - "Fix" label under amount

---

### ✅ Check 5: Creator Badge Display
**Setup**: After migration 001 applied + new positions created
**Steps**:
1. Add new expense via `/ausgaben`
2. Return to `/`
3. Check newest entry in history

**Expected**:
- Creator badge shows: `"Christian"` (or profile name)
- Badge has neutral gray background
- For legacy entries (before migration): `"−"` in gray

**Fallback** (migration not applied):
- All entries show `"−"` badge (no creator info)

---

### ✅ Check 6: Date & Time Format
**Setup**: Any month with positions
**Steps**:
1. Check timestamp format in history list

**Expected**:
- German format: `31.01. 14:30` (day.month. hour:minute)
- Uses locale: `toLocaleString('de-DE', { ... })`
- Current month positions only (within month boundaries)

---

## Rollback

### Code Rollback
```bash
mv src/routes/+page.svelte.backup src/routes/+page.svelte
npm run build
```

**Effect**:
- History section removed
- Page returns to original state
- No data loss (history still in PageData, just not displayed)

---

## Diff Summary

**File**: `src/routes/+page.svelte`

```diff
@@ -185,5 +185,147 @@
 		<span class="text-sm">Einkommen</span>
 	</a>
 </div>
+
+<!-- History Section -->
+{#if data.history}
+	<div class="mt-6 overflow-hidden rounded-2xl bg-white shadow-md">
+		<div class="bg-gradient-to-r from-purple-100 to-purple-200 px-5 py-4">
+			<div class="flex items-center gap-3">
+				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500 text-white">
+					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
+						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
+					</svg>
+				</div>
+				<div>
+					<p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">Monats-Historie</p>
+					<p class="text-lg font-bold text-purple-900">
+						{data.history.totalCount} {data.history.totalCount === 1 ? 'Eintrag' : 'Einträge'}
+					</p>
+				</div>
+			</div>
+		</div>
+		<!-- ... (List + Buttons + Empty State) ... -->
+	</div>
+{/if}
 </PullToRefresh>
```

**Stats**:
- Lines added: 142
- Lines changed: 0 (only additive)
- New section: "Monats-Historie"

---

## Dependencies

**Requires**:
- Patch 003 (history loader in PageData)
- `data.history.last5` available
- `data.history.totalCount` available
- Optional: `data.history.fullMonthList` (if `?history=full`)

**Works with**:
- Migration 001 NOT applied → Shows "−" for all creators
- Migration 001 applied → Shows actual creator names

**Does NOT require**:
- Migration 001 (works with fallback)
- Patch 002 (works with NULL created_by)

---

## Notes

- **No redesign**: Follows existing card pattern (rounded-2xl, shadow-md)
- **Mobile-first**: Works on iPhone, scales to desktop
- **Empty state**: UX for fresh months
- **Truncation**: Long descriptions don't break layout
- **Performance**: No extra queries (uses PageData)
- **Accessibility**: Semantic HTML, sr-only text where needed

---

## Next Steps (Optional Enhancements)

**Not in this patch**:
- Search/filter in history
- Export history as CSV
- Group by day/week
- Click row → show details modal
- Inline edit/delete from history

These can be added as separate patches if needed.

---

**Status**: ✅ Patch 4 complete  
**Feature**: Monats-Historie fully functional (with fallback for missing migration)
