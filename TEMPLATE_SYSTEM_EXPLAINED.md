# ✅ Template-System - Funktionsweise

## 🎯 Wie funktioniert das Template-System?

### 1. **Templates sind PERSISTENT** (unabhängig vom Monat)

Templates leben in eigenen Tabellen:
- `fixed_cost_template_categories` → 3 Kategorien
- `fixed_cost_template_items` → 14 Items

Diese Daten sind **monatunabhängig** und bleiben für immer gespeichert!

### 2. **Beim Monat-Erstellen: Automatische Kopie**

Wenn ein neuer Monat erstellt wird:
1. Code prüft: Gibt es einen offenen Monat für aktuelles Jahr/Monat?
2. Nein → Erstellt neuen Monat
3. **Kopiert automatisch ALLE Templates** in den neuen Monat
4. Diese Kopien können dann monatsspezifisch angepasst werden

### 3. **Monatliche Daten sind unabhängig**

Jeder Monat hat seine eigene Kopie:
- `fixed_categories` → Kategorien für DIESEN Monat
- `fixed_items` → Items für DIESEN Monat

**Änderungen im aktuellen Monat beeinflussen NICHT:**
- Die Templates (bleiben unverändert)
- Andere Monate (jeder Monat ist unabhängig)

## 📊 Beispiel-Szenario

### Monat 1 (Januar 2026):
```
Templates kopiert → Miete: 550€
```

### Monat 2 (Februar 2026):
```
Templates kopiert → Miete: 550€  (gleicher Wert)
```

### Was wenn die Miete steigt?

**Option A: Nur für diesen Monat ändern**
→ Ändere den Wert im aktuellen Monat
→ Nächster Monat bekommt wieder 550€ aus dem Template

**Option B: Template ändern (dauerhaft)**
→ Template-Wert ändern auf z.B. 600€
→ **ALLE NEUEN Monate** bekommen dann 600€

## 🔧 Wie Templates ändern?

### Aktuell (manuell in Supabase):

```sql
-- Miete dauerhaft auf 600€ ändern
UPDATE fixed_cost_template_items
SET amount = 600.00
WHERE label = 'Miete';

-- Nächster Monat bekommt dann automatisch 600€!
```

### Geplant (UI):

Ich kann einen **"Template-Editor"** bauen:
- Ähnlich wie "Einkommen bearbeiten"
- Liste aller Template-Items
- Betrag ändern → Gilt für ALLE NEUEN Monate
- Aufteilung ändern → Gilt für ALLE NEUEN Monate

## ✅ Was du jetzt testen kannst

### Simulation: Monat abschließen

1. **Schließe den aktuellen Monat** (im Tool auf "Monat abschließen")
2. **Lösche den geschlossenen Monat** (in Supabase oder warte bis nächster Monat)
3. **Lade die App neu**
4. **ALLE 14 Fixkosten sollten wieder da sein!** ✅

### Verifikation in Supabase

Führe `supabase_verify_template_system.sql` aus:

```sql
SELECT 
    (SELECT COUNT(*) FROM fixed_cost_template_items) as template_items,
    (SELECT COUNT(*) FROM fixed_items WHERE category_id IN (SELECT id FROM fixed_categories WHERE month_id IN (SELECT id FROM months WHERE status = 'open'))) as monat_items;
```

**Erwartetes Ergebnis:**
```
template_items | monat_items
---------------|------------
14             | 14
```

## 🎨 Nächste Schritte (optional)

Soll ich noch folgendes bauen?

### 1. **Template-Editor UI** ✨
- Sektion "Standard-Fixkosten bearbeiten"
- Beträge ändern (z.B. Miete steigt)
- Aufteilung ändern (z.B. Netflix übernimmt jetzt Christian)
- Gilt dann für alle NEUEN Monate

### 2. **Visuelle Unterscheidung** 🎨
- Template-Items bekommen ein Badge (⭐)
- Zeigt an: "Dies ist ein Standard-Fixkost"
- Unterscheidung zu einmaligen Kategorien

### 3. **Einmalige Kategorien** 💡
- "Neue Kategorie hinzufügen" → Nur für diesen Monat
- Für unvorhergesehene Ausgaben (z.B. Reparatur)

**Sag mir ob das System jetzt so funktioniert wie du es dir vorstellst, oder ob noch etwas fehlt!** 🎯

