# SteuerPilot — Logbuch

---

## 2026-03-26 — Phase 6: PDF-Export nach ELSTER-Feldern

### Was wurde gebaut

Export-Funktion die aus allen erfassten Daten eine strukturierte Steuer-Zusammenfassung als PDF generiert.

- **`src/engine/pdfExport.js`** — Pure-JS Engine (jsPDF + jspdf-autotable). Keine Electron-Abhängigkeit.
- **`src/screens/Dashboard/ExportButton.jsx`** — Export-Button im Dashboard-Header mit Lade-, Erfolgs- und Fehlerzustand.
- **IPC Handler `pdf:save`** — Öffnet nativen Speichern-Dialog, schreibt die PDF-Bytes auf Disk.

**PDF-Struktur (5–6 Seiten je nach Daten):**
1. **Deckblatt** — Nutzername, Jahr, Erstelldatum, prominenter Disclaimer-Kasten (orange Umrandung)
2. **Übersicht** — Alle Kennzahlen auf einen Blick, ggf. geschätzte Rückerstattung
3. **Anlage N** — Bruttoarbeitslohn, Lohnsteuer, Soli, Kirchensteuer, Werbungskosten mit ELSTER-Zeilennummern
4. **Werbungskosten** — Aufschlüsselung nach Kategorie mit ELSTER-Feld + Erläuterung, Pauschbetrag-Vergleich
5. **Vorsorge & Sonderausgaben** — Krankenversicherung, Altersvorsorge, Spenden
6. **Anlage EÜR** _(nur wenn Honorar-Einnahmen vorhanden)_ — Einnahmen-Überschuss-Rechnung für Freiberufler

### Entscheidungen

- **Disclaimer auf dem Deckblatt** — Großer, orange hinterlegter Hinweiskasten der klar macht dass das Dokument kein amtliches Formular ist. Auf jeder Seite zusätzlich kleiner Footer-Hinweis.
- **jsPDF im Renderer** — Kein Node-Prozess nötig, jsPDF läuft komplett im Renderer. Nur der Speichern-Dialog und das Schreiben der Datei gehen durch den Main Process (IPC).
- **Fehlende Daten = "—"** — Wenn Lohnsteuer oder Soli nicht im Wizard erfasst wurden, erscheint "—" mit Hinweis dass die Werte von der Lohnsteuerbescheinigung übernommen werden müssen.
- **EÜR nur bei Honoraren** — Seite 6 wird automatisch hinzugefügt wenn Honorar-Einnahmen erfasst wurden, sonst 5 Seiten.
- **Rückerstattungs-Schätzung** — Nutzt die bestehende `schaetzeRueckerstattung()`-Engine. Nur angezeigt wenn Lohneinnahmen vorhanden.

### Offene Punkte / Nächste Schritte

- Wizard-Felder (Lohnsteuer, Soli, Kirchensteuer) noch nicht mit Anlage-N-Export verbunden — User muss Werte von Lohnsteuerbescheinigung manuell übernehmen
- iOS-App: PDF-Export über Share Sheet noch ausstehend (eigene Phase)
- Direktübertragung an ELSTER: Phase 3 / nach Zertifizierung

---

## 2026-03-26 — Phase 5 Teil 2: OCR mit Tesseract.js

### Was wurde gebaut

Lokale OCR-Integration für die Belegverwaltung — kein Netzwerk, kein Jetson.

- **`src/engine/ocrExtraction.js`** — Pure-JS Extraktions-Engine: Betrag, Datum, Händler aus OCR-Text via Regex. Vollständig unit-testbar, keine Electron-Abhängigkeit.
- **OCR IPC Handler** in `electron/main.js` — Nimmt Dateipfad + MIME-Typ entgegen, führt Tesseract (Bilder) oder pdf-parse (digitale PDFs) aus, gibt `{ betrag, datum, haendler, roherText }` zurück.
- **Singleton Worker** — Tesseract-Worker wird beim ersten OCR-Aufruf initialisiert und für die gesamte App-Laufzeit gehalten. WASM lädt einmal, danach schnell.
- **Sprachcache** — `deu.traineddata` (~5 MB) wird beim ersten Run von CDN geladen und in `userData/tessdata/` gespeichert. Folgeaufrufe sind offline.
- **BelegeScreen-Integration** — Nach dem Upload startet OCR sofort im Hintergrund. Detail Panel zeigt animierten Badge (ausstehend → erkannt / manuell). Felder werden vorausgefüllt wenn OCR Daten liefert. User kann jederzeit überschreiben.
- **OCR Info Box** — Zeigt erkannte Werte mit grünem Hinweis an, solange der Beleg noch nicht gespeichert ist.

