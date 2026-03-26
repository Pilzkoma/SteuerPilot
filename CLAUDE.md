# SteuerPilot

> Entwicklung via Claude Code (Vibe Coding) — der Entwickler schreibt keinen Code selbst.

---

## Deine Arbeitsweise

**Fragen vor Code.** Immer.

Bevor du irgendetwas implementierst:
1. Verstehe den vollständigen Scope — frage wenn unklar
2. Lies bestehende Dateien bevor du neue erstellst
3. Stelle deinen Plan vor und warte auf Bestätigung
4. Implementiere eine Sache, dann teste, dann weiter
5. Trage neue Erkenntnisse unten in "Project-Specific Notes" ein

Wenn du merkst dass eine Entscheidung Langzeitkonsequenzen hat — sag es.
Du darfst und sollst mitdenken, nicht nur ausführen.

---

## Team-Workflow

Dieses Projekt wird im Team entwickelt:
- **CEO** — bringt Ideen und Entscheidungen
- **Supervisor (Claude.ai)** — übersetzt Ideen in Aufgaben, reviewed Output, hält Architektur im Blick
- **Programmierer (Claude Code)** — implementiert, fragt bei Unklarheiten, dokumentiert

Wenn du eine Aufgabe bekommst die aus diesem Chat kommt:
Sie wurde bereits mit dem CEO besprochen und architektonisch durchdacht.
Trotzdem gilt: Fragen bei Unklarheiten, Plan vorstellen, dann bauen.

---

## Logbuch

Führe ein Logbuch unter `docs/LOGBUCH.md`.

Nach jeder abgeschlossenen Session oder jedem Feature trägst du ein:
- Datum + was wurde gebaut
- Welche Entscheidungen wurden getroffen und warum
- Probleme und wie sie gelöst wurden
- Offene Punkte / nächste Schritte

Das Logbuch ist für den CEO — kein technisches Kauderwelsch, klare Sprache.

---

## GitHub

Das Projekt wird auf GitHub gesichert. `.gitignore` muss als **allererstes** erstellt
werden — vor dem ersten Commit, vor allem anderen. CEO zeigt es zur Bestätigung.

**Niemals auf GitHub:**
- Datenbankdateien (`*.db`, `*.sqlite`, `*.db-shm`, `*.db-wal`)
- Umgebungsvariablen (`.env`, `.env.local`, `.env.*`)
- API-Keys, Tokens, Passwörter — in keiner Datei, nirgends
- Persönliche Steuerdaten, Belege, Scan-Uploads
- Belegbilder (`/uploads/`, `/belege/`, `/scans/`)
- Jetson-Konfiguration mit echten IPs oder Tokens
- Zertifikate (`*.p12`, `*.mobileprovision`, `*.cer`)
- `node_modules/`, `.build/`, `dist/`, `out/`, `.next/`

**Immer auf GitHub:**
- Kompletter Quellcode (Desktop + iOS + Jetson steuer-api)
- CLAUDE.md, Logbuch, Dokumentation
- `.env.example` mit Platzhaltern — nie echte Werte
- Tests

**Commits:** Nach jedem abgeschlossenen Feature.
Deutsch, kurz: `feat: Belegverwaltung mit Drag&Drop` / `fix: SQLCipher Init`

---

## Was wir bauen

Ein ganzjähriger Steuer- und Finanzassistent für Deutschland.
Zielgruppe: Angestellte, Freelancer, Selbstständige — alle Erfahrungsstufen.

**Kern-Versprechen:**
- Jedes Formularfeld wird in Plain Deutsch erklärt — kein Steuerjargon ohne Übersetzung
- Beleg fotografieren → Rest automatisch (OCR + KI-Analyse)
- Kontoauszug hochladen → App findet was absetzbar ist
- Vorjahresdaten helfen automatisch beim nächsten Jahr
- Daten gehören dem Nutzer — verschlüsselt, lokal, nie ungefragt in die Cloud

---

## Plattformen

- **Desktop:** Electron (Windows + macOS)
- **iOS:** Vollwertige SwiftUI App — gleichwertiger Funktionsumfang wie Desktop
- **KI-Backend:** Jetson im Heimnetz (Docker: Ollama/LLaVA + FastAPI)
- **Kommunikation iOS ↔ Desktop:** WLAN-Sync (beide DBs vollständig, automatisch)
- **Kommunikation Desktop ↔ Jetson:** HTTP, Token-gesichert, Heimnetz

