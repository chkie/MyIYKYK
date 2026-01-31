# 🎯 LÖSUNG GEFUNDEN!

## Problem: ProfileSelector verdeckt BottomNav

### **Root Cause:**
```svelte
<!-- ProfileSelector.svelte -->
<div class="fixed inset-0 z-[9999] ...">
  <!-- fullscreen overlay -->
</div>

<!-- +layout.svelte -->
<BottomNav /> <!-- z-50 → wird verdeckt durch z-9999! -->
```

### **Warum du die Navbar NICHT siehst:**

1. localStorage ist leer (kein Profil gewählt)
2. ProfileSelector erscheint als **FULLSCREEN Overlay** (inset-0 = top:0, right:0, bottom:0, left:0)
3. z-index: 9999 → verdeckt ALLES darunter (inkl. BottomNav mit z-50)

---

## ✅ LÖSUNG

### **Schritt 1: Profil wählen**

1. Öffne App → Profil-Auswahl erscheint
2. Wähle "Christian" oder "Steffi"
3. localStorage wird gefüllt
4. **Overlay verschwindet**
5. **BottomNav wird sichtbar!**

### **Schritt 2: Oder localStorage manuell füllen (Debug)**

```javascript
// In Browser Console (F12):
localStorage.setItem('myiykyk_profile', JSON.stringify({
  id: 'dummy-id', 
  name: 'Test'
}));
location.reload();
```

### **Schritt 3: Oder Debug-Button nutzen**

Falls der 🔧 Button sichtbar ist:
1. Klicken → localStorage löschen
2. Profil wählen
3. BottomNav erscheint

---

## 🔍 Verify

**Nach Profil-Auswahl solltest du sehen:**

1. ✅ **KEINE** lila Profil-Auswahl mehr
2. ✅ **BottomNav** am unteren Rand (4 Icons)
3. ✅ **Debug-Button** 🔧 rechts unten (nur dev mode)
4. ✅ **Normale App** (Übersichtsseite)