### Entscheidungen

- **Tesseract.js v7** — WASM-basiert, kein nativer Binary, kein electron-rebuild nötig. Deutlich einfacher als v3/v4.
- **Singleton Worker statt Per-Call** — Worker-Init + WASM-Load kostet ~2-3s. Singleton hält das Worker-Thread am Leben, recognize-Aufrufe sind danach schnell (~0.5-2s je nach Bildgröße).
- **pdf-parse für PDFs** — Nur digitale PDFs (mit eingebettetem Text). Gescannte PDFs (Bild-im-PDF) werden mit Hinweismeldung abgelehnt — Tesseract-auf-PDF-Render kommt erst mit dem Jetson-Backend.
- **`ocr_status`** — 4 Werte: `'ausstehend'` (läuft), `'auto'` (OCR erfolgreich), `'fehlgeschlagen'` (kein Text gefunden), `'manuell'` (kein OCR).
- **Betrag-Extraktion** — Zweistufig: zuerst Keyword-Match (Gesamt/Total/Summe), dann Fallback auf größten Wert im Text.

### Technische Erkenntnisse

- `externalizeDepsPlugin` in electron-vite: npm-Pakete bleiben als `require()` im Output (extern), lokale Dateien (ocrExtraction.js) werden inline gebündelt — das war die saubere Lösung.
- `pdf-parse` hat einen bekannten Quirk: liest beim Import einmalig eine Test-PDF aus dem eigenen Paket — harmlos, nur beim ersten `require()` leicht langsamer.
- Tesseract Worker-Pfad (workerPath) zeigt auf absoluten Pfad innerhalb des Pakets via `__dirname` — kein manuelles Konfigurieren nötig, auch in Electron.

### Offene Punkte / Nächste Schritte

- **Teil 3** — Jetson-Integration: LLaVA für gescannte PDFs und schwierige Bilder als Fallback
- Kategorie-Vorschlag aus OCR-Text (Händler-Name → Kategorie-Mapping)
- Konfidenz-Schwellwert für Betrag (sehr kleine oder unrealistische Beträge ignorieren)

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

---

## 2026-03-25 — Phase 3: Dashboard + AppShell

### Was wurde gebaut

- **`src/components/AppShell/AppShell.jsx`** — Haupt-App-Layout:
  - Sidebar (240px) mit Logo, Jahres-Selektor, Navigation, Nutzerprofil unten
  - Jahres-Selektor: animiertes Dropdown, wechselt aktives Jahr in DB sofort
  - Navigation: Dashboard (aktiv), Wizard/Belege/Umsatz/PDF/Einstellungen (grau, "Bald"-Badge)
  - Animierter Active-Indicator (layoutId) für aktuellen Nav-Eintrag
  - Lädt Nutzerprofil + Steuerjahre beim Mount, gibt beides per Render-Prop an Screens weiter

- **`src/screens/Dashboard/DashboardScreen.jsx`** — Dashboard-Inhalt:
  - **Begrüßung** — Tageszeit-abhängig (Morgen/Tag/Abend) mit Vornamen
  - **3 Metriken** — Einnahmen, Werbungskosten, Anzahl Belege (alle 0 im Erstzustand)
  - **Schätzungs-Card** — nutzt `schaetzeRueckerstattung()` aus steuerberechnung.js; zeigt Rückerstattung (grün) oder Nachzahlung (rot); Empty State wenn keine Daten
  - **Fristen-Card** — Abgabefristen für aktives Steuerjahr: ohne StB (31. Okt) und mit StB (28. Feb), mit farbkodiertem Countdown (rot <30 Tage, gelb <90 Tage, blau sonst)
  - **Fortschritts-Checkliste** — 5 Punkte: Profil, Steuer-ID, Einnahmen, Werbungskosten, Belege; Fortschrittsbalken