## iOS — Vollständige App, nicht nur Companion

iOS ist eine gleichwertige Plattform, keine Ergänzung.

**iOS hat alles — außer CSV-Import.**
CSV macht auf Mobile keinen Sinn. Stattdessen: Screenshot von Kontoauszug
fotografieren → OCR + Jetson extrahieren die Transaktionen.

**Datenhaltung:** Eigene SQLCipher DB auf dem iPhone, vollständig offline nutzbar.
Kein Desktop muss laufen. Sync läuft automatisch wenn beide im gleichen WLAN sind.

**Sync-Strategie:** Last-Write-Wins mit Timestamp — ausreichend für Steuerdaten.
Konflikt-Erkennung: gleiche `id` + unterschiedlicher `zuletzt_geaendert` → neuerer gewinnt.

**iOS Screens (equivalent zu Desktop):**
- Dashboard (Jahresübersicht, Rückerstattungsschätzung, Deadlines)
- Dateneingabe Wizard (Schritt für Schritt, mit Erklärungen)
- Belegverwaltung + Kamera-Scan (OCR + Jetson)
- Umsatz-Dashboard (Charts, Ampel — Transaktionen per Foto statt CSV)
- Optimierungshinweise
- Jahresübernahme & Vergleich
- PDF-Export
- Einstellungen (Jetson-Verbindung, Passwort, Sync-Status)

---

## Nicht-verhandelbare Architektur-Entscheidungen

Diese Entscheidungen sind gesetzt — nicht diskutieren, nicht umgehen:

**Datenbank:** SQLCipher (`@journeyapps/sqlcipher`) — nicht plain SQLite.
Die DB ist mit dem Nutzerpasswort verschlüsselt. Das Passwort lebt nur im RAM,
wird nie gespeichert. Beim App-Start: Passwort eingeben → DB öffnen.
Grund: v2 wird Multi-User mit verschlüsseltem Sync — die Basis muss jetzt stimmen.

**Sync:** Beide Geräte (Desktop + iOS) haben je eine vollständige SQLCipher DB.
Sync läuft automatisch im WLAN. Last-Write-Wins mit `zuletzt_geaendert` Timestamp.
Kein Gerät ist Master — beide sind gleichwertig. Kein Gerät braucht das andere.

**Mehrjahresfähigkeit:** Jede DB-Tabelle die Steuerdaten enthält braucht eine `steuerjahr_id`.
Es gibt einen Jahres-Selektor der immer sichtbar ist. Kein Feature darf nur für ein Jahr funktionieren.

**Jetson-Fallback:** Jedes Feature das den Jetson nutzt muss ohne ihn funktionieren.
Wenn Jetson offline → graceful degradation, nie ein harter Fehler.

**IPC Security:** Electron contextBridge ist der einzige Weg vom Renderer zum Main Process.
Kein direktes ipcRenderer im Renderer, kein remote module.

**Engine:** Steuerberechnungen, CSV-Parsing, Kategorisierungslogik gehören in Pure-JS
Engine-Dateien ohne Electron-Abhängigkeit. Vollständig unit-testbar.

---

## Deutsche Steuer-Spezifika

Dinge die du wissen musst und nicht erraten kannst:

- Steuerjahr 2024: Grundfreibetrag 11.604€, Arbeitnehmer-Pauschbetrag 1.230€
- Steuerjahr 2025: Grundfreibetrag 12.096€, Arbeitnehmer-Pauschbetrag 1.230€
- Homeoffice-Pauschale: 6€/Tag, max. 210 Tage (= 1.260€/Jahr)
- Arbeitsmittel Freigrenze: 952€ — darunter keine Belege nötig
- Entfernungspauschale: 0,30€/km bis 20km, 0,38€/km ab 21km
- Abgabefrist ohne Steuerberater: 31. Oktober des Folgejahres
- Abgabefrist mit Steuerberater: 28. Februar (übernächstes Jahr)
- Deutsche Bank-CSVs: oft ISO-8859-1 kodiert (nicht UTF-8) — vor dem Parsen konvertieren
- Jede Bank hat ihr eigenes CSV-Format — die App muss das automatisch erkennen
- PayPal-Transaktionen im Bankkontoauszug zeigen nur "PayPal" als Empfänger —
  Kategorie: "Sonstige / Ungeklärt" als Standard. Optional kann der Nutzer seinen
  PayPal-CSV-Export hochladen — dann werden die echten Empfänger automatisch zugeordnet.
  Gleiches gilt für Klarna und andere Zahlungsdienste. Nie erzwingen, immer optional.
