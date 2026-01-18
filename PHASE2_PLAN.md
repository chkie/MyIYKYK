# Phase 2: Bottom Navigation & Structure

## 🎯 Ziel
Weniger Scrollen durch klare Struktur mit 4 Hauptbereichen

## 📐 Struktur

```
┌─────────────────────────┐
│  Header (sticky)        │
├─────────────────────────┤
│                         │
│  Content Area           │
│  (je nach Route)        │
│                         │
├─────────────────────────┤
│  [📊] [🏠] [💰] [👤]  │ ← Bottom Nav (sticky)
└─────────────────────────┘
```

## 🗂️ Die 4 Bereiche

### 1. **📊 Übersicht** (`/`)
**Inhalt:**
- Month Badge
- Die 4 Summary Cards (Fixkosten, Vorauszahlung, Schulden, Empfehlung)
- Quick Actions
- **KEIN Scrollen nötig!**

### 2. **🏠 Fixkosten** (`/fixkosten`)
**Inhalt:**
- Fixkosten-Kategorien Management
- Items bearbeiten/hinzufügen
- Templates-System

### 3. **💰 Ausgaben** (`/ausgaben`)
**Inhalt:**
- Private Ausgaben Liste
- Ausgabe hinzufügen
- Historie

### 4. **👤 Profil** (`/profil`)
**Inhalt:**
- Einkommen bearbeiten
- Vorauszahlung eintragen
- Monat abschließen
- Archive
- Settings

## 🎨 Bottom Navigation Design

```html
Fixed am unteren Bildschirmrand:
- 4 Icons mit Labels
- Active State (farbig + bold)
- Smooth Transitions
- Safe Area für iPhone
```

## 📝 Implementierung

### Schritt 1: Bottom Nav Component
- Component: `BottomNav.svelte`
- Active State Detection
- Routing

### Schritt 2: Routes erstellen
- `/` → Dashboard (Übersicht)
- `/fixkosten` → Fixkosten Management
- `/ausgaben` → Ausgaben
- `/profil` → Profile & Settings

### Schritt 3: Content aufteilen
- Bestehenden Content von `+page.svelte` aufteilen
- Komponenten extrahieren
- Neue Pages befüllen

## ✅ Erfolg gemessen an:
- Max 1 Screen Scrolling pro Bereich
- Alle Funktionen in < 2 Taps erreichbar
- Klare visuelle Trennung