- **`src/App.jsx`** — AppShell + DashboardScreen eingehängt; Render-Prop Pattern für `nutzer` und `activeJahr`

### Entscheidungen

- **Render-Prop statt Context** für nutzer/activeJahr — einfacher, kein Provider nötig, wird in Phase 4+ ggf. zu Context umgebaut
- **Jahreswechsel sofort in DB** — kein "Speichern"-Button nötig, da atomare Operation
- **Lohnsteuer-Feld im Metric-State auf `null`** — kommt erst aus Wizard (Phase 4); Schätzung markiert sich automatisch als "unvollständig"
- **Deadline-Farben:** rot ≤30 Tage, amber ≤90 Tage, primary > 90 Tage — pragmatische Grenzwerte

### Status

✅ AppShell mit Sidebar, Jahresselektor, Navigation
✅ DashboardScreen mit allen 5 Widget-Cards
✅ Build sauber (576 kB JS, keine Fehler)
✅ Phase 3 abgeschlossen

### Offene Punkte / Nächste Schritte

- **Phase 4:** Dateneingabe-Wizard (Schritt-für-Schritt Formulare: Lohn, Fahrtkosten, Homeoffice, Arbeitsmittel, Sonderausgaben)
- Lohnsteuer-Daten aus Wizard → Dashboard Schätzung wird vollständig
- Context für nutzer/activeJahr wenn weitere Screens hinzukommen

---

## 2026-03-25 — Phase 4: Dateneingabe-Wizard

### Was wurde gebaut

Vollständiger 6-Schritt-Wizard für die Steuerdateneingabe:

- **`src/screens/Wizard/WizardField.jsx`** — Wiederverwendbare Wrapper-Komponente für alle Formularfelder:
  - Jedes Feld hat: Beschriftung, Kind-Element (Input/Toggle), Plain-Deutsch-Erklärungstext, ELSTER-Badge (Chip mit Formular + Zeile), optionaler Amber-Hinweisblock
  - `Input`-Komponente: fokus-sensitiver Border, Suffix-Support (€, Tage, km), Typen (number, text)
  - `Toggle`-Komponente: Pill-Switch für boolean Felder

- **`src/screens/Wizard/steps/SchrittLohn.jsx`** — Schritt 1: Einnahmen
  - Adaptiv nach Nutzertyp: Angestellte sehen Lohnsteuerbescheinigungsfelder (Bruttogehalt, Lohnsteuer, Soli, KiSt), Freelancer/Selbstständige sehen Honorareinnahmen + optionale Lohnsteuer Nebentätigkeit
  - Live-Vorschau-Card wenn Werte eingetragen

- **`src/screens/Wizard/steps/SchrittFahrtkosten.jsx`** — Schritt 2: Fahrtkosten
  - Toggle ÖPNV/PKW: PKW = Entfernungspauschale (km × Arbeitstage), ÖPNV = tatsächliche Kosten
  - Live-Berechnung via `berechneFahrtkosten()` aus der Engine

- **`src/screens/Wizard/steps/SchrittHomeoffice.jsx`** — Schritt 3: Homeoffice-Pauschale
  - Einzelfeld für Homeoffice-Tage, Live-Berechnung, Maximum-Warnung ab 210 Tagen
  - Jahrswerte via `getJahreswerte()` — zukunftssicher für 2024/2025/2026

- **`src/screens/Wizard/steps/SchrittArbeitsmittel.jsx`** — Schritt 4: Arbeitsmittel
  - Dynamische Liste: Beschreibung + Betrag pro Posten, Hinzufügen/Entfernen mit Animationen
  - Warnung wenn Einzelposten > 952 € (AfA-Pflicht)

