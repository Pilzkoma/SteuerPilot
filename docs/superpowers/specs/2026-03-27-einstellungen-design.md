# Einstellungen Screen — Design Spec

**Datum:** 2026-03-27
**Status:** Approved

---

## Ziel

Ein Einstellungen-Screen mit drei unabhängigen Bereichen: Passwort ändern, Jetson-Verbindung konfigurieren und Sync-Platzhalter für die spätere iOS-Integration.

---

## Architektur

**Screen:** `src/screens/Einstellungen/EinstellungenScreen.jsx` — single scrollable page, keine Tabs, keine eigene Sub-Navigation.

**Datenhaltung:**
- Jetson-URL + Token → `einstellungen`-Tabelle, Schlüssel `jetson_url` / `jetson_token`
- Passwort → nie auf Disk; nur RAM → `PRAGMA rekey`
- Sync → kein State, reiner Platzhalter

**Neue IPC-Handler (`electron/main.js`):**

| Handler | Beschreibung |
|---|---|
| `einstellungen:get` | Gibt alle Einstellungs-Schlüssel als `{ schluessel: wert }` zurück |
| `einstellungen:set` | Schreibt einen Schlüssel: `{ schluessel, wert }` → `INSERT OR REPLACE` |
| `db:rekey` | Führt `PRAGMA rekey = '...'` aus, gibt `{ ok }` zurück |
| `jetson:test` | GET `{url}/api/tags` mit `Authorization: Bearer {token}`, gibt `{ ok, modelle: string[] }` zurück |

**Preload-Bridge (`electron/preload/index.js`):**
- `window.steuerpilot.einstellungen.get()` → `einstellungen:get`
- `window.steuerpilot.einstellungen.set(schluessel, wert)` → `einstellungen:set`
- `window.steuerpilot.db.rekey(neuesPasswort)` → `db:rekey`
- `window.steuerpilot.jetson.test(url, token)` → `jetson:test`

---

## UI — Drei Sections

### Section 1: Passwort ändern

- Ein Passwort-Input (type=password, toggle-Icon zum Ein-/Ausblenden)
- Button "Passwort ändern"
- Nach Klick: `db:rekey(neuesPasswort)` aufrufen
- Erfolg: grüne Inline-Meldung "Passwort wurde geändert" — verschwindet nach 3s via AnimatePresence
- Fehler: rote Inline-Meldung unter dem Feld
- Feld wird nach Erfolg geleert

### Section 2: Jetson-Verbindung

- URL-Input (type=text, Placeholder: `http://192.168.1.100:11434`)
- Token-Input (type=password, toggle-Icon)
- Button "Speichern" → schreibt URL + Token via `einstellungen:set` in DB (unabhängig vom Test)
- Button "Verbindung testen" → ruft `jetson:test(url, token)` auf
  - Während des Tests: Spinner im Button
  - Erfolg: grüne Badge mit kommaseparierten Modell-Namen (z.B. `llava:13b, mistral:7b`)
  - Fehler: rote Badge mit kurzem Fehlergrund (Timeout, 401 Unauthorized, etc.)
- Beim Screen-Load: gespeicherte URL + Token aus `einstellungen:get` vorladen

### Section 3: Sync (Platzhalter)

- Card mit Lock/Sync-Icon
- Titel: "iOS-Synchronisation"
- Text: "Wird mit der iOS-App aktiviert. Beide Geräte synchronisieren automatisch im selben WLAN."
- Dezenter "Bald"-Badge (gleicher Stil wie im Sidebar-Nav)
- Kein Button, kein IPC, kein State

---

## Navigation

- `AppShell.jsx`: `einstellungen`-Eintrag in `BOTTOM_ITEMS` von `available: false` auf `available: true` setzen
- `App.jsx`: `EinstellungenScreen` importieren und für `activeNav === 'einstellungen'` einbinden

---

## Design-Token-Verwendung

- Cards: `var(--color-surface-container)`, `var(--radius-xl)`, padding `1.5rem`
- Success-Badge: `var(--color-tertiary)` oder grüner Akzent via inline rgba
- Error-Badge: `var(--color-error)`
- Spinner: einfache CSS-Rotation-Animation
- Alle Animationen: `springGentle` aus `../../theme/tokens.js`
- Keine hardcodierten Farben

---

## Fehlerbehandlung

- `db:rekey` Fehler: Meldung unter dem Passwort-Feld, Feld nicht leeren
- `jetson:test` Netzwerkfehler / Timeout: Badge mit "Nicht erreichbar"
- `jetson:test` 401: Badge mit "Ungültiger Token"
- `einstellungen:set` Fehler: Console-Error, kein UI-Crash

---

## Testing

- Kein Unit-Test nötig (keine Engine-Logik)
- Manuelle Tests: Passwort ändern + App neu starten + altes Passwort schlägt fehl, neues funktioniert; Jetson-Test mit echter URL; Einstellungen-Seite nach Reload mit vorgeladenen Werten

---

## Out of Scope

- Sync-Implementierung (kommt mit iOS-App)
- Sprache / Theme-Einstellungen
- Export/Import der DB
