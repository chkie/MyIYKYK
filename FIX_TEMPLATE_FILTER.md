# FIX: Nur Template-basierte Fixkosten übernehmen

## Problem (behoben)

**Vorher:**
- ✅ Template-Kategorien wurden übernommen (gut)
- ❌ Manuell erstellte Kategorien wurden auch übernommen (schlecht!)

**Beispiel:**
```
Januar:
├─ Haushalt (Template) → Miete 530€  ✅
└─ Müll (Manuell) → Abfallgebühr 80€  ❌

Februar (vorher - FALSCH):
├─ Haushalt → Miete 530€  ✅
└─ Müll → Abfallgebühr 80€  ❌ NICHT GEWOLLT!
```

## Lösung

**Filter nach `is_from_template = true`:**

### Code-Änderung 1: Kategorien filtern
```typescript
// VORHER:
.eq('month_id', previousMonthId)
// → Alle Kategorien

// NACHHER:
.eq('month_id', previousMonthId)
.eq('is_from_template', true)  // ← NUR Template-basierte!
// → Nur vordefinierte Kategorien
```

### Code-Änderung 2: Items filtern
```typescript
// VORHER:
.in('category_id', previousCategoryIds)
// → Alle Items

// NACHHER:
.in('category_id', previousCategoryIds)
.eq('is_from_template', true)  // ← NUR Template-basierte!
// → Nur vordefinierte Items
```

## Erwartetes Verhalten (JETZT)

### Szenario 1: Template-basierte Fixkosten
```
Januar:
├─ Haushalt (is_from_template=true)
│  └─ Miete: 530€ (is_from_template=true)

[Monat schließen]

Februar:
├─ Haushalt ✅ (übernommen)
│  └─ Miete: 530€ ✅ (Betrag übernommen!)
```

### Szenario 2: Manuell erstellte Fixkosten
```
Januar:
├─ Müll (is_from_template=false/null)
│  └─ Abfallgebühr: 80€ (is_from_template=false/null)

[Monat schließen]

Februar:
[LEER] ✅ (NICHT übernommen - wie gewünscht!)
```

### Szenario 3: Gemischt
```
Januar:
├─ Haushalt (Template) → Miete 530€
├─ Auto (Template) → Versicherung 150€
└─ Müll (Manuell) → Abfallgebühr 80€

[Monat schließen]

Februar:
├─ Haushalt → Miete 530€ ✅
├─ Auto → Versicherung 150€ ✅
[Müll ist WEG] ✅
```

## Wie erkennt man Template vs. Manuell?

### In der Datenbank:
```sql
SELECT 
  label,
  is_from_template,
  CASE 
    WHEN is_from_template = true THEN 'Template (wird kopiert)'
    ELSE 'Manuell (wird NICHT kopiert)'
  END as typ
FROM fixed_categories
WHERE month_id = '<current_month_id>';
```

### Beim Erstellen:

**Aus Template (beim ersten Monat):**
```typescript
// copyTemplatesToMonth()
is_from_template: true  // ← Wird gesetzt
template_category_id: <template_id>
```

**Manuell erstellt (während des Monats):**
```typescript
// createFixedCategory() - User-Aktion
is_from_template: false/null  // ← Default
template_category_id: null
```

## Testing

### Test 1: Template-basierte werden kopiert
```
1. Januar: Template-Kategorie "Haushalt" mit "Miete 530€"
2. Monat schließen
3. Februar prüfen
✅ ERWARTUNG: Haushalt + Miete 530€ vorhanden
```

### Test 2: Manuell erstellte werden NICHT kopiert
```
1. Januar: Manuell "Müll" erstellen mit "Abfallgebühr 80€"
2. Monat schließen
3. Februar prüfen
✅ ERWARTUNG: "Müll" ist NICHT vorhanden
```

### Test 3: Beträge werden bei Templates übernommen
```
1. Januar: Template "Miete" hat 0€
2. Januar: Ändere auf 530€
3. Monat schließen
4. Februar prüfen
✅ ERWARTUNG: Miete hat 530€ (nicht 0€!)
```

### Test 4: Private Ausgaben bleiben unberührt
```
1. Januar: Private Ausgabe "Einkaufen 50€"
2. Monat schließen
3. Februar prüfen
✅ ERWARTUNG: Keine private Ausgaben
```

### Test 5: Monatsabschluss wird übernommen
```
1. Januar: Endsaldo -150€
2. Monat schließen
3. Februar prüfen
✅ ERWARTUNG: Startsaldo -150€
```

## Code-Änderungen

### Modified:
- `src/lib/server/fixed-cost-templates.ts`
  - Zeile 264: `.eq('is_from_template', true)` bei Kategorien
  - Zeile 287: `.eq('is_from_template', true)` bei Items
  - Kommentare aktualisiert

### Documentation:
- `PERSISTENT_FIXED_COSTS.md` - Tabelle erweitert
- `FIX_TEMPLATE_FILTER.md` - Diese Datei

## Deployment

✅ Keine DB-Migration nötig  
✅ Keine Breaking Changes  
✅ Sofort einsatzbereit  

**Status:** FIXED & READY
**Datum:** 2026-01-31
