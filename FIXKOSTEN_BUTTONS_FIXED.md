# FIXKOSTEN BUTTONS - GELÖST ✅

## 🐛 Das Problem (vom User gemeldet)

> "wenn ich unter fixkosten eine neue kategorie anlege dann oeffnet sich zwar ein eingabefeld, kann dort auch etwas eintragen und speichern, allerdings kann ich z.b wenn ich keine eingabe mache nicht abbrechen der button scheint dann nicht zu funktionieren. ebenfalls scheint der button + position hinzufuengen nicht zu funktionieren."

### Chrome Console Error:
```
Uncaught Svelte error: state_unsafe_mutation

Updating state inside `$derived(...)`, `$inspect(...)` or a template expression is forbidden.
at +page.svelte:292:71
```

## 🔍 Root Cause

**Zeile 292:** State-Mutation innerhalb eines `{@const}` Template-Ausdrucks:

```svelte
❌ VORHER (State Mutation im Template):
{@const itemState = newItems[category.id] || (newItems[category.id] = { ... })}
                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                             MUTATION IM TEMPLATE - VERBOTEN!
```

## ✅ Die Lösung

### 1. Helper-Funktion statt Inline-Mutation
```typescript
// Read-only Helper - KEINE Mutation
function getItemState(categoryId: string) {
	if (!newItems[categoryId]) {
		return { label: '', amount: '', splitMode: 'income' };
	}
	return newItems[categoryId];
}
```

### 2. Template-Block ohne Mutation
```svelte
✅ NACHHER (nur Lesen):
{@const itemState = getItemState(category.id)}
```

### 3. Input Handling mit `oninput` statt `bind:value`
```svelte
❌ VORHER (bind führt zu Mutation im abgeleiteten State):
<input bind:value={itemState.label} />

✅ NACHHER (explizites Update):
<input 
	value={itemState.label}
	oninput={(e) => {
		const target = e.target as HTMLInputElement;
		newItems = { ...newItems, [category.id]: { ...itemState, label: target.value } };
	}}
/>
```

### 4. Set-based State für Form-Visibility
```typescript
❌ VORHER (Record - schwierig reaktiv):
let showNewItemForm = $state<Record<string, boolean>>({});
showNewItemForm = { ...showNewItemForm, [category.id]: true };

✅ NACHHER (Set - natürlich reaktiv):
let openItemForms = $state<Set<string>>(new Set());
openItemForms = new Set([...openItemForms, category.id]);
```

## 📋 Alle Fixes

### Fix 1: State Helper-Funktion
**Datei:** `src/routes/fixkosten/+page.svelte` (Zeile 26-31)

```typescript
function getItemState(categoryId: string) {
	if (!newItems[categoryId]) {
		return { label: '', amount: '', splitMode: 'income' };
	}
	return newItems[categoryId];
}
```

### Fix 2: Template ohne Mutation
**Datei:** `src/routes/fixkosten/+page.svelte` (Zeile ~300)

```svelte
{:else}
	{@const itemState = getItemState(category.id)}  <!-- Nur lesen! -->
	<form...>
```

### Fix 3: Explicit Input Handlers
**Alle 3 Input-Felder:**
- Label (text)
- Amount (number)  
- SplitMode (select)

Alle nutzen jetzt `value={...}` + `oninput={(e) => ...}` statt `bind:value={...}`.

### Fix 4: Set für Form-Visibility
**Open/Close Logic:**

```typescript
// Öffnen
openItemForms = new Set([...openItemForms, category.id]);

// Schließen
const newSet = new Set(openItemForms);
newSet.delete(category.id);
openItemForms = newSet;
```

## 🧪 Getestet im Browser

### ✅ Funktionierende Flows:

1. **"Neue Kategorie" öffnen** ✅
2. **"Abbrechen" (Kategorie)** ✅  
3. **"Position hinzufügen" öffnen** ✅
4. **"Abbrechen" (Position)** ✅
5. **Formular-Inputs funktionieren** ✅

### Screenshots:
- Form öffnet sich ✅
- Input-Felder editierbar ✅
- Abbrechen schließt Form ✅
- Zurück zum Button-State ✅

## 📚 Gelerntes über Svelte 5 Runes

### ⚠️ Verboten:
1. **State-Mutation in Template-Expressions**
   ```svelte
   {@const x = state.y || (state.y = default)} ❌
   ```

2. **State-Mutation in `$derived()`**
   ```typescript
   let x = $derived(state.y || (state.y = default)) ❌
   ```

3. **bind:value auf abgeleitete/berechnete Werte**
   ```svelte
   {@const x = getState()}
   <input bind:value={x.field} /> ❌
   ```

### ✅ Erlaubt:
1. **Read-only Helper-Funktionen**
   ```typescript
   function getState() { return state.x || defaultValue; } ✅
   ```

2. **Explicit Event Handlers**
   ```svelte
   <input value={x} oninput={(e) => update(e.target.value)} /> ✅
   ```

3. **Immutable Updates (Spread)**
   ```typescript
   state = { ...state, [key]: newValue }; ✅
   ```

---

**Status:** FIXED ✅  
**Alle Buttons funktionieren** 🎉  
**Build:** Erfolgreich  
**Svelte 5 Runes:** Verstanden & korrekt verwendet

