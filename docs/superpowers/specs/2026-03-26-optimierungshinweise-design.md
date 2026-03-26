# Design: Optimierungshinweise

**Datum:** 2026-03-26
**Status:** Approved

---

## Überblick

Ein eigener Screen der den Nutzer darauf hinweist, welche Steuer-Abzüge er noch nicht eingetragen hat oder ausschöpfen könnte. Hinweise sind regelbasiert (Pure JS), mit Button zur direkten Navigation in den Wizard. Jetson/KI-Integration folgt später im gleichen Format.

---

## Architektur

### Engine: `src/engine/optimierung.js`

Pure-JS-Funktion, kein Electron, vollständig unit-testbar:

```js
berechneOptimierungshinweise(daten, nutzertyp, jahr)
```

**Parameter:**
- `daten` — Objekt mit den gleichen Feldern wie der Wizard-State: `{ lohn, fahrtkosten, homeoffice, arbeitsmittel, sonderausgaben, betriebsausgaben }`
- `nutzertyp` — `'angestellter' | 'freelancer' | 'selbstaendiger'`
- `jahr` — Steuerjahr als Zahl (z.B. 2025)

**Rückgabe:** Array von Hinweis-Objekten:

```js
{
  id: string,           // eindeutige ID, z.B. 'homeoffice_fehlt'
  titel: string,        // kurzer Titel, plain Deutsch
  beschreibung: string, // Erklärung ohne Steuerjargon
  potenzial: number | null,  // max. erreichbarer Betrag in €
  prioritaet: 'hoch' | 'mittel' | 'niedrig',
  wizardSchritt: string // z.B. 'homeoffice', 'arbeitsmittel'
}
```

**Geplante Hinweise:**

| ID | Bedingung | Priorität | Potenzial |
|----|-----------|-----------|-----------|
| `homeoffice_fehlt` | Homeoffice-Tage = 0 | hoch | 1.260 € |
| `arbeitsmittel_fehlt` | Arbeitsmittel-Array leer | mittel | null |
| `altersvorsorge_fehlt` | altersvorsorge = 0 | mittel | null |
| `krankenversicherung_fehlt` | krankenversicherung = 0 | hoch | null |
| `spenden_fehlt` | spenden = 0 | niedrig | null |
| `fahrtkosten_fehlt` | km = 0 AND arbeitstage = 0 (nur Angestellte) | hoch | null |
| `werbungskosten_pauschbetrag` | Werbungskosten > 0 aber < Pauschbetrag (1.230 €) | niedrig | Differenz |

---

## Screen: `src/screens/Optimierung/OptimierungScreen.jsx`

**Datenfluss:**
1. Screen lädt beim Mount die gespeicherten Steuerdaten aus der DB (gleiche Abfrage wie Wizard-Draft-Wiederaufnahme)
2. Ruft `berechneOptimierungshinweise()` auf
3. Rendert Ergebnis

**Layout:**
- Header: Titel "Optimierungshinweise" + Untertitel "Was du noch absetzen könntest"
- **Leer-State (keine Daten):** Hinweis "Gib zuerst deine Daten ein" + Button → Wizard
- **Hinweis-Karten** sortiert nach Priorität (hoch → mittel → niedrig):
  - Titel + Beschreibung
  - Potenzial-Badge ("bis zu X €") wenn `potenzial != null`
  - Button "Jetzt eintragen" → `onNavigate('wizard')`
- **Erfolgs-State (leeres Array):** "Alles optimiert — du nutzt alle relevanten Abzüge."

---

## Navigation

In `src/components/AppShell/AppShell.jsx`:
- Neuer Eintrag in `NAV_ITEMS` zwischen Umsatz und PDF Export
- `id: 'optimierung'`, `available: true`
- Neues Icon (Glühbirne o.ä.)

In `src/App.jsx`:
- Import + Rendering von `OptimierungScreen` bei `activeNav === 'optimierung'`

---

## Was nicht in Scope ist

- Jetson/KI-Integration (folgt später)
- Deep-Link in spezifischen Wizard-Schritt (Wizard öffnet immer von vorne)
- Persistierung von "gesehen"- oder "erledigt"-Status pro Hinweis
