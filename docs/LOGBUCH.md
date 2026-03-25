# SteuerPilot — Logbuch

---

## 2026-03-25 — Phase 0: Fundament

### Was wurde gebaut

Das komplette Projektfundament wurde von Null aufgebaut:

- **`.gitignore`** — als allererstes, vor allem anderen. Schützt DB-Dateien, .env, Belege, Zertifikate.
- **`package.json`** — alle Abhängigkeiten definiert: Electron, React, Vite, SQLCipher, Framer Motion, Recharts, jsPDF, Bonjour.
- **`electron.vite.config.js`** — Build-System konfiguriert (electron-vite mit expliziten Entry Points).
- **`electron/main.js`** — Electron Main Process: Fenster-Erstellung, IPC-Handler für DB-Operationen.
- **`electron/preload/index.js`** — contextBridge: einziger Kommunikationsweg Renderer → Main. Kein direktes ipcRenderer.
- **`electron/db.js`** — SQLCipher-Integration: DB öffnen, Passwort setzen, Schema erstellen, CRUD-Helfer.
- **`src/index.html`** — Renderer-Einstiegspunkt mit Manrope-Font und Content Security Policy.
- **`src/main.jsx`** + **`src/App.jsx`** — React-Grundgerüst.
- **`src/index.css`** — Globale Styles mit allen CSS Custom Properties aus dem Design System.
- **`src/theme/tokens.js`** — Vollständiges Design Token System ("The Financial Architect"): Farben, Typografie, Spacing, Radius, Animationen.
- **`src/engine/steuerberechnung.js`** — Pure-JS Steuerberechnungen: Fahrtkosten, Homeoffice-Pauschale, vereinfachte Rückerstattungsschätzung. Kein Electron — vollständig unit-testbar.
- **`.env.example`** — Platzhalter für Jetson + Sync-Konfiguration.

### Entscheidungen

- **electron-vite** statt manuellem vite + electron Setup — stabiler, weniger Konfigurationsaufwand.
- **Renderer-Root auf `src/`** — alle React-Dateien direkt in `src/`, keine extra `src/renderer/` Ebene. Sauberer für die Projektgröße.
- **DB-Schema jetzt vollständig** — alle Tabellen mit `steuerjahr_id`, 2024 + 2025 als Standardjahre vorbelegt.
- **Electron-Install separat** — `--ignore-scripts` beim npm install verhindert den nativen Rebuild von SQLCipher vor dem ersten Start. `postinstall` läuft später separat mit `electron-rebuild`.

### Technische Erkenntnisse

- `npm install --ignore-scripts` nötig um SQLCipher-Rebuild beim ersten Install zu überspringen (native Module brauchen electron-rebuild, nicht node-gyp direkt).
- Electron-Binary wurde separat über `node node_modules/electron/install.js` heruntergeladen (fehlte nach `--ignore-scripts`).
- GPU-Warning `MESA-INTEL: Performance support disabled` ist harmlos — nur eine Linux/Mesa Konfigurationsempfehlung, kein Fehler.
- HTML Script-Tag muss `./main.jsx` (relativ) statt `/src/main.jsx` (absolut) nutzen wenn renderer-root auf `src/` gesetzt ist.

### Status

✅ Build läuft (`npx electron-vite build` — alle 3 Bundles: main, preload, renderer)
✅ Electron-Fenster öffnet sich ohne Fehler
✅ Fundament bereit für Phase 1 (Auth/Login)

### Offene Punkte / Nächste Schritte

- **Phase 1:** Login-Screen bauen (Passwort-Eingabe → SQLCipher DB öffnen)
- SQLCipher native Rebuild: `npm run rebuild` muss einmal mit installierten Build-Tools ausgeführt werden
- Manrope-Font im Dev-Modus: läuft über Google Fonts CDN — für Offline-Nutzung später lokal einbinden

---

## 2026-03-25 — Phase 1: Login-Screen

### Was wurde gebaut

