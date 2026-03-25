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
