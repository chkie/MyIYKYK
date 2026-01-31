# Month Management System - Complete Guide

## Implementation Complete

Das Monats-Management wurde professionell überarbeitet und bietet jetzt:

### 1. Entwicklung: Vollständiger Reset

```text
Profil → Dev Tools → VOLLSTÄNDIGER RESET
```

- Löscht ALLE Monate (offen + geschlossen)
- Löscht ALLE Daten (Fixkosten, Ausgaben, Einkommen)
- App startet danach mit aktuellem Kalendermonat neu
- **Löst das Problem:** Monat bleibt nicht mehr hängen!

### 2. Entwicklung: Aktuellen Monat leeren

```text
Profil → Dev Tools → Nur aktuellen Monat leeren
```

- Löscht nur Daten des aktuellen Monats
- Monat bleibt bestehen, startet bei 0
- Gut für schnelles Testen innerhalb eines Monats

### 3. Production: Automatischer Monat-Flow

```text
App Start → getOrCreateCurrentMonth()
```

- **Wenn kein Monat existiert:** Erstellt aktuellen Kalendermonat
- **Wenn offener Monat existiert:** Nutzt diesen weiter
- **Monat schließen:** Automatisch wird der nächste Monat erstellt

---

## Release-Vorbereitung

### Szenario: "Ich will mit Januar 2026 starten"

#### Option A: DB manuell vorbereiten (Empfohlen für Release)

```sql
-- 1. Delete all existing months (via Supabase SQL Editor)
DELETE FROM month_incomes;
DELETE FROM private_expenses;
DELETE FROM fixed_items WHERE category_id IN (SELECT id FROM fixed_categories);
DELETE FROM fixed_categories;
DELETE FROM months;

-- 2. Create January 2026 manually
INSERT INTO months (year, month, status, private_balance_start, total_transfer_this_month)
VALUES (2026, 1, 'open', 0, 0);
```

#### Option B: Via Dev Tools (während Development)

```text
1. Profil → Dev Tools → VOLLSTÄNDIGER RESET
2. Server neu starten
3. App öffnet mit aktuellem Kalendermonat (z.B. Januar 2026)
```

---

## Testing Checklist

### Test 1: Vollständiger Reset

1. In der App: Profil → Dev Tools
2. Klick auf "💥 ALLES LÖSCHEN (Full Reset)"
3. Bestätige Dialog
4. App lädt neu
5. **Erwartung:** Aktueller Kalendermonat wird erstellt (z.B. Januar 2026)
6. Keine alten Monate im Archiv

### Test 2: Aktuellen Monat leeren

1. Erstelle Testdaten (Fixkosten, Ausgaben)
2. Profil → Dev Tools → "🗑️ Nur aktuellen Monat leeren"
3. **Erwartung:** Daten weg, Monat bleibt bestehen

### Test 3: Monat schließen & Nächster

1. Aktuellen Monat nutzen
2. Profil → "Jetzt abschließen"
3. App neu laden
4. **Erwartung:** Nächster Monat (z.B. Februar 2026) wird automatisch erstellt

### Test 4: Release-Szenario

1. Full Reset durchführen
2. Server neu starten
3. **Erwartung:** App startet mit aktuellem Kalendermonat
4. Für Production: Stattdessen DB manuell mit Januar vorbereiten

---

## Production Deployment

### Vor dem ersten Release

1. **DB manuell vorbereiten:**

   ```sql
   -- Alle Test-Monate löschen
   DELETE FROM month_incomes;
   DELETE FROM private_expenses;
   DELETE FROM fixed_items WHERE category_id IN (SELECT id FROM fixed_categories);
   DELETE FROM fixed_categories;
   DELETE FROM months;
   
   -- Januar 2026 erstellen
   INSERT INTO months (year, month, status, private_balance_start, total_transfer_this_month)
   VALUES (2026, 1, 'open', 0, 0);
   ```

2. **Dev Tools deaktivieren (Optional):**

   - Die Dev Tools Card erscheint nur in Development (`import.meta.env.DEV`)
   - In Production automatisch ausgeblendet
   - Zusätzlicher Guard in Actions: `NODE_ENV === 'production'` → 403

3. **App testen:**

   - Login
   - Profil wählen (Steffi/Christian)
   - Übersicht zeigt: Januar 2026
   - Fixkosten-Templates wurden kopiert
   - Einkommen setzen
   - Ausgaben hinzufügen

---

## Was wurde geändert

### Files Modified

1. `src/lib/server/months.ts`
   - `deleteAllMonths()` hinzugefügt
   - `deleteOpenMonth()` hinzugefügt
   - `createSpecificMonth()` hinzugefügt

2. `src/routes/+page.server.ts`
   - `fullResetDev` Action hinzugefügt
   - Import für `deleteAllMonths`

3. `src/routes/profil/+page.svelte`
   - Neues UI für "VOLLSTÄNDIGER RESET"
   - Trennung zwischen Full Reset und Month Reset
   - Bessere Warnings und Erklärungen

### No Breaking Changes

- Alte `resetMonthDev` Action funktioniert noch
- Business Logic unverändert
- Auth/Routes unverändert
- Production Guards vorhanden
