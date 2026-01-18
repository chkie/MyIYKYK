# 📱 Smartphone Zugriff eingerichtet ✅

## 🌐 Wie du die App auf deinem Smartphone öffnest:

### 1️⃣ **Vite Server ist jetzt im Netzwerk erreichbar**

Die `vite.config.ts` wurde aktualisiert mit:
```typescript
server: {
	host: true,  // Expose to network (0.0.0.0)
	port: 5174
}
```

### 2️⃣ **Deine lokale IP-Adresse:**
```
10.0.0.15
```

### 3️⃣ **Auf dem Smartphone öffnen:**

**URL:** `http://10.0.0.15:5174`

### 📋 Voraussetzungen:
- ✅ Laptop und Smartphone im **gleichen WLAN**
- ✅ Dev-Server läuft (`npm run dev`)
- ✅ Firewall erlaubt Port 5174 (macOS fragt beim ersten Start)

---

## 🚀 Server neu starten

Der Server muss neu gestartet werden, damit die neue Config aktiv wird:

**Im Terminal:**
```bash
# Aktuellen Server stoppen (Ctrl+C im Terminal 4)
# Dann neu starten:
npm run dev
```

**Nach dem Start siehst du:**
```
VITE v7.3.1  ready in XXX ms

➜  Local:   http://localhost:5174/
➜  Network: http://10.0.0.15:5174/    ← Das ist deine Smartphone-URL!
```

---

## 📱 Auf dem Smartphone:

1. **Browser öffnen** (Safari/Chrome)
2. **Eingeben:** `http://10.0.0.15:5174`
3. **Fertig!** Die App lädt

### 💡 Tipp: Home Screen Icon erstellen
1. Auf **Safari (iOS)**: Teilen → "Zum Home-Bildschirm"
2. Auf **Chrome (Android)**: Menü → "Zum Startbildschirm hinzufügen"

→ App startet dann wie eine native App! 🎉

---

## 🔒 Sicherheit

- Nur im lokalen Netzwerk erreichbar
- Nicht aus dem Internet zugänglich
- Perfekt für Entwicklung

---

**Server neu starten und dann auf dem Handy testen!** 📱

