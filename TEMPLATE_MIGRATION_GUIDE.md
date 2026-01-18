# Template-System Migration & Setup

## 🎯 Was wird gemacht

Dieses System führt **persistente Fixkosten-Templates** ein. Standard-Fixkosten werden einmalig definiert und automatisch in jeden neuen Monat kopiert.

## 📋 Schritt-für-Schritt Anleitung

### 1. Migration in Supabase ausführen

Öffne das **Supabase Dashboard** → **SQL Editor** und führe folgendes aus:

#### a) Migration (Tabellen erstellen)

Kopiere den kompletten Inhalt aus `supabase_migration_templates.sql` und führe ihn im SQL Editor aus.

**Was passiert:**
- Erstellt `fixed_cost_template_categories` Tabelle
- Erstellt `fixed_cost_template_items` Tabelle
- Fügt Flags zu bestehenden Tabellen hinzu (`is_from_template`, `template_category_id`)
- Setzt RLS Policies

#### b) Seed Data (Standard-Fixkosten einfügen)

Kopiere den kompletten Inhalt aus `supabase_seed_templates.sql` und führe ihn im SQL Editor aus.

**Was passiert:**
- Erstellt 3 Template-Kategorien:
  - Wohnung & Haushalt (mit 8 Items)
  - Auto (mit 3 Items)
  - Haustiere (mit 3 Items)
- Insgesamt 14 Standard-Fixkosten-Items

### 2. Bestehende Monate aktualisieren (optional)

Falls du bereits Monate in der DB hast und diese ebenfalls die Templates bekommen sollen:

```sql
-- Für jeden bestehenden OFFENEN Monat
DO $$
DECLARE
    month_record RECORD;
BEGIN
    FOR month_record IN 
        SELECT id FROM months WHERE status = 'open'
    LOOP
        -- Hier müsste die copyTemplatesToMonth Funktion aufgerufen werden
        -- Das geht nur über die App, nicht direkt in SQL
        RAISE NOTICE 'Month % needs templates copied', month_record.id;
    END LOOP;
END $$;
```

**Einfacher:** Lösche den aktuellen Monat (wenn noch keine wichtigen Daten drin sind), dann wird er beim nächsten Laden neu erstellt - MIT Templates!

```sql
-- VORSICHT: Nur wenn du den aktuellen Monat neu erstellen willst!
DELETE FROM months WHERE status = 'open';
```

### 3. App neu starten

```bash
npm run dev
```

Beim ersten Laden wird automatisch der aktuelle Monat erstellt - **MIT allen Templates**! 🎉

## ✅ Verifikation

Nach der Migration kannst du überprüfen:

### 1. Templates anzeigen

```sql
SELECT 
    c.label as category,
    i.label as item,
    i.amount,
    i.split_mode
FROM fixed_cost_template_categories c
LEFT JOIN fixed_cost_template_items i ON i.template_category_id = c.id
ORDER BY c.sort_order, i.sort_order;
```

**Erwartetes Ergebnis:** 14 Zeilen mit allen Standard-Fixkosten

### 2. Aktueller Monat hat Templates

```sql
SELECT 
    c.label as category,
    c.is_from_template,
    i.label as item,
    i.amount,
    i.split_mode,
    i.is_from_template
FROM fixed_cost_categories c
LEFT JOIN fixed_cost_items i ON i.category_id = c.id
WHERE c.month_id = (SELECT id FROM months WHERE status = 'open' LIMIT 1)
ORDER BY c.label, i.label;
```

**Erwartetes Ergebnis:** Gleiche 14 Items, alle mit `is_from_template = true`

## 🔧 Troubleshooting

### Templates wurden nicht kopiert

Falls die Templates nicht automatisch im neuen Monat erscheinen:

1. Prüfe Server-Logs auf Fehler
2. Prüfe ob die Template-Tabellen korrekt erstellt wurden
3. Manuell Monat löschen und neu laden lassen

### Migration schlägt fehl

- **"table already exists"**: Tables existieren schon, okay zu ignorieren
- **"column already exists"**: Columns existieren schon, okay zu ignorieren
- **Permission denied**: RLS muss aktiviert sein mit richtigen Policies

### Seed schlägt fehl

- **"duplicate key"**: Seed wurde schon ausgeführt, okay
- Dann einfach alte Templates löschen und neu seeden:

```sql
DELETE FROM fixed_cost_template_items;
DELETE FROM fixed_cost_template_categories;
-- Dann supabase_seed_templates.sql erneut ausführen
```

## 📝 Nächste Schritte

Nach erfolgreicher Migration:

1. ✅ Templates sind in der DB
2. ✅ Neue Monate bekommen automatisch alle Templates
3. ✅ Bereit für UI-Implementierung (Templates editieren, neue hinzufügen)

Die UI-Anpassungen folgen im nächsten Schritt! 🚀

