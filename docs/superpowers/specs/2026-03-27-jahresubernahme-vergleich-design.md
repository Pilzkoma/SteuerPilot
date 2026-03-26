# Design: Jahresübernahme & Jahresvergleich

**Datum:** 2026-03-27
**Status:** Approved

---

## Überblick

Zwei zusammenhängende Features:

1. **Jahresübernahme** — Stammdaten und Wizard-Draft aus dem Vorjahr als Ausgangspunkt für ein neues Steuerjahr übernehmen
2. **Jahresvergleich** — Steuerdaten mehrerer Jahre nebeneinander visualisieren (Dashboard-Widget + eigener Screen)

---

## Architektur (Ansatz C)

Drei getrennte Verantwortlichkeiten:

| Einheit | Aufgabe |
|---|---|
| `src/engine/jahresubernahme.js` | Pure-JS-Logik: was wird kopiert, was nicht |
| `AppShell` | Erkennt neues Jahr ohne Daten → zeigt `JahresübernahmeModal` |
| `WizardScreen` | Manueller "Vom Vorjahr übernehmen"-Button |
| `DashboardScreen` | `JahresvergleichWidget` — kompakter Vorjahresvergleich |
| `JahresvergleichScreen` | Eigener Screen mit Balkendiagrammen + Tabelle |

---

## Teil 1: Engine (`src/engine/jahresubernahme.js`)

Pure JS, kein Electron, vollständig unit-testbar.

### `bereiteDatenFuerNeuesJahr(quelljahrDaten)`

**Eingabe:**
```js
{
  nutzer: { vorname, nachname, steuer_id, finanzamt, steuernummer, geburtsdatum, iban, nutzertyp },
  wizardDraft: { daten }  // JSON aus wizard_fortschritt
}
```

**Ausgabe:**
```js
{
  nutzerprofil: { ... },   // identisch mit Eingabe
  wizardDraft: {
    daten: "...",          // JSON-String aus Vorjahr
    schritt: 0,            // immer zurücksetzen
    abgeschlossen: 0
  }
}
```

**Kopiert:**
- Alle `nutzer`-Felder (Stammdaten)
- `wizard_fortschritt.daten` als JSON-Vorlage

**Kopiert nicht:**
- `einnahmen`, `ausgaben`, `belege`, `transaktionen` — jahresspezifische Steuerdaten
- `wizard_fortschritt.schritt` — immer 0 (neues Jahr = von vorne)
- `wizard_fortschritt.abgeschlossen` — immer 0

---

## Teil 2: Übernahme-Flow

### Automatischer Dialog (AppShell)

**Trigger:** Beim Jahreswechsel oder App-Start — AppShell prüft ob das aktive Jahr Daten hat:
```sql
SELECT COUNT(*) FROM einnahmen WHERE steuerjahr_id = ?
UNION ALL
SELECT COUNT(*) FROM wizard_fortschritt WHERE steuerjahr_id = ?
```

Wenn leer **und** ein Vorjahr mit Daten existiert → `JahresübernahmeModal` anzeigen.

**Modal-Inhalt:**
- Titel: "Daten aus {vorjahr} übernehmen?"
- Liste: "Was wird übernommen: Nutzerprofil, Wizard-Vorausfüllung"
- Buttons: **Übernehmen** (primary) / **Leer starten** (ghost)

Bei "Übernehmen": Engine → IPC → DB → Modal schließen → AppShell neu laden.

### Manueller Button (WizardScreen)

Erscheint im WizardScreen-Header, **nur wenn:**
- Aktuelles Jahr hat keinen abgeschlossenen Wizard (`abgeschlossen = 0` oder kein Eintrag)
- Ein Vorjahr mit Daten existiert

Öffnet dasselbe `JahresübernahmeModal` — keine doppelte UI.

### Neues Jahr anlegen