- **`src/screens/Login/LoginScreen.jsx`** — Vollständiger Login-Screen mit zwei Modi:
  - `create` (Ersteinrichtung): Passwort festlegen + bestätigen, Amber-Warnbanner "Passwort kann nicht zurückgesetzt werden"
  - `login` (Rückkehr): Single-Password-Eingabe
  - Prüft DB-Existenz per `window.steuerpilot.db.exists()` beim Mount — wählt Modus automatisch
  - Zwei-Panel-Layout: links BrandPanel (surface_container_lowest, geometrische SVG-Dekor, Headline), rechts Glassmorphism-Formular
  - Spring-Animationen via framer-motion auf allen Elementen
  - Inline SVG Icons (kein Icon-Paket)

### Entscheidungen

- **Kein "Passwort vergessen"** — bewusste Designentscheidung: Passwort-Reset würde Zugriff auf verschlüsselte Daten erfordern, was die Sicherheitsgarantie bricht.
- **Kein Biometrie** — Desktop v1 Scope, iOS bekommt das later.
- `spring`/`springGentle` als direkte Named Exports aus `tokens.js` — statt `animation.spring` nested Zugriff.

### Technische Erkenntnisse

- Framer Motion `AnimatePresence` mit `mode="wait"` — wichtig damit Exit-Animation abläuft bevor Enter beginnt.

### Status

✅ Login-Screen gebaut und optisch fertig
✅ App.jsx: nach Login → Onboarding-Check (prüft `onboarding_abgeschlossen` in einstellungen)
✅ Phase 1 abgeschlossen

---

## 2026-03-25 — Phase 2: Onboarding

### Was wurde gebaut

- **`src/screens/Onboarding/OnboardingScreen.jsx`** — 4-Schritt-Wizard:
  1. **Willkommen** — Hero-Illustration, Feature-Liste (4 Cards), Kurzbeschreibung
  2. **Nutzertyp** — 3 Auswahlkarten: Angestellter / Freelancer / Selbstständiger (mit Tags für relevante Steuerfelder)
  3. **Basisdaten** — Vorname*, Nachname*, Steuer-ID (opt), Finanzamt (opt)
  4. **Steuerjahr** — Zwei große Jahres-Cards: 2025 (aktiv) / 2024 (nachträglich)

- **Slide-Animationen** — `AnimatePresence` mit `direction`-basierter Slide-Transition (links/rechts je nach Navigationsrichtung)
- **Step-Indicator** — animierte Dots: aktiver Schritt = Amber, abgeschlossene = Blau, restliche = grau. Aktiver Dot breiter (Pill-Form)
- **DB-Persistenz** beim Abschließen:
  1. `INSERT INTO nutzer` (Profil)
  2. `UPDATE steuerjahre SET aktiv = 0` → `aktiv = 1 WHERE jahr = ?`
  3. `INSERT OR REPLACE INTO einstellungen` → `onboarding_abgeschlossen = '1'`

- **`src/App.jsx`** — Smart Routing nach Login: prüft `onboarding_abgeschlossen` → direkt zu `app` (Dashboard) wenn bereits eingerichtet, sonst zu `onboarding`

### Entscheidungen

- **Glassmorphism nur im Login** — Onboarding ist voller Screen ohne geteiltes Panel-Layout. Mehr Platz für Wizard-Inhalt.
- **Nutzertyp: 3 Optionen** — Angestellter, Freelancer, Selbstständiger. Kein "Rentner" etc. in MVP.
- **Steuer-ID optional** — viele Nutzer wissen sie nicht auswendig, Pflichtfeld würde zu Abbrüchen führen.
- **Steuerjahr 2025 vorausgewählt** — aktuelles Jahr ist der häufigere Use-Case.

### Status

✅ Onboarding-Screen gebaut (alle 4 Schritte)
✅ DB-Persistenz: Nutzer, aktives Steuerjahr, Onboarding-Flag
✅ App.jsx: Login → Onboarding-Check → Dashboard-Placeholder
✅ Phase 2 abgeschlossen

### Offene Punkte / Nächste Schritte

- **Phase 3:** Dashboard bauen (Jahresübersicht, Rückerstattungsschätzung, Deadlines, Steuerjahr-Selektor)
