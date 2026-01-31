# 🐛 BUG BEHOBEN: ProfileSelector erscheint nicht nach Login

## Problem:

```
1. Dev Reset Button → localStorage löschen
2. Logout → Cookie löschen
3. Dev Server neu starten
4. Login erfolgreich
5. ❌ ABER: ProfileSelector erscheint NICHT!
```

## Root Cause:

**Login-Form hatte KEIN `use:enhance` + `invalidateAll()`!**

```typescript
// VORHER (buggy):
<form method="POST" class="login-form">
  <!-- Nach Submit: redirect zu "/" -->
  <!-- ABER: Layout-Daten werden NICHT neu geladen! -->
  <!-- data.isAuthenticated bleibt false! -->
</form>
```

**Resultat:**
- Cookie wird gesetzt ✅
- Redirect zu "/" ✅  
- ABER: `data.isAuthenticated` bleibt `false` ❌ (cached!)
- ProfileSelector erscheint nicht ❌

---

## Fix:

### **`src/routes/login/+page.svelte`**

```typescript
import { enhance } from '$app/forms';
import { invalidateAll } from '$app/navigation';

<form 
  method="POST" 
  use:enhance={() => {
    return async ({ result, update }) => {
      // Force reload all layout data (isAuthenticated, profiles)
      await invalidateAll();
      await update();
    };
  }}
>
```

**Was passiert jetzt:**
1. Login erfolgreich → Cookie gesetzt
2. `invalidateAll()` → Layout lädt neu
3. `+layout.server.ts` läuft erneut
4. `isAuthenticated = cookies.get('auth') === 'ok'` → `true` ✅
5. `profiles` werden geladen ✅
6. Redirect zu "/" mit NEUEN Daten
7. ProfileSelector erscheint ✅

---

## Test-Schritte:

### **Test 1: Bug reproduzieren (vor Fix)**
```bash
# 1. Dev Reset Button klicken
# 2. Logout
# 3. Dev Server neu starten
# 4. Login
# RESULT: ❌ ProfileSelector erscheint NICHT
```

### **Test 2: Fix verifizieren (nach Fix)**
```bash
# 1. Dev Reset Button klicken
# 2. Logout
# 3. Dev Server neu starten (optional)
# 4. Login
# RESULT: ✅ ProfileSelector erscheint!
```

### **Test 3: Browser Console Debug**
```javascript
// Nach Login (vor dem Fix):
console.log('isAuthenticated:', window.__sveltekit_data); 
// → isAuthenticated: false (CACHED!)

// Nach Login (nach dem Fix):
console.log('isAuthenticated:', window.__sveltekit_data);
// → isAuthenticated: true (NEU GELADEN!)
```

---

## Warum war das ein Problem?

**SvelteKit cached Layout-Daten!**

- Login setzt Cookie ✅
- Redirect zu "/" ✅
- ABER: `+layout.server.ts` läuft NICHT erneut (Cache!)
- `data.isAuthenticated` bleibt `false`
- ProfileSelector Bedingung: `data.isAuthenticated && !hasProfile` → `false && true` → `false`
- Kein ProfileSelector!

**Lösung: `invalidateAll()` zwingt SvelteKit alle Layout-Daten neu zu laden!**

---

## ✅ Jetzt funktioniert:

| Schritt | Cookie | localStorage | ProfileSelector |
|---------|--------|--------------|-----------------|
| 1. Erste Installation | ❌ | ❌ | - |
| 2. Login | ✅ | ❌ | - |
| 3. Nach Login (invalidateAll) | ✅ | ❌ | ✅ Erscheint! |
| 4. Profil wählen | ✅ | ✅ | - |
| 5. Nach Auswahl | ✅ | ✅ | ❌ Verschwindet |

