# Umsatz-Dashboard (Phase 7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Umsatz-Dashboard screen with CSV bank statement import, auto-categorization, transaction list with inline editing, monthly bar charts, category donut chart, and a traffic-light summary.

**Architecture:** A pure-JS CSV parser engine handles bank format detection and normalization (no third-party CSV library). A separate categorization engine maps transaction text to Steuer-Kategorien via regex rules. The Electron main process handles file reading (encoding conversion ISO-8859-1 → string) via IPC; all parsing and categorization happens in the renderer. Transactions are stored in a new `transaktionen` DB table.

**Tech Stack:** Vitest (tests), Recharts (charts, already installed), Framer Motion (animations, already installed), SQLCipher (existing), electron-vite.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/engine/csvParser.js` | Create | Bank detection, CSV parsing, normalization to `{ datum, betrag, empfaenger, verwendungszweck }` |
| `src/engine/csvParser.test.js` | Create | Vitest tests for all csvParser functions |
| `src/engine/kategorisierung.js` | Create | Keyword-based auto-categorization → `{ kategorie, abzugsfaehig }` |
| `src/engine/kategorisierung.test.js` | Create | Vitest tests for kategorisierung |
| `electron/db.js` | Modify | Add `transaktionen` table to `createSchema()` |
| `electron/main.js` | Modify | Add IPC handlers: `csv:read-file`, `transaktionen:load`, `transaktionen:save-batch`, `transaktionen:update`, `transaktionen:delete` |
| `electron/preload/index.js` | Modify | Expose `window.steuerpilot.csv` and `window.steuerpilot.transaktionen` |
| `src/screens/Umsatz/UmsatzScreen.jsx` | Create | Main container: state management, data loading, screen layout |
| `src/screens/Umsatz/CsvImportFlow.jsx` | Create | Import wizard: drag-drop → bank preview → confirm |
| `src/screens/Umsatz/TransaktionListe.jsx` | Create | Scrollable table with inline category/absetzbar editing |
| `src/screens/Umsatz/UmsatzCharts.jsx` | Create | Monthly BarChart + category PieChart via Recharts |
| `src/screens/Umsatz/Ampel.jsx` | Create | Traffic-light summary cards |
| `src/components/AppShell/AppShell.jsx` | Modify | Set `umsatz` nav item `available: true` |
| `src/App.jsx` | Modify | Add `UmsatzScreen` route for `activeNav === 'umsatz'` |

---

## Task 1: DB Schema — `transaktionen` table

**Files:**
- Modify: `electron/db.js` (inside `createSchema`, before the final `resolve()`)

- [ ] **Step 1: Add `transaktionen` table to `createSchema()`**

In `electron/db.js`, after the `wizard_fortschritt` table creation and before the `einstellungen` table creation, add:

```js
      database.run(`
        CREATE TABLE IF NOT EXISTS transaktionen (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          steuerjahr_id     INTEGER NOT NULL REFERENCES steuerjahre(id),
          datum             TEXT NOT NULL,
          betrag            REAL NOT NULL,
          typ               TEXT NOT NULL DEFAULT 'ausgabe',
          empfaenger        TEXT,
          verwendungszweck  TEXT,
          kategorie         TEXT NOT NULL DEFAULT 'sonstige',
          abzugsfaehig      INTEGER NOT NULL DEFAULT 0,
          notiz             TEXT,
          bank              TEXT,
          erstellt_am       TEXT NOT NULL DEFAULT (datetime('now')),
          zuletzt_geaendert TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: `✓ build` with no errors. The `transaktionen` table is created automatically on next DB open (CREATE IF NOT EXISTS).

- [ ] **Step 3: Commit**

```bash
git add electron/db.js
git commit -m "feat: add transaktionen table to schema"
```

---

## Task 2: csvParser engine — failing tests first

**Files:**
- Create: `src/engine/csvParser.test.js`
- Create: `src/engine/csvParser.js`

- [ ] **Step 1: Write failing tests**

Create `src/engine/csvParser.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { detectBank, parseAmount, parseDate, parseCsvLine, normalizeCsv } from './csvParser.js'

describe('detectBank', () => {
  it('erkennt Deutsche Bank', () => {
    const header = '"Buchungstag";"Wertstellung";"Auftragsart";"Begünstigter / Auftraggeber";"Kontonummer";"BIC";"Betrag"'
    expect(detectBank(header)).toBe('deutsche_bank')
  })

  it('erkennt Sparkasse', () => {
    const header = '"Auftragskonto";"Buchungstag";"Valutadatum";"Auftraggeber/Zahlungsempfänger";"Empfänger/Zahlungspflichtiger"'
    expect(detectBank(header)).toBe('sparkasse')
  })

  it('erkennt ING', () => {
    const header = 'Buchung;Valuta;Auftraggeber/Empfänger;Buchungstext;Verwendungszweck;Saldo;Währung;Betrag'
    expect(detectBank(header)).toBe('ing')
  })

  it('erkennt N26', () => {
    const header = '"Datum","Empfänger","Kontonummer","Transaktionstyp","Verwendungszweck","Kategorie","Betrag (EUR)"'
    expect(detectBank(header)).toBe('n26')
  })

  it('gibt unbekannt zurück für unbekannte Formate', () => {
    expect(detectBank('Datum;Betrag;Name')).toBe('unbekannt')
  })
})

describe('parseAmount', () => {
  it('parsed deutschen Betrag (Komma als Dezimaltrenner)', () => {
    expect(parseAmount('"-89,50"', 'deutsche_bank')).toBe(-89.5)
  })

  it('parsed deutschen Betrag ohne Anführungszeichen', () => {
    expect(parseAmount('-89,50', 'sparkasse')).toBe(-89.5)
  })

  it('parsed deutschen Betrag mit Tausenderpunkt', () => {
    expect(parseAmount('"1.234,56"', 'ing')).toBe(1234.56)
  })

  it('parsed N26-Betrag (Punkt als Dezimaltrenner)', () => {
    expect(parseAmount('"-89.50"', 'n26')).toBe(-89.5)
  })

  it('gibt 0 zurück für leere Felder', () => {
    expect(parseAmount('', 'deutsche_bank')).toBe(0)
    expect(parseAmount('""', 'sparkasse')).toBe(0)
  })
})

describe('parseDate', () => {
  it('konvertiert deutsches Datum (DD.MM.YYYY) zu ISO', () => {
    expect(parseDate('"26.11.2024"', 'deutsche_bank')).toBe('2024-11-26')
  })

  it('behält ISO-Datum (N26) unverändert', () => {
    expect(parseDate('"2024-11-26"', 'n26')).toBe('2024-11-26')
  })

  it('füllt einstellige Tage und Monate mit führender Null auf', () => {
    expect(parseDate('7.1.2025', 'sparkasse')).toBe('2025-01-07')
  })
})

describe('parseCsvLine', () => {
  it('splittet Semikolon-getrennte Felder', () => {
    expect(parseCsvLine('a;b;c', ';')).toEqual(['a', 'b', 'c'])
  })

  it('splittet Komma-getrennte Felder', () => {
    expect(parseCsvLine('a,b,c', ',')).toEqual(['a', 'b', 'c'])
  })

  it('behandelt gequotete Felder korrekt', () => {
    expect(parseCsvLine('"Muster GmbH";"89,50";"Lastschrift"', ';')).toEqual([
      'Muster GmbH', '89,50', 'Lastschrift'
    ])
  })

  it('behandelt Semikolon innerhalb von Anführungszeichen', () => {
    expect(parseCsvLine('"Name; mit Semikolon";"100,00"', ';')).toEqual([
      'Name; mit Semikolon', '100,00'
    ])
  })
})

describe('normalizeCsv', () => {
  it('normalisiert Deutsche Bank CSV zu Transaktionen', () => {
    const content = [
      '"Buchungstag";"Wertstellung";"Auftragsart";"Begünstigter / Auftraggeber";"Kontonummer";"BIC";"Betrag";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz"',
      '"26.11.2024";"26.11.2024";"Lastschrift";"REWE Markt GmbH";"DE27200400600959050300";"COBADEFFXXX";"-89,50";"";"";"";'
    ].join('\n')
    const result = normalizeCsv(content, 'deutsche_bank')
    expect(result).toHaveLength(1)
    expect(result[0].datum).toBe('2024-11-26')
    expect(result[0].betrag).toBe(-89.5)
    expect(result[0].empfaenger).toBe('REWE Markt GmbH')
  })

  it('ignoriert leere Zeilen', () => {
    const content = [
      '"Buchungstag";"Wertstellung";"Auftragsart";"Begünstigter / Auftraggeber";"Kontonummer";"BIC";"Betrag";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz"',
      '',
      '"26.11.2024";"26.11.2024";"Lastschrift";"REWE Markt GmbH";"DE27200400600959050300";"COBADEFFXXX";"-89,50";"";"";"";',
      ''
    ].join('\n')
    const result = normalizeCsv(content, 'deutsche_bank')
    expect(result).toHaveLength(1)
  })

  it('normalisiert N26 CSV (Komma-Separator, ISO-Datum)', () => {
    const content = [
      '"Datum","Empfänger","Kontonummer","Transaktionstyp","Verwendungszweck","Kategorie","Betrag (EUR)","Betrag (Fremdwährung)","Fremdwährung","Wechselkurs"',
      '"2024-11-26","REWE Markt GmbH","DE27200400600959050300","Outgoing Transfer","REWE Einkauf","Groceries","-89.50","","",""'
    ].join('\n')
    const result = normalizeCsv(content, 'n26')
    expect(result).toHaveLength(1)
    expect(result[0].datum).toBe('2024-11-26')
    expect(result[0].betrag).toBe(-89.5)
    expect(result[0].empfaenger).toBe('REWE Markt GmbH')
    expect(result[0].verwendungszweck).toBe('REWE Einkauf')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- --reporter=verbose src/engine/csvParser.test.js
```

Expected: All tests FAIL with "Cannot find module './csvParser.js'"

- [ ] **Step 3: Implement `src/engine/csvParser.js`**

```js
/**
 * SteuerPilot CSV Parser Engine
 *
 * Kein Electron. Kein Node. Pure JS — vollständig unit-testbar.
 * Unterstützte Banken: Deutsche Bank, Sparkasse, ING, N26
 */

const BANK_CONFIG = {
  deutsche_bank: {
    separator: ';',
    datumIndex: 0,
    empfaengerIndex: 3,
    verwendungszweckIndex: null,
    betragIndex: 6
  },
  sparkasse: {
    separator: ';',
    datumIndex: 1,
    empfaengerIndex: 3,
    verwendungszweckIndex: null,
    betragIndex: 13
  },
  ing: {
    separator: ';',
    datumIndex: 0,
    empfaengerIndex: 2,
    verwendungszweckIndex: 4,
    betragIndex: 7
  },
  n26: {
    separator: ',',
    datumIndex: 0,
    empfaengerIndex: 1,
    verwendungszweckIndex: 4,
    betragIndex: 6
  }
}

/**
 * Erkennt die Bank anhand der Kopfzeile.
 * @param {string} firstLine - Erste Zeile der CSV-Datei
 * @returns {'deutsche_bank'|'sparkasse'|'ing'|'n26'|'unbekannt'}
 */
export function detectBank(firstLine) {
  if (firstLine.includes('Begünstigter / Auftraggeber')) return 'deutsche_bank'
  if (firstLine.includes('Auftragskonto') && firstLine.includes('Auftraggeber/Zahlungsempfänger')) return 'sparkasse'
  if (firstLine.includes('Auftraggeber/Empfänger') && firstLine.includes('Buchungstext')) return 'ing'
  if (firstLine.includes('Betrag (EUR)') || (firstLine.includes('Transaktionstyp') && firstLine.includes('Empfänger'))) return 'n26'
  return 'unbekannt'
}

/**
 * Parsed einen Geldbetrag aus einem CSV-Feld.
 * Deutsche Banken: "1.234,56" → Komma als Dezimaltrenner, Punkt als Tausender.
 * N26: "1234.56" → Punkt als Dezimaltrenner.
 * @param {string} raw
 * @param {string} bank
 * @returns {number}
 */
export function parseAmount(raw, bank) {
  if (!raw || raw.trim() === '' || raw.trim() === '""') return 0
  const cleaned = raw.replace(/"/g, '').trim()
  if (!cleaned || cleaned === '') return 0
  if (bank === 'n26') return parseFloat(cleaned)
  return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
}

/**
 * Konvertiert ein Datum aus CSV-Format zu ISO 8601 (YYYY-MM-DD).
 * Deutsche Banken: "26.11.2024" → "2024-11-26"
 * N26: "2024-11-26" → unveränderter Rückgabe
 * @param {string} raw
 * @param {string} bank
 * @returns {string}
 */
export function parseDate(raw, bank) {
  const cleaned = raw.replace(/"/g, '').trim()
  if (bank === 'n26') return cleaned
  const parts = cleaned.split('.')
  if (parts.length !== 3) return cleaned
  const [d, m, y] = parts
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/**
 * Splittet eine CSV-Zeile in Felder auf.
 * Respektiert Anführungszeichen — Separator innerhalb von Quotes wird ignoriert.
 * @param {string} line
 * @param {string} separator
 * @returns {string[]}
 */
export function parseCsvLine(line, separator) {
  const result = []
  let field = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuote = !inQuote
    } else if (ch === separator && !inQuote) {
      result.push(field)
      field = ''
    } else {
      field += ch
    }
  }
  result.push(field)
  return result
}

/**
 * Normalisiert CSV-Inhalt einer Bank zu einem Array von Transaktionen.
 * @param {string} content - Vollständiger CSV-Inhalt als String
 * @param {string} bank - Bank-Kennung (von detectBank())
 * @returns {Array<{datum: string, betrag: number, empfaenger: string, verwendungszweck: string}>}
 */
export function normalizeCsv(content, bank) {
  const config = BANK_CONFIG[bank] ?? BANK_CONFIG.deutsche_bank
  const { separator, datumIndex, empfaengerIndex, verwendungszweckIndex, betragIndex } = config

  const lines = content.split('\n')
  // Kopfzeile überspringen: erste Zeile die die Bank-Marker enthält
  const headerIdx = lines.findIndex(l => detectBank(l) === bank)
  const dataLines = lines.slice(headerIdx + 1).filter(l => l.trim() !== '')

  return dataLines.map(line => {
    const cols = parseCsvLine(line, separator)
    if (cols.length < betragIndex + 1) return null
    const betrag = parseAmount(cols[betragIndex], bank)
    if (betrag === 0 && !cols[empfaengerIndex]) return null
    return {
      datum: parseDate(cols[datumIndex] ?? '', bank),
      betrag,
      empfaenger: (cols[empfaengerIndex] ?? '').replace(/"/g, '').trim(),
      verwendungszweck: verwendungszweckIndex !== null
        ? (cols[verwendungszweckIndex] ?? '').replace(/"/g, '').trim()
        : ''
    }
  }).filter(t => t !== null)
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- --reporter=verbose src/engine/csvParser.test.js
```

Expected: All 14 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/csvParser.js src/engine/csvParser.test.js
git commit -m "feat: CSV parser engine with bank detection and normalization"
```

---

## Task 3: kategorisierung engine — failing tests first

**Files:**
- Create: `src/engine/kategorisierung.test.js`
- Create: `src/engine/kategorisierung.js`

- [ ] **Step 1: Write failing tests**

Create `src/engine/kategorisierung.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { kategorisiereTransaktion } from './kategorisierung.js'

describe('kategorisiereTransaktion', () => {
  it('erkennt Fahrtkosten (Deutsche Bahn)', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'DB FERNVERKEHR AG', verwendungszweck: '' })
    expect(result.kategorie).toBe('fahrtkosten')
    expect(result.abzugsfaehig).toBe(1)
  })

  it('erkennt Fahrtkosten (Flixbus)', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'FlixBus GmbH', verwendungszweck: 'Ticket München' })
    expect(result.kategorie).toBe('fahrtkosten')
    expect(result.abzugsfaehig).toBe(1)
  })

  it('erkennt Arbeitsmittel (Amazon)', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'Amazon Payments', verwendungszweck: 'Bestellung' })
    expect(result.kategorie).toBe('arbeitsmittel')
    expect(result.abzugsfaehig).toBe(1)
  })

  it('erkennt Krankenversicherung (TK)', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'Techniker Krankenkasse', verwendungszweck: 'Beitrag' })
    expect(result.kategorie).toBe('krankenversicherung')
    expect(result.abzugsfaehig).toBe(1)
  })

  it('erkennt Altersvorsorge', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'Deutsche Rentenversicherung Bund', verwendungszweck: '' })
    expect(result.kategorie).toBe('altersvorsorge')
    expect(result.abzugsfaehig).toBe(1)
  })

  it('erkennt Spende', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'UNICEF Deutschland', verwendungszweck: 'Spende' })
    expect(result.kategorie).toBe('spende')
    expect(result.abzugsfaehig).toBe(1)
  })

  it('kategorisiert PayPal als sonstige (Ungeklärt)', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'PayPal (Europe) S.a.r.l.', verwendungszweck: '' })
    expect(result.kategorie).toBe('sonstige')
    expect(result.abzugsfaehig).toBe(0)
  })

  it('kategorisiert unbekannte Transaktionen als sonstige', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'Irgendein Laden GmbH', verwendungszweck: 'Kauf' })
    expect(result.kategorie).toBe('sonstige')
    expect(result.abzugsfaehig).toBe(0)
  })

  it('sucht auch im Verwendungszweck', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'Mustermann Bank', verwendungszweck: 'Fahrkarte Deutsche Bahn München Berlin' })
    expect(result.kategorie).toBe('fahrtkosten')
  })

  it('gibt sonstige zurück für leere Eingabe', () => {
    const result = kategorisiereTransaktion({ empfaenger: '', verwendungszweck: '' })
    expect(result.kategorie).toBe('sonstige')
    expect(result.abzugsfaehig).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- --reporter=verbose src/engine/kategorisierung.test.js
```

Expected: All tests FAIL with "Cannot find module './kategorisierung.js'"

- [ ] **Step 3: Implement `src/engine/kategorisierung.js`**

```js
/**
 * SteuerPilot Kategorisierungs-Engine
 *
 * Kein Electron. Kein Node. Pure JS — vollständig unit-testbar.
 * Kategorisiert Transaktionen anhand von Empfänger + Verwendungszweck.
 */

const REGELN = [
  {
    pattern: /deutsche bahn|db fernverkehr|db bahn|flixbus|fernbus|lufthansa|ryanair|easyjet|condor|eurowings|wizz air|uber|cabify|taxi|mvv|bvg|hvv|vrs|rmv|vvs|kvb|s-bahn|nahverkehr|üstra|ssb |haltestellenticket/i,
    kategorie: 'fahrtkosten',
    abzugsfaehig: 1
  },
  {
    pattern: /amazon|mediamarkt|media markt|saturn |otto\.|cyberport|notebooksbilliger|alternate|conrad |reichelt|apple store|apple\.com|microsoft|adobe|jetbrains|logitech|cherry|wacom|epson|brother|lenovo|dell|hp inc|hewlett|corsair/i,
    kategorie: 'arbeitsmittel',
    abzugsfaehig: 1
  },
  {
    pattern: /techniker krankenkasse|\btk\b|barmer|\baok\b|\bdak\b|\bikk\b|\bbkk\b|hkk|knappschaft|signal iduna|allianz leben|debeka|mecklenburgische|continentale|hanse merkur|krankenkasse beitrag/i,
    kategorie: 'krankenversicherung',
    abzugsfaehig: 1
  },
  {
    pattern: /rentenversicherung|\bdrv\b|riester|rürup|pensionskasse|betriebsrente|\bvbl\b|zurich leben|swiss life|stuttgarter leben|allianz rente/i,
    kategorie: 'altersvorsorge',
    abzugsfaehig: 1
  },
  {
    pattern: /spende|donation|caritas|diakonie|rotes kreuz|deutsches rotes kreuz|unicef|greenpeace|\bwwf\b|amnesty|misereor|brot für die welt|kindernothilfe|ärzte ohne grenzen/i,
    kategorie: 'spende',
    abzugsfaehig: 1
  },
  {
    pattern: /paypal|klarna|sofort\.|giropay|paydirekt/i,
    kategorie: 'sonstige',
    abzugsfaehig: 0
  }
]

/**
 * Kategorisiert eine Transaktion anhand von Empfänger und Verwendungszweck.
 * Gibt immer eine Kategorie zurück — im Zweifel 'sonstige'.
 *
 * @param {{ empfaenger?: string, verwendungszweck?: string }} param0
 * @returns {{ kategorie: string, abzugsfaehig: number }}
 */
export function kategorisiereTransaktion({ empfaenger = '', verwendungszweck = '' }) {
  const suchtext = `${empfaenger} ${verwendungszweck}`
  for (const regel of REGELN) {
    if (regel.pattern.test(suchtext)) {
      return { kategorie: regel.kategorie, abzugsfaehig: regel.abzugsfaehig }
    }
  }
  return { kategorie: 'sonstige', abzugsfaehig: 0 }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- --reporter=verbose src/engine/kategorisierung.test.js
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: All tests PASS (steuerberechnung + csvParser + kategorisierung).

- [ ] **Step 6: Commit**

```bash
git add src/engine/kategorisierung.js src/engine/kategorisierung.test.js
git commit -m "feat: transaction auto-categorization engine"
```

---

## Task 4: IPC handlers — CSV + Transaktionen

**Files:**
- Modify: `electron/main.js`
- Modify: `electron/preload/index.js`

- [ ] **Step 1: Add imports to `electron/main.js`**

At the top of `electron/main.js`, ensure `fs` is imported (add after existing imports):

```js
import { promises as fs } from 'fs'
```

- [ ] **Step 2: Add IPC handlers to `electron/main.js`**

Find the section where existing IPC handlers are defined (after the `pdf:save` handler or similar) and add the following block:

```js
// ── CSV ──────────────────────────────────────────────────────────────────────

ipcMain.handle('csv:read-file', async (event, filePath) => {
  const buf = await fs.readFile(filePath)
  // Lese als latin1 (sicher für alle Byte-Werte, inkl. ISO-8859-1)
  const latin1Content = buf.toString('latin1')
  const firstLine = latin1Content.split('\n')[0]
  // N26 ist UTF-8 + Komma-getrennt — alle anderen deutschen Banken: latin1
  const isN26 = firstLine.includes('Betrag (EUR)') || (firstLine.includes('Transaktionstyp') && firstLine.includes('Empfänger'))
  const content = isN26 ? buf.toString('utf8') : latin1Content
  return { content }
})

// ── Transaktionen ─────────────────────────────────────────────────────────────

ipcMain.handle('transaktionen:load', async (event, steuerjahrId) => {
  return dbAll(
    'SELECT * FROM transaktionen WHERE steuerjahr_id = ? ORDER BY datum DESC',
    [steuerjahrId]
  )
})

ipcMain.handle('transaktionen:save-batch', async (event, { transaktionen, steuerjahrId }) => {
  let inserted = 0
  let duplicates = 0
  for (const t of transaktionen) {
    const existing = await dbGet(
      'SELECT id FROM transaktionen WHERE steuerjahr_id = ? AND datum = ? AND betrag = ? AND empfaenger = ? LIMIT 1',
      [steuerjahrId, t.datum, t.betrag, t.empfaenger]
    )
    if (existing) {
      duplicates++
      continue
    }
    await dbRun(
      `INSERT INTO transaktionen (steuerjahr_id, datum, betrag, typ, empfaenger, verwendungszweck, kategorie, abzugsfaehig, bank)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [steuerjahrId, t.datum, t.betrag, t.typ, t.empfaenger, t.verwendungszweck, t.kategorie, t.abzugsfaehig, t.bank]
    )
    inserted++
  }
  return { inserted, duplicates }
})

ipcMain.handle('transaktionen:update', async (event, { id, kategorie, abzugsfaehig, notiz }) => {
  return dbRun(
    `UPDATE transaktionen SET kategorie = ?, abzugsfaehig = ?, notiz = ?, zuletzt_geaendert = datetime('now') WHERE id = ?`,
    [kategorie, abzugsfaehig, notiz ?? null, id]
  )
})

ipcMain.handle('transaktionen:delete', async (event, id) => {
  return dbRun('DELETE FROM transaktionen WHERE id = ?', [id])
})
```

- [ ] **Step 3: Expose APIs in `electron/preload/index.js`**

Find the `contextBridge.exposeInMainWorld('steuerpilot', {...})` call and add two new keys — `csv` and `transaktionen` — inside the object:

```js
      csv: {
        readFile: (filePath) => ipcRenderer.invoke('csv:read-file', filePath)
      },
      transaktionen: {
        load:      (steuerjahrId) => ipcRenderer.invoke('transaktionen:load', steuerjahrId),
        saveBatch: (payload)      => ipcRenderer.invoke('transaktionen:save-batch', payload),
        update:    (payload)      => ipcRenderer.invoke('transaktionen:update', payload),
        delete:    (id)           => ipcRenderer.invoke('transaktionen:delete', id)
      },
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: `✓ build` — all 3 bundles (main, preload, renderer) with no errors.

- [ ] **Step 5: Commit**

```bash
git add electron/main.js electron/preload/index.js
git commit -m "feat: IPC handlers for CSV import and transactions"
```

---

## Task 5: UmsatzScreen container

**Files:**
- Create: `src/screens/Umsatz/UmsatzScreen.jsx`

- [ ] **Step 1: Create `src/screens/Umsatz/UmsatzScreen.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { springGentle } from '../../theme/tokens.js'
import CsvImportFlow from './CsvImportFlow.jsx'
import TransaktionListe from './TransaktionListe.jsx'
import UmsatzCharts from './UmsatzCharts.jsx'
import Ampel from './Ampel.jsx'

export default function UmsatzScreen({ activeJahr }) {
  const [transaktionen, setTransaktionen] = useState([])
  const [showImport, setShowImport] = useState(false)
  const [filterTyp, setFilterTyp] = useState('alle') // 'alle'|'einnahmen'|'ausgaben'|'absetzbar'
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeJahr?.id) loadTransaktionen()
  }, [activeJahr?.id])

  async function loadTransaktionen() {
    setLoading(true)
    try {
      const rows = await window.steuerpilot.transaktionen.load(activeJahr.id)
      setTransaktionen(rows ?? [])
    } catch (err) {
      console.error('Transaktionen laden:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleImportComplete(result) {
    setShowImport(false)
    await loadTransaktionen()
  }

  async function handleUpdateTransaktion(id, changes) {
    await window.steuerpilot.transaktionen.update({ id, ...changes })
    setTransaktionen(prev =>
      prev.map(t => t.id === id ? { ...t, ...changes } : t)
    )
  }

  async function handleDeleteTransaktion(id) {
    await window.steuerpilot.transaktionen.delete(id)
    setTransaktionen(prev => prev.filter(t => t.id !== id))
  }

  const filtered = transaktionen.filter(t => {
    if (filterTyp === 'einnahmen') return t.typ === 'einnahme'
    if (filterTyp === 'ausgaben') return t.typ === 'ausgabe'
    if (filterTyp === 'absetzbar') return t.abzugsfaehig === 1
    return true
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle}
      style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-on-surface)', letterSpacing: '-0.02em' }}>
            Umsätze {activeJahr?.jahr}
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
            {transaktionen.length > 0
              ? `${transaktionen.length} Transaktionen importiert`
              : 'Noch keine Transaktionen importiert'}
          </p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            padding: '0.625rem 1.25rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          CSV importieren
        </button>
      </div>

      {/* Import Modal */}
      {showImport && (
        <CsvImportFlow
          activeJahr={activeJahr}
          onComplete={handleImportComplete}
          onClose={() => setShowImport(false)}
        />
      )}

      {transaktionen.length === 0 && !loading ? (
        /* Empty State */
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'var(--color-surface-container)',
          borderRadius: 'var(--radius-xl)',
          color: 'var(--color-on-surface-variant)'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ marginBottom: '1rem', opacity: 0.4 }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Noch keine Transaktionen</div>
          <div style={{ fontSize: '0.8125rem' }}>Importiere deinen Kontoauszug als CSV um Transaktionen automatisch zu kategorisieren.</div>
        </div>
      ) : (
        <>
          <Ampel transaktionen={transaktionen} jahr={activeJahr?.jahr} />
          <UmsatzCharts transaktionen={transaktionen} />
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', marginTop: '1.5rem' }}>
            {[
              { id: 'alle', label: 'Alle' },
              { id: 'einnahmen', label: 'Einnahmen' },
              { id: 'ausgaben', label: 'Ausgaben' },
              { id: 'absetzbar', label: 'Absetzbar' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterTyp(f.id)}
                style={{
                  background: filterTyp === f.id ? 'var(--color-primary-container)' : 'var(--color-surface-container)',
                  color: filterTyp === f.id ? 'var(--color-on-primary-container)' : 'var(--color-on-surface-variant)',
                  border: 'none',
                  borderRadius: 'var(--radius-pill)',
                  padding: '0.375rem 0.875rem',
                  fontSize: '0.75rem',
                  fontWeight: filterTyp === f.id ? 700 : 400,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <TransaktionListe
            transaktionen={filtered}
            onUpdate={handleUpdateTransaktion}
            onDelete={handleDeleteTransaktion}
          />
        </>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Build and verify no import errors**

```bash
npm run build
```

Expected: build fails because CsvImportFlow, TransaktionListe, UmsatzCharts, Ampel don't exist yet. That's expected — proceed.

---

## Task 6: CsvImportFlow — import wizard modal

**Files:**
- Create: `src/screens/Umsatz/CsvImportFlow.jsx`

- [ ] **Step 1: Create `src/screens/Umsatz/CsvImportFlow.jsx`**

```jsx
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { spring, springGentle } from '../../theme/tokens.js'
import { detectBank, normalizeCsv } from '../../engine/csvParser.js'
import { kategorisiereTransaktion } from '../../engine/kategorisierung.js'

const BANK_LABELS = {
  deutsche_bank: 'Deutsche Bank',
  sparkasse: 'Sparkasse',
  ing: 'ING',
  n26: 'N26',
  unbekannt: 'Unbekannte Bank'
}

const KATEGORIEN = [
  { value: 'fahrtkosten', label: 'Fahrtkosten' },
  { value: 'homeoffice', label: 'Homeoffice' },
  { value: 'arbeitsmittel', label: 'Arbeitsmittel' },
  { value: 'krankenversicherung', label: 'Krankenversicherung' },
  { value: 'altersvorsorge', label: 'Altersvorsorge' },
  { value: 'spende', label: 'Spende' },
  { value: 'sonstige', label: 'Sonstige' }
]

// Bestimmt 'einnahme' oder 'ausgabe' anhand des Vorzeichens
function typVonBetrag(betrag) {
  return betrag >= 0 ? 'einnahme' : 'ausgabe'
}

export default function CsvImportFlow({ activeJahr, onComplete, onClose }) {
  const [step, setStep] = useState('upload') // 'upload' | 'preview' | 'importing'
  const [dragOver, setDragOver] = useState(false)
  const [bank, setBank] = useState(null)
  const [transaktionen, setTransaktionen] = useState([]) // annotated with kategorie/abzugsfaehig
  const [error, setError] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const inputRef = useRef(null)

  async function processFile(file) {
    setError(null)
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Nur CSV-Dateien werden unterstützt.')
      return
    }
    try {
      const { content } = await window.steuerpilot.csv.readFile(file.path)
      const firstLine = content.split('\n')[0]
      const erkannteBank = detectBank(firstLine)
      setBank(erkannteBank)
      const roh = normalizeCsv(content, erkannteBank)
      const annotiert = roh.map(t => {
        const { kategorie, abzugsfaehig } = kategorisiereTransaktion({
          empfaenger: t.empfaenger,
          verwendungszweck: t.verwendungszweck
        })
        return {
          ...t,
          typ: typVonBetrag(t.betrag),
          betrag: Math.abs(t.betrag),
          kategorie,
          abzugsfaehig,
          bank: erkannteBank
        }
      })
      setTransaktionen(annotiert)
      setStep('preview')
    } catch (err) {
      setError(`Fehler beim Lesen der Datei: ${err.message}`)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    processFile(file)
  }

  function handleFileInput(e) {
    processFile(e.target.files[0])
  }

  function updateKategorie(idx, kategorie) {
    setTransaktionen(prev => prev.map((t, i) => i === idx
      ? { ...t, kategorie, abzugsfaehig: ['fahrtkosten','homeoffice','arbeitsmittel','krankenversicherung','altersvorsorge','spende'].includes(kategorie) ? 1 : 0 }
      : t
    ))
  }

  async function handleImport() {
    setStep('importing')
    try {
      const result = await window.steuerpilot.transaktionen.saveBatch({
        transaktionen,
        steuerjahrId: activeJahr.id
      })
      setImportResult(result)
      setTimeout(() => onComplete(result), 1500)
    } catch (err) {
      setError(`Import fehlgeschlagen: ${err.message}`)
      setStep('preview')
    }
  }

  const absetzbareAusgaben = transaktionen
    .filter(t => t.typ === 'ausgabe' && t.abzugsfaehig === 1)
    .reduce((sum, t) => sum + t.betrag, 0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(4px)'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={spring}
        style={{
          background: 'var(--color-surface-container-low)',
          borderRadius: 'var(--radius-xl)',
          width: step === 'preview' ? 860 : 520,
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          border: '1px solid var(--color-outline-variant)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-outline-variant)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-on-surface)' }}>
              {step === 'upload' ? 'CSV importieren' : step === 'preview' ? 'Vorschau & Kategorien' : 'Wird importiert…'}
            </div>
            {bank && step === 'preview' && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.125rem' }}>
                Bank erkannt: <strong style={{ color: 'var(--color-secondary)' }}>{BANK_LABELS[bank]}</strong>
                {' · '}{transaktionen.length} Transaktionen
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', padding: '0.25rem', display: 'flex' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {step === 'upload' && (
            <div>
              {/* Drag & Drop Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--color-secondary)' : 'var(--color-outline-variant)'}`,
                  borderRadius: 'var(--radius-xl)',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'rgba(245,166,35,0.06)' : 'var(--color-surface-container)',
                  transition: 'all 0.15s ease',
                  transform: dragOver ? 'scale(1.01)' : 'scale(1)'
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ color: dragOver ? 'var(--color-secondary)' : 'var(--color-outline)', marginBottom: '1rem' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div style={{ fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.375rem' }}>
                  CSV hier ablegen oder klicken
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                  Deutsche Bank · Sparkasse · ING · N26
                </div>
              </div>
              <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileInput} />
              {error && (
                <div style={{
                  marginTop: '1rem', padding: '0.75rem 1rem',
                  background: 'rgba(244,67,54,0.1)',
                  border: '1px solid rgba(244,67,54,0.3)',
                  borderRadius: 'var(--radius-lg)',
                  color: '#f44336', fontSize: '0.8125rem'
                }}>
                  {error}
                </div>
              )}
              <div style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                <strong>Hinweis:</strong> Dein Kontoauszug verlässt nie dieses Gerät. Alle Daten werden lokal verarbeitet und verschlüsselt gespeichert.
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div>
              {/* Summary bar */}
              <div style={{
                display: 'flex', gap: '1rem', marginBottom: '1.25rem',
                padding: '0.875rem 1rem',
                background: 'var(--color-surface-container)',
                borderRadius: 'var(--radius-lg)'
              }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-secondary)' }}>
                    {absetzbareAusgaben.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>Absetzbar erkannt</div>
                </div>
                <div style={{ width: 1, background: 'var(--color-outline-variant)' }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
                    {transaktionen.filter(t => t.abzugsfaehig === 1).length}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>Absetzbare Transaktionen</div>
                </div>
                <div style={{ width: 1, background: 'var(--color-outline-variant)' }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
                    {transaktionen.filter(t => t.kategorie === 'sonstige').length}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>Nicht kategorisiert</div>
                </div>
              </div>

              {/* Preview Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-container-high)' }}>
                      {['Datum', 'Empfänger', 'Betrag', 'Kategorie'].map(col => (
                        <th key={col} style={{
                          padding: '0.625rem 0.75rem', textAlign: 'left',
                          fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.06em',
                          textTransform: 'uppercase', color: 'var(--color-on-surface-variant)',
                          borderBottom: '1px solid var(--color-outline-variant)'
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transaktionen.slice(0, 50).map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                          {t.datum}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-on-surface)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.empfaenger || '—'}
                        </td>
                        <td style={{
                          padding: '0.5rem 0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
                          color: t.typ === 'einnahme' ? '#4caf50' : 'var(--color-on-surface)'
                        }}>
                          {t.typ === 'einnahme' ? '+' : '-'}
                          {t.betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <select
                            value={t.kategorie}
                            onChange={e => updateKategorie(idx, e.target.value)}
                            style={{
                              background: 'var(--color-surface-container-high)',
                              border: '1px solid var(--color-outline-variant)',
                              borderRadius: 'var(--radius-md)',
                              color: 'var(--color-on-surface)',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              fontFamily: 'var(--font-family)',
                              cursor: 'pointer'
                            }}
                          >
                            {KATEGORIEN.map(k => (
                              <option key={k.value} value={k.value}>{k.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transaktionen.length > 50 && (
                  <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                    + {transaktionen.length - 50} weitere Transaktionen (werden alle importiert)
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              {importResult ? (
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>
                    {importResult.inserted} Transaktionen importiert
                  </div>
                  {importResult.duplicates > 0 && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                      {importResult.duplicates} Duplikate übersprungen
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--color-on-surface-variant)' }}>Importiere…</div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {step === 'preview' && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--color-outline-variant)',
            display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
            flexShrink: 0
          }}>
            <button
              onClick={() => setStep('upload')}
              style={{
                background: 'var(--color-surface-container)',
                color: 'var(--color-on-surface-variant)',
                border: 'none', borderRadius: 'var(--radius-lg)',
                padding: '0.625rem 1rem',
                fontSize: '0.8125rem', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-family)'
              }}
            >
              Zurück
            </button>
            <button
              onClick={handleImport}
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
                border: 'none', borderRadius: 'var(--radius-lg)',
                padding: '0.625rem 1.25rem',
                fontSize: '0.8125rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-family)'
              }}
            >
              {transaktionen.length} Transaktionen importieren
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/Umsatz/CsvImportFlow.jsx
git commit -m "feat: CSV import flow with bank detection and category preview"
```

---

## Task 7: TransaktionListe — scrollable table with inline editing

**Files:**
- Create: `src/screens/Umsatz/TransaktionListe.jsx`

- [ ] **Step 1: Create `src/screens/Umsatz/TransaktionListe.jsx`**

```jsx
import { useState } from 'react'

const KATEGORIEN = [
  { value: 'fahrtkosten', label: 'Fahrtkosten' },
  { value: 'homeoffice', label: 'Homeoffice' },
  { value: 'arbeitsmittel', label: 'Arbeitsmittel' },
  { value: 'krankenversicherung', label: 'Krankenversicherung' },
  { value: 'altersvorsorge', label: 'Altersvorsorge' },
  { value: 'spende', label: 'Spende' },
  { value: 'sonstige', label: 'Sonstige' }
]

const ABZUGSFAEHIGE_KATEGORIEN = new Set(['fahrtkosten', 'homeoffice', 'arbeitsmittel', 'krankenversicherung', 'altersvorsorge', 'spende'])

const KATEGORIE_FARBEN = {
  fahrtkosten: '#4fc3f7',
  homeoffice: '#aed581',
  arbeitsmittel: '#ffb74d',
  krankenversicherung: '#ce93d8',
  altersvorsorge: '#80cbc4',
  spende: '#ef9a9a',
  sonstige: '#90a4ae'
}

export default function TransaktionListe({ transaktionen, onUpdate, onDelete }) {
  const [deletingId, setDeletingId] = useState(null)

  function handleKategorieChange(t, kategorie) {
    const abzugsfaehig = ABZUGSFAEHIGE_KATEGORIEN.has(kategorie) ? 1 : 0
    onUpdate(t.id, { kategorie, abzugsfaehig })
  }

  function handleDeleteClick(id) {
    if (deletingId === id) {
      onDelete(id)
      setDeletingId(null)
    } else {
      setDeletingId(id)
      setTimeout(() => setDeletingId(null), 3000)
    }
  }

  if (transaktionen.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '2rem',
        color: 'var(--color-on-surface-variant)',
        fontSize: '0.8125rem'
      }}>
        Keine Transaktionen für diesen Filter.
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--color-surface-container)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      border: '1px solid var(--color-outline-variant)'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-container-high)' }}>
              {['Datum', 'Empfänger / Verwendungszweck', 'Betrag', 'Kategorie', 'Absetzbar', ''].map(col => (
                <th key={col} style={{
                  padding: '0.75rem 1rem', textAlign: 'left',
                  fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--color-on-surface-variant)',
                  borderBottom: '1px solid var(--color-outline-variant)',
                  whiteSpace: 'nowrap'
                }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transaktionen.map(t => (
              <tr
                key={t.id}
                style={{
                  borderBottom: '1px solid var(--color-outline-variant)',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-container-high)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Datum */}
                <td style={{ padding: '0.625rem 1rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                  {t.datum}
                </td>
                {/* Empfänger */}
                <td style={{ padding: '0.625rem 1rem', maxWidth: 280 }}>
                  <div style={{
                    color: 'var(--color-on-surface)', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {t.empfaenger || '—'}
                  </div>
                  {t.verwendungszweck && (
                    <div style={{
                      color: 'var(--color-on-surface-variant)', fontSize: '0.6875rem',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {t.verwendungszweck}
                    </div>
                  )}
                </td>
                {/* Betrag */}
                <td style={{
                  padding: '0.625rem 1rem', fontWeight: 700, whiteSpace: 'nowrap',
                  color: t.typ === 'einnahme' ? '#4caf50' : 'var(--color-on-surface)'
                }}>
                  {t.typ === 'einnahme' ? '+' : '-'}
                  {t.betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </td>
                {/* Kategorie */}
                <td style={{ padding: '0.625rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: KATEGORIE_FARBEN[t.kategorie] ?? '#90a4ae'
                    }} />
                    <select
                      value={t.kategorie}
                      onChange={e => handleKategorieChange(t, e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-on-surface)',
                        fontSize: '0.8125rem',
                        fontFamily: 'var(--font-family)',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {KATEGORIEN.map(k => (
                        <option key={k.value} value={k.value}>{k.label}</option>
                      ))}
                    </select>
                  </div>
                </td>
                {/* Absetzbar */}
                <td style={{ padding: '0.625rem 1rem' }}>
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-pill)',
                    background: t.abzugsfaehig ? 'rgba(76,175,80,0.15)' : 'var(--color-surface-container-high)',
                    color: t.abzugsfaehig ? '#4caf50' : 'var(--color-on-surface-variant)'
                  }}>
                    {t.abzugsfaehig ? 'Ja' : '—'}
                  </span>
                </td>
                {/* Löschen */}
                <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                  <button
                    onClick={() => handleDeleteClick(t.id)}
                    title={deletingId === t.id ? 'Nochmal klicken zum Bestätigen' : 'Löschen'}
                    style={{
                      background: deletingId === t.id ? 'rgba(244,67,54,0.15)' : 'none',
                      border: 'none', cursor: 'pointer',
                      color: deletingId === t.id ? '#f44336' : 'var(--color-outline)',
                      padding: '0.25rem', borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem', fontFamily: 'var(--font-family)',
                      transition: 'all 0.15s'
                    }}
                  >
                    {deletingId === t.id ? 'Bestätigen?' : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid var(--color-outline-variant)',
        fontSize: '0.75rem', color: 'var(--color-on-surface-variant)'
      }}>
        {transaktionen.length} Transaktionen
        {' · '}
        Absetzbar gesamt: <strong style={{ color: 'var(--color-secondary)' }}>
          {transaktionen.filter(t => t.abzugsfaehig).reduce((s, t) => s + t.betrag, 0)
            .toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
        </strong>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/Umsatz/TransaktionListe.jsx
git commit -m "feat: transaction list with inline category editing"
```

---

## Task 8: UmsatzCharts — monthly bar + category pie

**Files:**
- Create: `src/screens/Umsatz/UmsatzCharts.jsx`

- [ ] **Step 1: Create `src/screens/Umsatz/UmsatzCharts.jsx`**

```jsx
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts'

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

const KATEGORIE_FARBEN = {
  fahrtkosten: '#4fc3f7',
  homeoffice: '#aed581',
  arbeitsmittel: '#ffb74d',
  krankenversicherung: '#ce93d8',
  altersvorsorge: '#80cbc4',
  spende: '#ef9a9a',
  sonstige: '#90a4ae'
}

const KATEGORIE_LABEL = {
  fahrtkosten: 'Fahrtkosten',
  homeoffice: 'Homeoffice',
  arbeitsmittel: 'Arbeitsmittel',
  krankenversicherung: 'Krankenvers.',
  altersvorsorge: 'Altersvorsorge',
  spende: 'Spenden',
  sonstige: 'Sonstige'
}

function buildMonatlicheDaten(transaktionen) {
  const byMonth = {}
  for (const t of transaktionen) {
    const monat = t.datum?.slice(5, 7) // "YYYY-MM-DD" → "MM"
    if (!monat) continue
    const idx = parseInt(monat, 10) - 1
    if (!byMonth[idx]) byMonth[idx] = { monat: MONATE[idx], einnahmen: 0, ausgaben: 0 }
    if (t.typ === 'einnahme') byMonth[idx].einnahmen += t.betrag
    else byMonth[idx].ausgaben += t.betrag
  }
  return Object.values(byMonth).sort((a, b) => MONATE.indexOf(a.monat) - MONATE.indexOf(b.monat))
}

function buildKategorieDaten(transaktionen) {
  const byKat = {}
  for (const t of transaktionen) {
    if (t.typ !== 'ausgabe' || !t.abzugsfaehig) continue
    if (!byKat[t.kategorie]) byKat[t.kategorie] = 0
    byKat[t.kategorie] += t.betrag
  }
  return Object.entries(byKat)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, label: KATEGORIE_LABEL[name] ?? name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

const tooltipStyle = {
  background: 'var(--color-surface-container-high)',
  border: '1px solid var(--color-outline-variant)',
  borderRadius: 8,
  color: 'var(--color-on-surface)',
  fontSize: '0.75rem',
  fontFamily: 'var(--font-family)'
}

export default function UmsatzCharts({ transaktionen }) {
  const monatsDaten = buildMonatlicheDaten(transaktionen)
  const kategorieDaten = buildKategorieDaten(transaktionen)

  if (monatsDaten.length === 0) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: kategorieDaten.length > 0 ? '1fr 340px' : '1fr', gap: '1.25rem', marginBottom: '0.5rem' }}>
      {/* Monatliche Übersicht */}
      <div style={{
        background: 'var(--color-surface-container)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem',
        border: '1px solid var(--color-outline-variant)'
      }}>
        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
          Monatliche Übersicht
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monatsDaten} barCategoryGap="30%">
            <XAxis
              dataKey="monat"
              tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `${v}€`}
              width={56}
            />
            <Tooltip
              formatter={(value, name) => [
                value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }),
                name === 'einnahmen' ? 'Einnahmen' : 'Ausgaben'
              ]}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="einnahmen" fill="#1E3A5F" radius={[4, 4, 0, 0]} name="einnahmen" />
            <Bar dataKey="ausgaben" fill="#F5A623" radius={[4, 4, 0, 0]} name="ausgaben" />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem' }}>
          {[{ color: '#1E3A5F', label: 'Einnahmen' }, { color: '#F5A623', label: 'Ausgaben' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Absetzbare Ausgaben nach Kategorie */}
      {kategorieDaten.length > 0 && (
        <div style={{
          background: 'var(--color-surface-container)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.25rem',
          border: '1px solid var(--color-outline-variant)'
        }}>
          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
            Absetzbare Ausgaben
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={kategorieDaten}
                dataKey="value"
                nameKey="label"
                cx="50%" cy="50%"
                innerRadius={42} outerRadius={64}
                paddingAngle={2}
              >
                {kategorieDaten.map((entry) => (
                  <Cell key={entry.name} fill={KATEGORIE_FARBEN[entry.name] ?? '#90a4ae'} />
                ))}
              </Pie>
              <Tooltip
                formatter={v => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.5rem' }}>
            {kategorieDaten.map(k => (
              <div key={k.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: KATEGORIE_FARBEN[k.name], flexShrink: 0 }} />
                  <span style={{ color: 'var(--color-on-surface-variant)' }}>{k.label}</span>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
                  {k.value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/Umsatz/UmsatzCharts.jsx
git commit -m "feat: monthly bar chart and category donut chart"
```

---

## Task 9: Ampel — traffic light summary cards

**Files:**
- Create: `src/screens/Umsatz/Ampel.jsx`

- [ ] **Step 1: Create `src/screens/Umsatz/Ampel.jsx`**

```jsx
import { getJahreswerte } from '../../engine/steuerberechnung.js'

function AmpelKarte({ titel, wert, max, einheit, hinweis, farbe, formatierung }) {
  const prozent = max ? Math.min((wert / max) * 100, 100) : null
  return (
    <div style={{
      flex: 1,
      background: 'var(--color-surface-container)',
      borderRadius: 'var(--radius-xl)',
      padding: '1.125rem 1.25rem',
      border: '1px solid var(--color-outline-variant)'
    }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '0.625rem' }}>
        {titel}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', marginBottom: max ? '0.75rem' : 0 }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: farbe }}>
          {formatierung(wert)}
        </span>
        {max && (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
            von {formatierung(max)}
          </span>
        )}
      </div>
      {max && (
        <div style={{ height: 6, background: 'var(--color-surface-container-high)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${prozent}%`,
            background: farbe,
            borderRadius: 999,
            transition: 'width 0.6s ease'
          }} />
        </div>
      )}
      {hinweis && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.4 }}>
          {hinweis}
        </div>
      )}
    </div>
  )
}

function ampelFarbe(wert, max) {
  if (!max) return 'var(--color-secondary)'
  const ratio = wert / max
  if (ratio >= 1) return '#f44336'
  if (ratio >= 0.75) return '#ff9800'
  return '#4caf50'
}

export default function Ampel({ transaktionen, jahr }) {
  const jahreswerte = getJahreswerte(jahr ?? 2025)

  const arbeitsmittelSumme = transaktionen
    .filter(t => t.typ === 'ausgabe' && t.kategorie === 'arbeitsmittel')
    .reduce((s, t) => s + t.betrag, 0)

  const nichtKategorisiert = transaktionen.filter(t => t.kategorie === 'sonstige').length

  const absetzbareGesamt = transaktionen
    .filter(t => t.abzugsfaehig === 1)
    .reduce((s, t) => s + t.betrag, 0)

  const euro = v => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const zahl = v => v.toString()

  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
      <AmpelKarte
        titel="Arbeitsmittel-Freigrenze"
        wert={Math.round(arbeitsmittelSumme)}
        max={jahreswerte.arbeitsmittelFreigrenze}
        einheit="€"
        farbe={ampelFarbe(arbeitsmittelSumme, jahreswerte.arbeitsmittelFreigrenze)}
        formatierung={euro}
        hinweis={arbeitsmittelSumme > jahreswerte.arbeitsmittelFreigrenze
          ? 'Über Freigrenze — Einzelbelege und ggf. AfA prüfen.'
          : `Bis ${euro(jahreswerte.arbeitsmittelFreigrenze)} keine Einzelnachweise nötig.`}
      />
      <AmpelKarte
        titel="Nicht kategorisiert"
        wert={nichtKategorisiert}
        max={null}
        farbe={nichtKategorisiert === 0 ? '#4caf50' : nichtKategorisiert > 10 ? '#f44336' : '#ff9800'}
        formatierung={v => `${zahl(v)} Tx`}
        hinweis={nichtKategorisiert === 0
          ? 'Alle Transaktionen kategorisiert.'
          : 'Bitte manuell prüfen — könnten absetzbar sein.'}
      />
      <AmpelKarte
        titel="Absetzbar gesamt"
        wert={Math.round(absetzbareGesamt)}
        max={null}
        farbe="var(--color-secondary)"
        formatierung={euro}
        hinweis="Summe aller als absetzbar markierten Transaktionen."
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/Umsatz/Ampel.jsx
git commit -m "feat: Ampel traffic-light summary cards"
```

---

## Task 10: Wire up — AppShell + App.jsx

**Files:**
- Modify: `src/components/AppShell/AppShell.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Enable Umsatz nav in AppShell**

In `src/components/AppShell/AppShell.jsx`, find the `NAV_ITEMS` array and change the `umsatz` entry from `available: false` to `available: true`:

```js
  { id: 'umsatz', label: 'Umsatz', icon: <IconUmsatz />, available: true },
```

- [ ] **Step 2: Add UmsatzScreen import to `src/App.jsx`**

Add to the existing imports at the top of `src/App.jsx`:

```js
import UmsatzScreen from './screens/Umsatz/UmsatzScreen.jsx'
```

- [ ] **Step 3: Add Umsatz route inside the render prop in `src/App.jsx`**

Inside the `{({ nutzer, activeJahr }) => (...)}` block, after the `belege` block, add:

```jsx
              {activeNav === 'umsatz' && (
                <UmsatzScreen activeJahr={activeJahr} />
              )}
```

- [ ] **Step 4: Build — full verification**

```bash
npm run build
```

Expected: `✓ build` — all 3 bundles build cleanly with no errors.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 6: Final commit**

```bash
git add src/components/AppShell/AppShell.jsx src/App.jsx
git commit -m "feat: enable Umsatz-Dashboard in navigation"
```

---

## Self-Review

**Spec coverage:**
- ✅ CSV import with bank detection (Deutsche Bank, Sparkasse, ING, N26)
- ✅ ISO-8859-1 / UTF-8 encoding handled in Main process
- ✅ Preview before import (CLAUDE.md requirement)
- ✅ Duplicate detection (datum + betrag + empfaenger)
- ✅ Auto-categorization (Fahrtkosten, Arbeitsmittel, Krankenversicherung, Altersvorsorge, Spende)
- ✅ PayPal → 'sonstige' (CLAUDE.md requirement)
- ✅ Inline category editing in both preview and list
- ✅ Monthly bar chart (Recharts BarChart)
- ✅ Category donut chart (Recharts PieChart)
- ✅ Ampel traffic-light summary
- ✅ Empty state
- ✅ Filter: Alle / Einnahmen / Ausgaben / Absetzbar
- ✅ Delete with double-confirm
- ✅ All data stays local
- ✅ `steuerjahr_id` on every row (CLAUDE.md requirement)
- ✅ Jetson not used — no fallback needed here

**Placeholder scan:** None found.

**Type consistency:**
- `saveBatch` IPC: payload is `{ transaktionen, steuerjahrId }` — same in handler and preload call. ✅
- `update` IPC: payload is `{ id, kategorie, abzugsfaehig, notiz }` — same in handler and call from TransaktionListe. ✅
- `transaktionen.betrag` is always stored as `Math.abs(betrag)` with `typ` tracking direction. ✅
- `abzugsfaehig` is `0` or `1` (INTEGER in DB, checked as truthy in JSX). ✅
