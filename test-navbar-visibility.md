# BottomNav Visibility Test

## ✅ Problem-Analyse

### **Mögliche Ursachen (geprüft):**

1. ✅ **Import/Export**: BottomNav.svelte existiert und wird korrekt importiert
2. ✅ **Conditional Rendering**: `{#if showNav}` sollte true sein (außer auf `/login`)
3. ✅ **Z-Index**: BottomNav hat `z-50`, sollte über Content sein
4. ⚠️ **CSS/Tailwind**: Könnte durch andere Styles überschrieben werden
5. ⚠️ **ProfileSelector Overlay**: Könnte BottomNav verdecken

### **Fix implementiert:**

```svelte
<!-- VORHER (problematisch): -->
{#if !isLoginPage}
  <BottomNav />
{/if}

<!-- NACHHER (explizit): -->
let showNav = $derived(!isLoginPage);

{#if showNav}
  <BottomNav />
{/if}
```

---

## 🔍 Debug Steps (im Browser)

### **1. Check DOM:**
Öffne DevTools (F12) → Elements Tab
```javascript
// Check if BottomNav exists in DOM
document.querySelector('nav');  // Should return <nav> element

// Check if it's visible
const nav = document.querySelector('nav');
console.log('Nav exists:', !!nav);
console.log('Nav style:', nav ? window.getComputedStyle(nav).display : 'not found');
console.log('Nav position:', nav ? window.getComputedStyle(nav).position : 'not found');
console.log('Nav bottom:', nav ? window.getComputedStyle(nav).bottom : 'not found');
```

### **2. Check Computed Styles:**
```javascript
const nav = document.querySelector('nav');
if (nav) {
  console.log('Display:', getComputedStyle(nav).display);
  console.log('Visibility:', getComputedStyle(nav).visibility);
  console.log('Opacity:', getComputedStyle(nav).opacity);
  console.log('Z-Index:', getComputedStyle(nav).zIndex);
  console.log('Position:', getComputedStyle(nav).position);
  console.log('Bottom:', getComputedStyle(nav).bottom);
}
```

### **3. Check Overlays:**
```javascript
// Check if ProfileSelector is covering it
const profileSelector = document.querySelector('.fixed.inset-0.z-\\[9999\\]');
console.log('ProfileSelector overlay active:', !!profileSelector);

// Check current path
console.log('Current path:', window.location.pathname);
console.log('Is login page:', window.location.pathname === '/login');
```

### **4. Force Visibility (temporary):**
```javascript
const nav = document.querySelector('nav');
if (nav) {
  nav.style.display = 'block';
  nav.style.visibility = 'visible';
  nav.style.opacity = '1';
  nav.style.zIndex = '99999';
  console.log('✅ Nav forced visible');
}
```

---

## 📋 Expected Result

### **Auf allen Seiten AUSSER /login:**
- BottomNav am unteren Bildschirmrand
- 4 Icons: Übersicht, Fixkosten, Ausgaben, Profil
- `position: fixed; bottom: 0; z-index: 50`

### **Auf /login:**
- KEINE BottomNav

---

## 🚨 If Still Not Visible

**Mögliche weitere Probleme:**

1. **ProfileSelector verdeckt alles** (z-index 9999 > 50)
   - Fix: Profil wählen → Overlay verschwindet
   
2. **CSS Conflict**
   - Check: `pb-20` Padding auf `<main>` (sollte Platz für Nav lassen)
   
3. **Tailwind not loaded**
   - Check: Andere Styles funktionieren?