- **`src/screens/Wizard/steps/SchrittSonderausgaben.jsx`** — Schritt 5: Sonderausgaben & Betriebsausgaben
  - Feste Felder: Krankenversicherung, Altersvorsorge, Spenden
  - Betriebsausgaben-Liste (animiert) nur sichtbar für Freelancer und Selbstständige

- **`src/screens/Wizard/steps/SchrittZusammenfassung.jsx`** — Schritt 6: Zusammenfassung
  - Alle eingegebenen Werte auf einen Blick, mit ELSTER-Feldreferenzen
  - Rückerstattungsschätzung (grüne Card) oder Nachzahlung (rote Card) via Engine
  - Zeigt "Lohnsteuer fehlt für Schätzung" wenn nötig

- **`src/screens/Wizard/WizardScreen.jsx`** — Wizard-Container:
  - 6-Schritt-Indikator (done = Checkmark, aktiv = Amber-Pill, zukünftig = Grau)
  - Slide-Animation zwischen Schritten (direction-aware, spring-basiert)
  - Draft-Persistenz: Zwischenstand wird nach jedem Schritt in `wizard_fortschritt` gespeichert
  - Wiederaufnahme: beim Öffnen wird offener Draft automatisch geladen
  - Finaler Speichern-Button: löscht alte DB-Einträge (per gespeicherte_ids), schreibt alles neu, navigiert zum Dashboard

### Entscheidungen

- **Draft in `wizard_fortschritt` als JSON** — alles in einem Feld statt normalisierter Tabellen; Wiederaufnahme ohne komplexe Joins
- **`gespeicherte_ids` im Draft** — beim erneuten Speichern werden alte Zeilen gelöscht und neu eingefügt; keine Duplikate, keine UPDATE-Fallunterscheidung
- **Betriebsausgaben bei Freelancern in Schritt 5 eingebettet** — kein eigener Schritt, da es sinnvoll zusammen mit Sonderausgaben passt
- **Bug in DashboardScreen repariert**: `ergebnis?.rueckerstattung` und `ergebnis?.nachzahlung` existieren nicht — Engine gibt `geschaetzteRueckerstattung` zurück. Fix: `Math.abs(ergebnis.geschaetzteRueckerstattung)`

### Technische Erkenntnisse

- `SELECT last_insert_rowid() as id` via `db.get()` nach jedem INSERT — so werden die IDs für `gespeicherte_ids` gesammelt
- `AnimatePresence` braucht `mode="wait"` bei Schritt-Slides für saubere Enter/Exit-Sequenz

### Status

✅ Alle 6 Wizard-Schritte gebaut
✅ WizardField mit ELSTER-Pflicht-Badges auf jedem Feld
✅ Draft-Persistenz + Wiederaufnahme
✅ Finales Speichern in DB (einnahmen + ausgaben Tabellen)
✅ Navigation "Dateneingabe" in AppShell freigeschaltet (available: true)
✅ App.jsx: Wizard-Route eingehängt
✅ Build sauber (670 kB JS, keine Fehler)
✅ Phase 4 abgeschlossen

### Offene Punkte / Nächste Schritte

- **Phase 5 Teil 1:** Belegverwaltung Basis (Drag & Drop, Vorschau, manuelle Kategorie) → nächste Session
- **Phase 5 Teil 2:** OCR + Jetson-Analyse
- **Phase 6:** PDF-Export (strukturiert nach ELSTER-Feldern mit Feldhinweisen)
- Dashboard-Metriken werden jetzt mit echten Wizard-Daten gefüllt (Einnahmen, Werbungskosten)

---

## 2026-03-26 — Phase 5 Teil 1: Belegverwaltung (Import + Vorschau + Kategorie)

### Was wurde gebaut

- **`electron/main.js`** — 3 neue IPC-Handler:
  - `belege:import-file` — empfängt ArrayBuffer vom Renderer, speichert mit UUID-Dateinamen unter `<userData>/belege/`, gibt Dateiname + Pfad zurück
  - `belege:read-preview` — liest Datei als Base64-Data-URL (für `<img src=...>`)
  - `belege:delete-file` — löscht Datei von Disk

