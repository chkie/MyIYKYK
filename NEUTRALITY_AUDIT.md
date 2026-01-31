# ✅ Neutralitäts-Audit: Semantische Gleichberechtigung

## ❌ Gefunden und gefixt:

### 1. **ProfileSelector.svelte** - ✅ BEHOBEN
```diff
- {profile.role === 'me' ? 'Hauptnutzer' : 'Partner'}
+ <!-- Removed - beide sind gleichberechtigt -->
```

**Jetzt:** Nur Name wird angezeigt, keine Hierarchie!

---

## ✅ Bereits neutral (kein Fix nötig):

### 2. **de.ts (Copy-Texte)**
- `splitModeMe: 'Christian'` ✅ Neutral (Name, nicht Rolle)
- `splitModePartner: 'Steffi'` ✅ Neutral (Name, nicht Rolle)  
- `youLabel: '(Christian)'` ✅ Neutral (Name in Klammern)

### 3. **Domain Types (types.ts)**
```typescript
export type PersonRole = 'me' | 'partner';
```
✅ **KORREKT**: Das sind technische Identifikatoren (für Code), KEINE UI-Texte!
- `'me'` = Gerät-Owner (wer die App installiert hat)
- `'partner'` = Zweite Person
- **NICHT** in UI angezeigt, nur intern!

### 4. **SplitMode in Fixkosten**
```typescript
type SplitMode = 'income' | 'me' | 'partner';
```
✅ **UI zeigt Namen**: "👤 Christian" / "👤 Steffi" (nicht "Hauptnutzer"/"Partner")

### 5. **Kommentare im Code**
- Code-Kommentare wie `// Partner pays` sind OK (technische Dokumentation)
- Wichtig: KEINE Hierarchie in User-facing Texten!

---

## 🔍 Review: Wo erscheint "me" vs "partner"?

| Stelle | Kontext | Neutral? |
|--------|---------|----------|
| **ProfileSelector** | ❌ "Hauptnutzer" / "Partner" | ✅ **BEHOBEN** |
| **de.ts** | "Christian" / "Steffi" (Namen) | ✅ Neutral |
| **Domain Types** | Technische IDs | ✅ OK (nicht sichtbar) |
| **Fixkosten Dropdown** | "👤 Christian" / "👤 Steffi" | ✅ Neutral |
| **Code-Kommentare** | Technische Docs | ✅ OK |

---

## ✅ Ergebnis:

**Alle User-facing Texte sind jetzt neutral!**

- Keine Hierarchie ("Hauptnutzer" weg)
- Nur Namen verwendet ("Christian", "Steffi")
- Technische Identifikatoren (`'me'`/`'partner'`) nur intern

