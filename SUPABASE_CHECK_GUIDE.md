# 🔍 Supabase Migration überprüfen

## 📋 Wie man die Migration überprüft

### Im Supabase Dashboard:

#### Option 1: Über Table Editor
1. Gehe zu **Table Editor** (linke Sidebar)
2. Scroll runter - du solltest sehen:
   - ✅ `fixed_cost_template_categories`
   - ✅ `fixed_cost_template_items`

#### Option 2: Über SQL Editor (empfohlen)
1. Gehe zu **SQL Editor**
2. Klicke **"New query"**
3. Führe die Queries aus `supabase_verify_migration.sql` aus

## 🎯 Schritt-für-Schritt Überprüfung

### Check 1: SCHNELL-CHECK (empfohlen!)

Führe diese Query aus:

```sql
SELECT 
    'Template Categories' as check_name,
    (SELECT COUNT(*) FROM fixed_cost_template_categories)::text as wert,
    CASE WHEN (SELECT COUNT(*) FROM fixed_cost_template_categories) = 3 
         THEN '✅ OK' ELSE '❌ FEHLER' END as status
UNION ALL
SELECT 
    'Template Items',
    (SELECT COUNT(*) FROM fixed_cost_template_items)::text,
    CASE WHEN (SELECT COUNT(*) FROM fixed_cost_template_items) = 14 
         THEN '✅ OK' ELSE '❌ FEHLER' END;
```

**Erwartetes Ergebnis:**
```
check_name           | wert | status
---------------------|------|--------
Template Categories  | 3    | ✅ OK
Template Items       | 14   | ✅ OK
```

### Wenn der Schnell-Check fehlschlägt:

#### Szenario A: "relation does not exist" oder "table does not exist"
**→ Migration wurde nicht ausgeführt**

**Lösung:**
1. Öffne `supabase_migration_templates.sql`
2. Kopiere den KOMPLETTEN Inhalt
3. SQL Editor → New Query → Einfügen → Run
4. Warte auf "Success"

#### Szenario B: Template Categories = 0, Template Items = 0
**→ Migration OK, aber Seed fehlt**

**Lösung:**
1. Öffne `supabase_seed_templates.sql`
2. Kopiere den KOMPLETTEN Inhalt
3. SQL Editor → New Query → Einfügen → Run
4. Warte auf "Success"

#### Szenario C: "duplicate key" Fehler beim Seeden
**→ Daten sind schon da, aber Query zeigt sie nicht**

**Lösung:** Tabellen leeren und neu seeden:
```sql
DELETE FROM fixed_cost_template_items;
DELETE FROM fixed_cost_template_categories;
```
Dann `supabase_seed_templates.sql` nochmal ausführen.

## 🎨 Deine Daten anzeigen

### Alle Template-Kategorien mit Items:

```sql
SELECT 
    c.label as kategorie,
    i.label as item,
    i.amount as betrag,
    i.split_mode as aufteilung
FROM fixed_cost_template_categories c
LEFT JOIN fixed_cost_template_items i ON i.template_category_id = c.id
ORDER BY c.sort_order, i.sort_order;
```

**Sollte ausgeben:**

| kategorie | item | betrag | aufteilung |
|-----------|------|--------|------------|
| Wohnung & Haushalt | Miete | 550.00 | income |
| Wohnung & Haushalt | Strom | 110.00 | income |
| Wohnung & Haushalt | Amazon Prime | 8.00 | income |
| Wohnung & Haushalt | Netflix | 20.00 | partner |
| Wohnung & Haushalt | Apple TV | 25.00 | me |
| Wohnung & Haushalt | DAZN | 35.00 | me |
| Wohnung & Haushalt | Rundfunk | 18.00 | income |
| Wohnung & Haushalt | Versicherungen | 36.00 | income |
| Auto | Versicherung KIA | 60.00 | income |
| Auto | Versicherung BMW | 35.00 | income |
| Auto | Bankkredit KIA&BMW | 350.00 | income |
| Haustiere | Futter Bakari | 150.00 | income |
| Haustiere | Futter Dadööö | 80.00 | income |
| Haustiere | Versicherung Bakari | 50.00 | income |

## 🚨 Häufige Probleme

### "Nichts wird angezeigt im Web-Tool"

Das kann bedeuten:

1. **Falsche Ansicht:** 
   - Table Editor zeigt nur "public" Tabellen
   - Gehe sicher dass du im **public** Schema bist (nicht auth, storage, etc.)
   - Scroll runter - Template-Tabellen sind alphabetisch sortiert

2. **Migration nicht ausgeführt:**
   - Gehe zu SQL Editor → History
   - Prüfe ob die Migration dort auftaucht
   - Wenn nicht: Migration nochmal ausführen

3. **RLS blockiert Anzeige:**
   - Unwahrscheinlich, aber möglich
   - Check mit SQL Editor statt Table Editor

### "Error: relation already exists"

**→ Das ist OK!** Die Migration wurde schon ausgeführt.

Überspringe die Migration und gehe direkt zum Seed-Script.

## ✅ Erfolgscheck

Du weißt dass alles funktioniert wenn:

1. ✅ Table Editor zeigt `fixed_cost_template_categories` und `fixed_cost_template_items`
2. ✅ SQL Query zeigt 3 Kategorien und 14 Items
3. ✅ Alle deine Fixkosten sind in der Übersicht sichtbar

**Dann sag mir Bescheid und ich baue die UI! 🚀**