- Transaktionen ohne erkennbare Kategorie bekommen "Sonstige" — der Nutzer kann
  eigene Kategorien anlegen (z.B. eine dedizierte "PayPal"-Kategorie)

---

## ELSTER-Export (v1)

SteuerPilot übermittelt nicht direkt ans Finanzamt — das erfordert eine offizielle
ELSTER-Zertifizierung (v3-Thema). In v1 erstellt die App eine optimierte Zusammenfassung
die der Nutzer in ELSTER oder WISO überträgt.

**Der PDF-Export ist strukturiert nach ELSTER-Feldern:**
- Anlage N (Einkünfte aus nichtselbstständiger Arbeit)
- Anlage EÜR (Einnahmen-Überschuss-Rechnung, für Freelancer/Selbstständige)
- Anlage Vorsorgeaufwand (Versicherungen, Altersvorsorge)
- Werbungskosten aufgeschlüsselt (Fahrtkosten, Arbeitsmittel, Homeoffice, etc.)
- Sonderausgaben aufgeschlüsselt

Jede Zahl im Export hat eine Erklärung: "Diese Zahl trägst du in ELSTER unter
Anlage N, Zeile 31 ein." — der Nutzer soll nie raten müssen wo was hingehört.

---

## Design

**Tone:** Professional + Warm — wie ein ruhiger, erfahrener Steuerberater.
Beruhigend, nicht bürokratisch. Kompetent, nicht einschüchternd.

**Farben:**
- Primär: #1E3A5F (Dunkelblau)
- Akzent: #F5A623 (Warmgelb)
- Surface hell: #F8F9FA / dunkel: #1A1A2E
- Dark Mode ist Pflicht — beide Modi gleichwertig

Stitch Screens befinden sich im Ordner "Design".

---

## STRICTLY FORBIDDEN

```
NIEMALS  Code ohne bestätigten Plan schreiben
NIEMALS  DB ohne SQLCipher pragma key öffnen
NIEMALS  Passwort auf Disk speichern
NIEMALS  Steuerdaten ohne Nutzerzustimmung in die Cloud
NIEMALS  Jetson-Feature ohne Offline-Fallback bauen
NIEMALS  ipcRenderer direkt im Renderer verwenden
NIEMALS  Steuerlogik im Main Process (gehört in Engine)
NIEMALS  steuerjahr_id in einer Datentabelle vergessen
NIEMALS  Eingabefeld ohne Erklärungstext in Plain Deutsch
NIEMALS  Linear-Animationen — immer spring-basiert
NIEMALS  Hardcodierte Farben — immer Design Tokens
NIEMALS  Dark Mode auf einem Screen vergessen
NIEMALS  UIKit in der iOS App — nur SwiftUI
NIEMALS  iOS als "nur Companion" behandeln — vollwertige App
NIEMALS  Sync-Konflikt ohne Timestamp-Vergleich lösen
NIEMALS  Annehmen Desktop läuft wenn iOS etwas braucht
NIEMALS  CSV importieren ohne Vorschau + Bestätigung
NIEMALS  Scan-Server ohne Token-Validierung betreiben
```

---

## Project-Specific Notes

[Wird laufend von Claude Code ergänzt:]
- SQLCipher: nach npm install → electron-rebuild ausführenls ~/.claude/skills/
- electron-builder: macOS notarization braucht Apple Developer Account
- Belegbilder: JPEG 85% (Kompromiss Dateigröße vs. OCR-Qualität)
- Duplikat-Erkennung: gleicher Betrag + Datum ±7 Tage → Warnung anzeigen
- iOS App: unter /ios-app/ im gleichen Git-Repo (nicht "Companion" — vollwertige App)
- Framer Motion AnimatePresence: mode="wait" Pflicht bei Schritt-Slides
- Draft-Persistenz: wizard_fortschritt Tabelle als JSON — Wiederaufnahme beim Öffnen
- schaetzeRueckerstattung() gibt geschaetzteRueckerstattung zurück (nicht rueckerstattung)
- DashboardScreen: Math.abs() für Anzeige — Engine gibt positiv/negativ zurück
- Kategorie-Konstanten gesetzt: einnahmen ('lohn'|'honorar'|'sonstige'), ausgaben ('fahrtkosten'|'homeoffice'|'arbeitsmittel'|'krankenversicherung'|'altersvorsorge'|'spende'|'sonstige')
