# Test Plan: Persistente Fixkosten

## Automatischer Test-Ablauf

### Voraussetzungen
- App läuft lokal
- Datenbank ist erreichbar
- Dev Tools sind verfügbar

### Test 1: Erster Monat (Template-Fallback)
```
GEGEBEN: Keine Monate existieren
WENN: App öffnet
DANN: 
  - Neuer Monat wird erstellt ✓
  - copyTemplatesToMonth() wird aufgerufen ✓
  - Templates werden kopiert (falls vorhanden) ✓
```

### Test 2: Zweiter Monat (Aus Vormonat kopieren)
```
GEGEBEN: Januar existiert mit Fixkosten:
  - Kategorie "Wohnung"
    - Item "Miete": 1200,00 €
    - Item "Strom": 80,00 €

WENN: Januar abgeschlossen wird
DANN:
  - Februar wird erstellt ✓
  - copyFixedCostsFromLastMonth(januarId, februarId) wird aufgerufen ✓
  - Februar hat "Wohnung" Kategorie ✓
  - Februar hat "Miete": 1200,00 € ✓
  - Februar hat "Strom": 80,00 € ✓
```

### Test 3: Beträge bleiben persistent über mehrere Monate
```
GEGEBEN: 
  - Januar: Miete 1200 €
  - Januar abgeschlossen
  - Februar: Miete wurde auf 1250 € geändert
  
WENN: Februar abgeschlossen wird
DANN:
  - März wird erstellt ✓
  - März hat Miete: 1250 € (geänderten Betrag) ✓
```

### Test 4: Private Ausgaben werden NICHT kopiert
```
GEGEBEN: Januar hat:
  - Fixkosten: Miete 1200 €
  - Private Ausgabe: Einkaufen 50 €

WENN: Januar abgeschlossen wird
DANN:
  - Februar hat Fixkosten: Miete 1200 € ✓
  - Februar hat KEINE private Ausgaben ✓
```

### Test 5: Neue Kategorien im Monat werden mitkopiert
```
GEGEBEN: 
  - Januar: Kategorie "Wohnung"
  - Januar abgeschlossen
  - Februar: Neue Kategorie "Auto" hinzugefügt
  
WENN: Februar abgeschlossen wird
DANN:
  - März hat "Wohnung" ✓
  - März hat "Auto" ✓
```

### Test 6: Gelöschte Items bleiben gelöscht
```
GEGEBEN:
  - Januar: Miete 1200 €, Strom 80 €
  - Januar abgeschlossen
  - Februar: Strom gelöscht
  
WENN: Februar abgeschlossen wird
DANN:
  - März hat Miete 1200 € ✓
  - März hat KEINEN Strom ✓
```

## Manuelle Verifikation

### Schritt 1: Datenbank prüfen
```sql
-- Nach Monatswechsel:
SELECT 
  m.year, m.month, m.status,
  fc.label as category,
  fi.label as item,
  fi.amount
FROM months m
LEFT JOIN fixed_categories fc ON fc.month_id = m.id
LEFT JOIN fixed_items fi ON fi.category_id = fc.id
ORDER BY m.year DESC, m.month DESC, fc.label, fi.label;
```

Erwartung:
- Beide Monate (alt + neu) haben identische Kategorien/Items
- Beträge sind identisch

### Schritt 2: Console Logs prüfen
```
Server-Logs sollten zeigen:

✅ New month created: <id> (2026-2)
📋 Copying fixed costs from previous month...
✅ Found 2 categories in previous month
✅ Found 3 items in previous month
✅ Copied 2 items for category "Wohnung"
✅ Copied 1 items for category "Auto"
✅ Successfully copied all fixed costs from previous month!
```

### Schritt 3: UI prüfen
1. Öffne /fixkosten im neuen Monat
2. Überprüfe:
   - Alle Kategorien vom Vormonat sind da ✓
   - Alle Items mit korrekten Beträgen sind da ✓
   - Keine private Ausgaben (die gehören zu /ausgaben) ✓

## Edge Cases

### Edge 1: Vormonat ohne Kategorien
```
GEGEBEN: Januar hat keine Fixkosten
WENN: Januar abgeschlossen wird
DANN: 
  - Februar wird erstellt ✓
  - copyFixedCostsFromLastMonth() findet nichts ✓
  - Warnung: "No categories found in previous month" ✓
  - Februar hat keine Fixkosten ✓
```

### Edge 2: DB-Fehler beim Kopieren
```
GEGEBEN: DB ist nicht erreichbar
WENN: Monat abgeschlossen wird
DANN:
  - Neuer Monat wird trotzdem erstellt ✓
  - Fehler wird geloggt ✓
  - App stürzt NICHT ab ✓
  - User kann manuell Fixkosten eingeben ✓
```

## Regression Tests

### Regression 1: Private Ausgaben unberührt
```
SICHERSTELLEN: Private Ausgaben Funktionalität ist unverändert
- Können erstellt werden ✓
- Werden in richtiger Tabelle gespeichert ✓
- Werden NICHT kopiert ✓
```

### Regression 2: Templates funktionieren noch
```
SICHERSTELLEN: Template-System als Fallback
- Erster Monat nutzt Templates ✓
- Templates können gelesen werden ✓
- Templates können geschrieben werden ✓
```

### Regression 3: Monatsabschluss unverändert
```
SICHERSTELLEN: Monatsabschluss-Logik funktioniert
- private_balance_end → private_balance_start ✓
- Status wird auf 'closed' gesetzt ✓
- closed_at wird gesetzt ✓
```

## Performance Tests

### Performance 1: Viele Kategorien
```
GEGEBEN: 20 Kategorien mit je 10 Items = 200 Items
WENN: Monat abgeschlossen wird
DANN: Kopieren dauert < 5 Sekunden ✓
```

### Performance 2: Große Beträge
```
GEGEBEN: Beträge bis 999999,99 €
WENN: Kopiert wird
DANN: Keine Precision-Probleme ✓
```

## Rollback Plan

Falls Probleme auftreten:
```bash
# 1. Code zurücksetzen
git revert <commit-hash>

# 2. App neu starten
npm run dev

# 3. System nutzt wieder Templates
# (Keine DB-Änderungen nötig)
```

## Success Criteria

✅ Alle Tests bestanden  
✅ Keine Linter-Fehler  
✅ TypeScript-Check erfolgreich  
✅ Console-Logs korrekt  
✅ UI zeigt korrekte Daten  
✅ Performance akzeptabel  
✅ Keine Regression

**Status:** READY FOR DEPLOYMENT
