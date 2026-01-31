# Profile Selection - Test Protocol

## ✅ Verifizierung: Auswahl kommt nur beim ersten Mal

### **Test 1: Erste Installation (localStorage leer)**

1. Browser öffnen → DevTools (F12) → Console Tab
2. localStorage löschen:
   ```javascript
   localStorage.removeItem('myiykyk_profile');
   ```
3. Hard Refresh: Cmd+Shift+R (Mac) oder Strg+Shift+R (Windows)
4. **ERWARTUNG**: Profil-Auswahl erscheint (lila Hintergrund, NICHT transparent)
5. "Christian" oder "Steffi" wählen
6. **ERWARTUNG**: Overlay verschwindet → Übersichtsseite erscheint

### **Test 2: Nach Auswahl (localStorage gefüllt)**

1. Normale Seite neu laden (F5)
2. **ERWARTUNG**: KEINE Profil-Auswahl → direkt zur App
3. localStorage prüfen:
   ```javascript
   console.log(localStorage.getItem('myiykyk_profile'));
   ```
   **ERWARTUNG**: `{"id":"...", "name":"Christian"}` (oder Steffi)

### **Test 3: Profil-Wechsel**

1. Zu `/profil` navigieren
2. Button "Profil wechseln" klicken
3. **ERWARTUNG**: localStorage gelöscht → Profil-Auswahl erscheint wieder
4. Anderen Namen wählen
5. **ERWARTUNG**: localStorage mit neuem Namen

### **Test 4: Neue Ausgabe erstellt**

1. Zu `/ausgaben` navigieren
2. Neue Ausgabe erstellen
3. Zurück zur Übersicht
4. Historie checken
5. **ERWARTUNG**: Neuer Eintrag zeigt deinen gewählten Namen (nicht "−")

---

## 🔍 Debug Commands (Browser Console)

```javascript
// Check localStorage
console.log('Profile:', localStorage.getItem('myiykyk_profile'));

// Clear localStorage (force profile selection)
localStorage.removeItem('myiykyk_profile');

// Check if selector should show
console.log('Has Profile:', !!localStorage.getItem('myiykyk_profile'));
```

---

## ✅ Erwartetes Verhalten

| Zustand | localStorage | Profil-Auswahl angezeigt? |
|---------|--------------|---------------------------|
| **Erste Installation** | leer | ✅ JA |
| **Nach Auswahl** | gefüllt | ❌ NEIN |
| **App-Neustart** | gefüllt | ❌ NEIN |
| **PWA-Neustart** | gefüllt | ❌ NEIN |
| **Nach "Profil wechseln"** | leer | ✅ JA |
| **Nach Browser-Cache-Clear** | leer | ✅ JA |

