# App Store Foundation - iOS MVP

## ✅ Bereits implementiert (Phase B Patches 1-4)

- **Safe Areas:** Notch/Home-Indicator Support (header + main + BottomNav)
- **Tap Targets:** 44pt minimum (Header buttons, BottomNav, Forms)
- **Input/Keyboard:** inputmode, enterkeyhint, autocomplete, autocapitalize, scrollIntoView
- **PWA/iOS Meta:** apple-touch-icons (multi-size), user-scalable=no, format-detection
- **Manifest:** display_override, prefer_related_applications, standalone mode

## 📋 App Store Review Requirements (TODO vor Submission)

### 1. Demo Account (Pflicht bei Login-Gate)

- Review-Zugangsdaten bereitstellen (App Store Connect Notes)
- Empfehlung: Separater Test-Account mit Demo-Daten

### 2. Privacy Policy (Pflicht, Guideline 5.1.1)

- URL erstellen: `/privacy` Route + statische Seite
- In manifest.json referenzieren (optional: `privacy_policy` field)
- Muss DSGVO-konform sein (DE-App)

### 3. Support/Legal Pages

- `/impressum` - Pflicht für DE-Apps (Anbieterkennzeichnung)
- `/support` - Kontakt-Möglichkeit (E-Mail genügt)

### 4. Minimum Functionality Check

- ✅ Eigenständige Funktionalität (Kostenverwaltung)
- ⚠️ KEIN reiner WebView-Wrapper
- ✅ Offline-Fähigkeit durch Service Worker