- **`electron/preload/index.js`** — neues `window.steuerpilot.belege`-Objekt: `importFile`, `readPreview`, `deleteFile`

- **`src/screens/Belege/UploadZone.jsx`** — Drag & Drop Komponente:
  - Drag-over-Animation (Border wird Amber, leichte Skalierung)
  - Klick öffnet nativen Dateidialog (multi-select)
  - Validierung: nur JPG, PNG, WebP, PDF — Fehlermeldung bei ungültigem Typ
  - Format-Badges (JPG / PNG / PDF) als visuelle Hinweise

- **`src/screens/Belege/BelegeScreen.jsx`** — Haupt-Screen:
  - Zwei-Spalten-Layout: links Upload + Beleg-Liste, rechts Detail-Panel (erscheint nur wenn Beleg gewählt)
  - **BelegKarte** — Listeneinträge mit Thumbnail, Kategorie-Badge (farbkodiert), Betrag, Datum
  - **BelegPreview** — Bild-Tag für Fotos, PDF-Platzhalter mit Icon für PDFs
  - **DetailPanel** — Formular: Kategorie-Dropdown (alle 8 ausgaben-Kategorien), Betrag, Datum, Beschreibung; Speichern- + Löschen-Button mit Bestätigungsschritt
  - Neu: Datei importieren → sofort in Detail-Panel; Speichern → INSERT ausgaben + INSERT belege → Liste aktualisiert
  - Update: bestehenden Beleg anklicken → Formular befüllt → Änderungen speichern → UPDATE ausgaben
  - Löschen: DELETE belege + DELETE ausgaben + Datei von Disk entfernen
  - Header zeigt Anzahl Belege und Gesamtbetrag für das aktive Steuerjahr

- **`src/components/AppShell/AppShell.jsx`** — "Belege" Nav-Item auf `available: true`
- **`src/App.jsx`** — BelegeScreen-Route eingehängt

### Entscheidungen

- **Base64-Vorschau statt file://-URL** — Renderer hat keinen direkten Dateisystemzugriff; Base64 über IPC ist sicher und funktioniert auch nach Verschieben des userData-Verzeichnisses
- **UUID als Dateiname** — vermeidet Kollisionen und Sonderzeichen aus Originaldateinamen
- **OCR-Status `'manuell'`** für alle manuell angelegten Belege — Platzhalter für Teil 2
- **Kein separater "Belege"-Screen** für gespeicherte Ausgaben aus dem Wizard — die `belege`-Tabelle ist jetzt der zentrale Ort für alle Belegdateien; Wizard-Ausgaben ohne Datei erscheinen hier nicht (korrektes Verhalten)

### Technische Erkenntnisse

- `electron-rebuild` meldete „Success" ohne `.node`-Datei zu erzeugen — tatsächlich war `node-pre-gyp install` mit Electron-Target nötig: `node-pre-gyp install --runtime=electron --target=31.7.7 --dist-url=https://electronjs.org/headers`
- `package.json "main"` zeigte auf `dist-electron/main.js` statt `out/main/main.js` — muss zum electron-vite outDir passen

### Status

✅ Drag & Drop + Klick-Upload funktioniert (JPG, PNG, PDF)
✅ Datei-Vorschau (Bild oder PDF-Icon) im Detail-Panel und in der Liste
✅ Manuelle Kategorie, Betrag, Datum, Beschreibung zuweisbar
✅ Speichern in ausgaben + belege Tabellen
✅ Löschen mit Datei-Entfernung von Disk
✅ Build sauber (707 kB JS, 3 Bundles, keine Fehler)
✅ Phase 5 Teil 1 abgeschlossen

### Offene Punkte / Nächste Schritte

- **Phase 5 Teil 2:** OCR-Erkennung (Betrag, Datum, Händler automatisch auslesen) + Jetson-Analyse
- **Phase 6:** PDF-Export nach ELSTER-Feldern