**Automatisch:** Beim App-Start prüft AppShell ob das aktuelle Kalenderjahr in `steuerjahre` fehlt → `INSERT OR IGNORE` mit bekannten Werten (aus Engine-JAHRESWERTE) oder Fallback auf Vorjahreswerte.

**Manuell:** "+" Button im JahrSelector — öffnet eine Auswahlliste nicht-existierender Jahre (aktuelle Jahr - 10 bis aktuelles Jahr). Kein freies Texteingabefeld.

### Jahr löschen

**Geste:** Horizontaler Swipe (Mausdrag nach links) auf einem Jahr-Eintrag im JahrSelector-Dropdown → roter "Löschen"-Bereich erscheint rechts → Loslassen → Sicherheitsdialog.

**Dialog:** "Jahr {jahr} und alle zugehörigen Daten unwiderruflich löschen?" — Bestätigen / Abbrechen

**Was gelöscht wird:** Alle Zeilen mit `steuerjahr_id = id` in `einnahmen`, `ausgaben`, `belege`, `transaktionen`, `wizard_fortschritt`, dann der Eintrag in `steuerjahre`.

**Einschränkung:** Das aktiv ausgewählte Jahr kann nicht gelöscht werden (Swipe deaktiviert).

---

## Teil 3: Jahresvergleich

### Dashboard-Widget (`JahresvergleichWidget`)

Position: Unterhalb der bestehenden Metriken-Reihe im Dashboard.

**Inhalt:**
- Vorjahr vs. aktuelles Jahr nebeneinander
- Metriken: Einnahmen, Werbungskosten, geschätzte Rückerstattung
- Δ-Wert in Prozent (z.B. "+12 % Einnahmen")
- Klick auf Widget → navigiert zu Jahresvergleich-Screen

**Sichtbarkeit:** Nur wenn mindestens 2 Jahre mit Daten in der DB existieren.

### Jahresvergleich-Screen

**Navigation:** Neuer Eintrag in der Sidebar zwischen "Optimierungshinweise" und "PDF Export", `available: true`.

**Inhalt:**

1. **Balkendiagramme** — SVG, selbst gezeichnet (kein Charting-Framework). Pro Metrik (Einnahmen, Werbungskosten, Rückerstattung) ein Diagramm mit einem Balken pro Jahr.

2. **Vergleichstabelle** — alle Jahre als Spalten, Metriken als Zeilen:

| | 2024 | 2025 |
|---|---|---|
| Einnahmen | X € | Y € |
| Werbungskosten | X € | Y € |
| Belege | n | n |
| Rückerstattung (Schätzung) | X € | Y € |

3. **Jahr-Pills** — oben, zum Ein-/Ausblenden einzelner Jahre aus den Diagrammen.

**Datenquelle:** Aggregierte Abfragen pro `steuerjahr_id` — gleiche SQL wie Dashboard-Metriken, aber für alle Jahre auf einmal.

**Diagramme:** SVG-Balken ohne externe Bibliothek — konsistent mit bestehendem UmsatzScreen-Stil.

---

## IPC-Handler (neue Methoden in `electron/main.js`)

| Handler | Zweck |
|---|---|
| `jahresubernahme:pruefen` | Gibt zurück ob Übernahme angeboten werden soll |
| `jahresubernahme:ausfuehren` | Kopiert Daten aus Quell- ins Zieljahr |
| `steuerjahr:anlegen` | Legt neues Jahr in DB an |
| `steuerjahr:loeschen` | Löscht Jahr + alle verknüpften Daten |
| `vergleich:laden` | Lädt aggregierte Metriken für alle Jahre |

---

## Was nicht gebaut wird (v1)

- Übernahme von `einnahmen`/`ausgaben`/`belege` — nur Stammdaten + Wizard-Draft
- Konfliktlösung bei mehreren möglichen Quell-Jahren — immer das direkte Vorjahr
- Diagramme mit externer Bibliothek — SVG reicht für v1
