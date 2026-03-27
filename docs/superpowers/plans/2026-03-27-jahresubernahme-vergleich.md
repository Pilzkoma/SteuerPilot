# Jahresübernahme & Jahresvergleich — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vorjahresdaten als Startpunkt für ein neues Steuerjahr übernehmen und Steuerdaten mehrerer Jahre grafisch vergleichen.

**Architecture:** Pure-JS Engine für Übernahme-Logik, neue IPC-Handler für DB-Operationen, Erweiterung von AppShell (JahrSelector + Modal), Dashboard-Widget, eigener Jahresvergleich-Screen mit recharts.

**Tech Stack:** React, Framer Motion, Electron IPC, SQLCipher (via `window.steuerpilot.db`), recharts, Vitest

---

## File Map

| Datei | Aktion | Zweck |
|---|---|---|
| `src/engine/jahresubernahme.js` | Neu | Pure-JS Übernahme-Logik |
| `src/engine/jahresubernahme.test.js` | Neu | Vitest Tests |
| `electron/main.js` | Erweitern | 5 neue IPC-Handler |
| `electron/preload/index.js` | Erweitern | Bridge-Methoden für neue Handler |
| `src/components/AppShell/AppShell.jsx` | Erweitern | JahrSelector (+/Delete), Auto-Jahr, Übernahme-Check, Modal |
| `src/screens/Wizard/WizardScreen.jsx` | Erweitern | Manueller "Vom Vorjahr übernehmen"-Button |
| `src/screens/Dashboard/DashboardScreen.jsx` | Erweitern | JahresvergleichWidget |
| `src/screens/Jahresvergleich/JahresvergleichScreen.jsx` | Neu | Balkendiagramme + Tabelle |
| `src/App.jsx` | Erweitern | Neuen Screen einbinden |

---

## Task 1: Engine `jahresubernahme.js`

**Files:**
- Create: `src/engine/jahresubernahme.js`
- Create: `src/engine/jahresubernahme.test.js`

- [ ] **Schritt 1: Test schreiben**

```js
// src/engine/jahresubernahme.test.js
import { describe, it, expect } from 'vitest'
import { bereiteDatenFuerNeuesJahr } from './jahresubernahme.js'

const nutzer = {
  vorname: 'Max', nachname: 'Mustermann',
  steuer_id: '12345678901', finanzamt: 'Berlin Mitte',
  steuernummer: '111/222/33333', geburtsdatum: '1985-06-15',
  iban: 'DE89370400440532013000', nutzertyp: 'angestellter'
}

const wizardDaten = JSON.stringify({
  lohn: { bruttogehalt: '60000', lohnsteuer: '12000' },
  fahrtkosten: { km: '25', arbeitstage: '220' },
  homeoffice: { tage: '80' },
  arbeitsmittel: [],
  sonderausgaben: { krankenversicherung: '3000', altersvorsorge: '', spenden: '' },
  betriebsausgaben: [],
  gespeicherte_ids: { einnahmen: [1, 2], ausgaben: [5, 6] }
})

describe('bereiteDatenFuerNeuesJahr', () => {
  it('kopiert alle Nutzer-Stammdaten', () => {
    const result = bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft: { daten: wizardDaten } })
    expect(result.nutzerprofil).toEqual(nutzer)
  })

  it('kopiert Wizard-Daten als JSON-String', () => {
    const result = bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft: { daten: wizardDaten } })
    const parsed = JSON.parse(result.wizardDraft.daten)
    expect(parsed.fahrtkosten.km).toBe('25')
    expect(parsed.homeoffice.tage).toBe('80')
  })

  it('setzt schritt auf 0', () => {
    const result = bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft: { daten: wizardDaten } })
    expect(result.wizardDraft.schritt).toBe(0)
  })

  it('setzt abgeschlossen auf 0', () => {
    const result = bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft: { daten: wizardDaten } })
    expect(result.wizardDraft.abgeschlossen).toBe(0)
  })

  it('löscht gespeicherte_ids im Wizard-Draft', () => {
    const result = bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft: { daten: wizardDaten } })
    const parsed = JSON.parse(result.wizardDraft.daten)
    expect(parsed.gespeicherte_ids).toEqual({ einnahmen: [], ausgaben: [] })
  })

  it('funktioniert wenn kein wizardDraft vorhanden', () => {
    const result = bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft: null })
    expect(result.nutzerprofil).toEqual(nutzer)
    expect(result.wizardDraft).toBeNull()
  })
})
```

- [ ] **Schritt 2: Test ausführen — muss fehlschlagen**

```bash
npx vitest run src/engine/jahresubernahme.test.js
```
Erwartet: FAIL (Modul nicht gefunden)

- [ ] **Schritt 3: Engine implementieren**

```js
// src/engine/jahresubernahme.js

/**
 * SteuerPilot Engine — Jahresübernahme
 *
 * Kein Electron. Kein Node. Pure JS — vollständig unit-testbar.
 * Bereitet Vorjahresdaten als Ausgangspunkt für ein neues Steuerjahr auf.
 */

/**
 * Bereitet Daten aus einem Quell-Steuerjahr für ein neues Jahr auf.
 *
 * @param {{ nutzer: object, wizardDraft: { daten: string }|null }} quellDaten
 * @returns {{ nutzerprofil: object, wizardDraft: { daten: string, schritt: number, abgeschlossen: number }|null }}
 */
export function bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft }) {
  const nutzerprofil = {
    vorname:       nutzer.vorname       ?? null,
    nachname:      nutzer.nachname      ?? null,
    steuer_id:     nutzer.steuer_id     ?? null,
    finanzamt:     nutzer.finanzamt     ?? null,
    steuernummer:  nutzer.steuernummer  ?? null,
    geburtsdatum:  nutzer.geburtsdatum  ?? null,
    iban:          nutzer.iban          ?? null,
    nutzertyp:     nutzer.nutzertyp     ?? 'angestellter'
  }

  if (!wizardDraft?.daten) {
    return { nutzerprofil, wizardDraft: null }
  }

  let parsed
  try {
    parsed = JSON.parse(wizardDraft.daten)
  } catch {
    return { nutzerprofil, wizardDraft: null }
  }

  // gespeicherte_ids gehören zum alten Jahr — im neuen Jahr zurücksetzen
  parsed.gespeicherte_ids = { einnahmen: [], ausgaben: [] }

  return {
    nutzerprofil,
    wizardDraft: {
      daten: JSON.stringify(parsed),
      schritt: 0,
      abgeschlossen: 0
    }
  }
}
```

- [ ] **Schritt 4: Tests ausführen — müssen grün sein**

```bash
npx vitest run src/engine/jahresubernahme.test.js
```
Erwartet: 6 tests passed

- [ ] **Schritt 5: Commit**

```bash
git add src/engine/jahresubernahme.js src/engine/jahresubernahme.test.js
git commit -m "feat: add Jahresübernahme engine function"
```

---

## Task 2: IPC-Handler + Preload

**Files:**
- Modify: `electron/main.js`
- Modify: `electron/preload/index.js`

- [ ] **Schritt 1: 5 Handler in `electron/main.js` ergänzen**

Direkt vor der Zeile `// ── App Lifecycle` folgendes einfügen:

```js
// ── Jahresübernahme & Jahresvergleich ────────────────────────────────────────

ipcMain.handle('jahresubernahme:pruefen', async (_event, zielJahrId) => {
  // Gibt zurück: { sollAnbieten: bool, quellJahrId: number|null, quellJahr: number|null }
  const zielCount = await dbGet(
    `SELECT (SELECT COUNT(*) FROM einnahmen WHERE steuerjahr_id = ?) +
            (SELECT COUNT(*) FROM wizard_fortschritt WHERE steuerjahr_id = ?) as gesamt`,
    [zielJahrId, zielJahrId]
  )
  if ((zielCount?.gesamt ?? 0) > 0) {
    return { sollAnbieten: false, quellJahrId: null, quellJahr: null }
  }
  const zielRow = await dbGet('SELECT jahr FROM steuerjahre WHERE id = ?', [zielJahrId])
  const quellRow = await dbGet(
    `SELECT sj.id, sj.jahr FROM steuerjahre sj
     WHERE sj.jahr < ? AND (
       (SELECT COUNT(*) FROM einnahmen WHERE steuerjahr_id = sj.id) +
       (SELECT COUNT(*) FROM wizard_fortschritt WHERE steuerjahr_id = sj.id)
     ) > 0
     ORDER BY sj.jahr DESC LIMIT 1`,
    [zielRow?.jahr ?? 9999]
  )
  if (!quellRow) return { sollAnbieten: false, quellJahrId: null, quellJahr: null }
  return { sollAnbieten: true, quellJahrId: quellRow.id, quellJahr: quellRow.jahr }
})

ipcMain.handle('jahresubernahme:ausfuehren', async (_event, { zielJahrId, quellJahrId }) => {
  const nutzer = await dbGet('SELECT * FROM nutzer LIMIT 1', [])
  const wizardDraft = await dbGet(
    'SELECT daten FROM wizard_fortschritt WHERE steuerjahr_id = ? ORDER BY id DESC LIMIT 1',
    [quellJahrId]
  )
  if (!nutzer) return { success: false, fehler: 'Kein Nutzerprofil gefunden.' }

  // Nutzer-Stammdaten aktualisieren (bleiben jahresunabhängig in nutzer-Tabelle)
  await dbRun(
    `UPDATE nutzer SET vorname=?, nachname=?, steuer_id=?, finanzamt=?, steuernummer=?, geburtsdatum=?, iban=?, nutzertyp=?, zuletzt_geaendert=datetime('now') WHERE id=?`,
    [nutzer.vorname, nutzer.nachname, nutzer.steuer_id, nutzer.finanzamt,
     nutzer.steuernummer, nutzer.geburtsdatum, nutzer.iban, nutzer.nutzertyp, nutzer.id]
  )

  if (wizardDraft?.daten) {
    let parsed
    try { parsed = JSON.parse(wizardDraft.daten) } catch { parsed = null }
    if (parsed) {
      parsed.gespeicherte_ids = { einnahmen: [], ausgaben: [] }
      await dbRun(
        `INSERT OR REPLACE INTO wizard_fortschritt (steuerjahr_id, schritt, daten, abgeschlossen)
         VALUES (?, 0, ?, 0)`,
        [zielJahrId, JSON.stringify(parsed)]
      )
    }
  }
  return { success: true }
})

ipcMain.handle('steuerjahr:anlegen', async (_event, jahr) => {
  // Bekannte Grundfreibeträge; Fallback auf 2025-Werte
  const GRUNDFREIBETRAEGE = { 2024: 11604, 2025: 12096 }
  const grundfreibetrag = GRUNDFREIBETRAEGE[jahr] ?? 12096
  await dbRun(
    `INSERT OR IGNORE INTO steuerjahre (jahr, grundfreibetrag, arbeitnehmer_pauschbetrag, aktiv)
     VALUES (?, ?, 1230.00, 0)`,
    [jahr, grundfreibetrag]
  )
  return await dbGet('SELECT * FROM steuerjahre WHERE jahr = ?', [jahr])
})

ipcMain.handle('steuerjahr:loeschen', async (_event, jahrId) => {
  await dbRun('DELETE FROM transaktionen WHERE steuerjahr_id = ?', [jahrId])
  await dbRun('DELETE FROM belege WHERE steuerjahr_id = ?', [jahrId])
  await dbRun('DELETE FROM ausgaben WHERE steuerjahr_id = ?', [jahrId])
  await dbRun('DELETE FROM einnahmen WHERE steuerjahr_id = ?', [jahrId])
  await dbRun('DELETE FROM wizard_fortschritt WHERE steuerjahr_id = ?', [jahrId])
  await dbRun('DELETE FROM steuerjahre WHERE id = ?', [jahrId])
  return { success: true }
})

ipcMain.handle('vergleich:laden', async () => {
  const jahre = await dbAll('SELECT id, jahr FROM steuerjahre ORDER BY jahr ASC', [])
  const ergebnisse = await Promise.all(jahre.map(async j => {
    const einnahmen = await dbGet(
      'SELECT COALESCE(SUM(betrag), 0) as total FROM einnahmen WHERE steuerjahr_id = ?', [j.id]
    )
    const ausgaben = await dbGet(
      'SELECT COALESCE(SUM(betrag), 0) as total FROM ausgaben WHERE steuerjahr_id = ? AND abzugsfaehig = 1', [j.id]
    )
    const belege = await dbGet(
      'SELECT COUNT(*) as total FROM belege WHERE steuerjahr_id = ?', [j.id]
    )
    return {
      jahrId: j.id,
      jahr: j.jahr,
      einnahmen: einnahmen?.total ?? 0,
      ausgaben: ausgaben?.total ?? 0,
      belege: belege?.total ?? 0
    }
  }))
  return ergebnisse
})
```

- [ ] **Schritt 2: Preload Bridge in `electron/preload/index.js` erweitern**

Das `contextBridge.exposeInMainWorld`-Objekt um folgendes Feld ergänzen (nach `transaktionen: { ... }`):

```js
  // ── Jahresübernahme & Jahresvergleich ─────────────────────────────────────
  jahresubernahme: {
    pruefen:    (zielJahrId)               => ipcRenderer.invoke('jahresubernahme:pruefen', zielJahrId),
    ausfuehren: (payload)                  => ipcRenderer.invoke('jahresubernahme:ausfuehren', payload),
  },
  steuerjahr: {
    anlegen:  (jahr)   => ipcRenderer.invoke('steuerjahr:anlegen', jahr),
    loeschen: (jahrId) => ipcRenderer.invoke('steuerjahr:loeschen', jahrId),
  },
  vergleich: {
    laden: () => ipcRenderer.invoke('vergleich:laden'),
  },
```

- [ ] **Schritt 3: App starten und Konsole prüfen**

```bash
npm run dev
```
Erwartet: Keine neuen Fehler in der Konsole. `window.steuerpilot.jahresubernahme` ist im DevTools Console verfügbar.

- [ ] **Schritt 4: Commit**

```bash
git add electron/main.js electron/preload/index.js
git commit -m "feat: add Jahresubernahme and Jahresvergleich IPC handlers"
```

---

## Task 3: JahrSelector — „+" Button und Löschen

**Files:**
- Modify: `src/components/AppShell/AppShell.jsx`

Alle Änderungen in diesem Task betreffen ausschließlich die `JahrSelector`-Komponente und `handleChangeJahr`/`loadShellData` in `AppShell`.

- [ ] **Schritt 1: State für "+" Menü und Löschen-Bestätigung ergänzen**

In der `JahrSelector`-Funktion (direkt nach `const [open, setOpen] = useState(false)`):

```js
const [showAddMenu, setShowAddMenu] = useState(false)
const [deleteConfirm, setDeleteConfirm] = useState(null) // jahrId | null
```

- [ ] **Schritt 2: Hilfsfunktion `verfuegbareNeueJahre` berechnen**

Direkt nach den useState-Zeilen in `JahrSelector`:

```js
const vorhandeneJahre = new Set(jahre.map(j => j.jahr))
const aktuellesKalenderjahr = new Date().getFullYear()
const verfuegbareNeueJahre = Array.from({ length: 10 }, (_, i) => aktuellesKalenderjahr - i)
  .filter(j => !vorhandeneJahre.has(j))
```

- [ ] **Schritt 3: „+" Button im Selector-Header ergänzen**

Im bestehenden `<button onClick={() => setOpen(o => !o)}>` — nach dem `<motion.span>` mit dem Chevron:

```jsx
<span
  onClick={e => { e.stopPropagation(); setShowAddMenu(v => !v) }}
  style={{
    marginLeft: '0.5rem',
    width: 22, height: 22,
    borderRadius: '50%',
    background: 'var(--color-surface-container-high)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: '1rem', color: 'var(--color-on-surface-variant)',
    flexShrink: 0
  }}
  title="Jahr hinzufügen"
>+</span>
```

- [ ] **Schritt 4: „+" Dropdown-Menü rendern**

Direkt nach dem bestehenden `<AnimatePresence>` Block (dem für die Jahres-Liste):

```jsx
<AnimatePresence>
  {showAddMenu && (
    <motion.div
      initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
      transition={springGentle}
      style={{
        position: 'absolute',
        top: 'calc(100% + 0.375rem)',
        left: 0, right: 0,
        background: 'var(--color-surface-container-highest)',
        border: '1px solid var(--color-outline-variant)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        zIndex: 60,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        transformOrigin: 'top'
      }}
    >
      {verfuegbareNeueJahre.length === 0 ? (
        <div style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
          Alle Jahre vorhanden
        </div>
      ) : (
        verfuegbareNeueJahre.map(j => (
          <button
            key={j}
            onClick={() => { onAddJahr(j); setShowAddMenu(false) }}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              padding: '0.75rem 0.875rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontFamily: 'var(--font-family)', color: 'var(--color-on-surface)',
              fontSize: '0.875rem', textAlign: 'left'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-container)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ color: 'var(--color-secondary)', fontSize: '1rem', lineHeight: 1 }}>+</span>
            {j}
          </button>
        ))
      )}
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Schritt 5: Löschen-Icon in Jahres-Einträgen ergänzen**

Im bestehenden `.map(j => (...))` Block der Jahresliste — das innere `<button>` so erweitern, dass ein Löschen-Icon bei Hover erscheint. Den bestehenden Button durch folgendes ersetzen:

```jsx
{jahre.map(j => {
  const istAktiv = j.id === activeJahr
  return (
    <div
      key={j.id}
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => { if (!istAktiv) e.currentTarget.querySelector('.del-btn').style.opacity = '1' }}
      onMouseLeave={e => { if (!istAktiv) e.currentTarget.querySelector('.del-btn').style.opacity = '0' }}
    >
      <button
        onClick={() => { onChangeJahr(j.id); setOpen(false) }}
        style={{
          flex: 1,
          background: istAktiv ? 'rgba(255,185,85,0.08)' : 'transparent',
          border: 'none',
          padding: '0.75rem 0.875rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-family)',
          color: istAktiv ? 'var(--color-secondary)' : 'var(--color-on-surface)',
          fontSize: '0.875rem',
          fontWeight: istAktiv ? 700 : 400,
          transition: 'background 0.1s'
        }}
        onMouseEnter={e => { if (!istAktiv) e.currentTarget.style.background = 'var(--color-surface-container)' }}
        onMouseLeave={e => { if (!istAktiv) e.currentTarget.style.background = istAktiv ? 'rgba(255,185,85,0.08)' : 'transparent' }}
      >
        <span>{j.jahr}</span>
        {istAktiv && (
          <span style={{
            fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--color-secondary)'
          }}>Aktiv</span>
        )}
      </button>
      {!istAktiv && (
        <button
          className="del-btn"
          onClick={e => { e.stopPropagation(); setDeleteConfirm(j.id) }}
          style={{
            position: 'absolute', right: '0.5rem',
            opacity: 0, transition: 'opacity 0.15s',
            background: 'transparent', border: 'none',
            cursor: 'pointer', padding: '0.25rem',
            color: 'var(--color-error)', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}
          title={`Jahr ${j.jahr} löschen`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
})}
```

- [ ] **Schritt 6: Lösch-Bestätigungsdialog rendern**

Am Ende der `JahrSelector`-Komponente, direkt vor dem schließenden `</div>`:

```jsx
{deleteConfirm && (() => {
  const jahrObj = jahre.find(j => j.id === deleteConfirm)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      onClick={() => setDeleteConfirm(null)}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springGentle}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-surface-container-highest)',
          border: '1px solid var(--color-outline-variant)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          maxWidth: 380, width: '90%'
        }}
      >
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>
          Jahr {jahrObj?.jahr} löschen?
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Alle Daten für {jahrObj?.jahr} werden unwiderruflich gelöscht — Einnahmen, Ausgaben, Belege und Transaktionen.
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setDeleteConfirm(null)}
            style={{
              background: 'transparent', border: '1px solid var(--color-outline-variant)',
              borderRadius: 'var(--radius-lg)', padding: '0.625rem 1.25rem',
              cursor: 'pointer', fontFamily: 'var(--font-family)',
              color: 'var(--color-on-surface)', fontSize: '0.875rem'
            }}
          >Abbrechen</button>
          <button
            onClick={() => { onDeleteJahr(deleteConfirm); setDeleteConfirm(null); setOpen(false) }}
            style={{
              background: 'var(--color-error)', border: 'none',
              borderRadius: 'var(--radius-lg)', padding: '0.625rem 1.25rem',
              cursor: 'pointer', fontFamily: 'var(--font-family)',
              color: 'white', fontSize: '0.875rem', fontWeight: 600
            }}
          >Löschen</button>
        </div>
      </motion.div>
    </motion.div>
  )
})()}
```

- [ ] **Schritt 7: `JahrSelector` Props um `onAddJahr` und `onDeleteJahr` erweitern**

Funktionssignatur ändern:

```js
function JahrSelector({ jahre, activeJahr, onChangeJahr, onAddJahr, onDeleteJahr }) {
```

- [ ] **Schritt 8: `handleAddJahr` und `handleDeleteJahr` in `AppShell` implementieren**

Nach der bestehenden `handleChangeJahr`-Funktion einfügen:

```js
async function handleAddJahr(jahr) {
  const sp = window.steuerpilot
  try {
    await sp.steuerjahr.anlegen(jahr)
    await loadShellData()
  } catch (err) {
    console.error('Jahr anlegen fehlgeschlagen:', err)
  }
}

async function handleDeleteJahr(jahrId) {
  const sp = window.steuerpilot
  try {
    await sp.steuerjahr.loeschen(jahrId)
    // Falls gelöschtes Jahr aktiv war, auf erstes verfügbares wechseln
    if (jahrId === activeJahr) {
      const neueJahre = jahre.filter(j => j.id !== jahrId)
      const erstesJahr = neueJahre[0]
      if (erstesJahr) {
        await sp.db.run('UPDATE steuerjahre SET aktiv = 0', [])
        await sp.db.run('UPDATE steuerjahre SET aktiv = 1 WHERE id = ?', [erstesJahr.id])
        setActiveJahr(erstesJahr.id)
      }
    }
    await loadShellData()
  } catch (err) {
    console.error('Jahr löschen fehlgeschlagen:', err)
  }
}
```

- [ ] **Schritt 9: `Sidebar` Props und `JahrSelector` Aufruf aktualisieren**

`Sidebar`-Komponente Signatur:
```js
function Sidebar({ activeScreen, onNavigate, nutzer, jahre, activeJahr, onChangeJahr, onAddJahr, onDeleteJahr }) {
```

`JahrSelector`-Aufruf in Sidebar:
```jsx
<JahrSelector
  jahre={jahre}
  activeJahr={activeJahr}
  onChangeJahr={onChangeJahr}
  onAddJahr={onAddJahr}
  onDeleteJahr={onDeleteJahr}
/>
```

`Sidebar`-Aufruf in `AppShell`:
```jsx
<Sidebar
  activeScreen={activeScreen}
  onNavigate={onNavigate}
  nutzer={nutzer}
  jahre={jahre}
  activeJahr={activeJahr}
  onChangeJahr={handleChangeJahr}
  onAddJahr={handleAddJahr}
  onDeleteJahr={handleDeleteJahr}
/>
```

- [ ] **Schritt 10: App starten und JahrSelector testen**

```bash
npm run dev
```
Prüfen:
- "+" Button erscheint im JahrSelector neben dem Chevron
- Klick öffnet Liste verfügbarer Jahre
- Hovern über ein Jahr zeigt Löschen-Icon
- Löschen-Bestätigungsdialog erscheint und schließt korrekt

- [ ] **Schritt 11: Commit**

```bash
git add src/components/AppShell/AppShell.jsx
git commit -m "feat: add year add/delete to JahrSelector"
```

---

## Task 4: Auto-Jahresanlage beim App-Start

**Files:**
- Modify: `src/components/AppShell/AppShell.jsx`

- [ ] **Schritt 1: Auto-Check in `loadShellData` ergänzen**

Am Ende von `loadShellData`, nach `setActiveJahr(aktiv?.id ?? ...)`:

```js
// Aktuelles Kalenderjahr automatisch anlegen wenn noch nicht vorhanden
const aktuellesJahr = new Date().getFullYear()
const jahrExistiert = jahreRows?.some(j => j.jahr === aktuellesJahr)
if (!jahrExistiert) {
  await window.steuerpilot.steuerjahr.anlegen(aktuellesJahr)
  // Liste neu laden nach dem Anlegen
  const aktualisierteJahre = await window.steuerpilot.db.all(
    'SELECT id, jahr, aktiv FROM steuerjahre ORDER BY jahr DESC', []
  )
  setJahre(aktualisierteJahre ?? [])
  const aktivNeu = aktualisierteJahre?.find(j => j.aktiv === 1)
  setActiveJahr(aktivNeu?.id ?? aktualisierteJahre?.[0]?.id ?? null)
}
```

- [ ] **Schritt 2: App starten und prüfen**

```bash
npm run dev
```
Wenn die DB nur 2024 + 2025 enthält und heute 2026 ist: JahrSelector sollte 2026 automatisch anzeigen.

- [ ] **Schritt 3: Commit**

```bash
git add src/components/AppShell/AppShell.jsx
git commit -m "feat: auto-create current calendar year on app start"
```

---

## Task 5: JahresübernahmeModal + AppShell-Integration

**Files:**
- Modify: `src/components/AppShell/AppShell.jsx`

- [ ] **Schritt 1: State für Übernahme-Modal ergänzen**

In `AppShell`, nach den bestehenden useState-Zeilen:

```js
const [ubernahmeAngebot, setUbernahmeAngebot] = useState(null)
// { zielJahrId, quellJahrId, quellJahr } | null
```

- [ ] **Schritt 2: Übernahme-Check nach Jahreswechsel einbauen**

Die bestehende `handleChangeJahr`-Funktion erweitern:

```js
async function handleChangeJahr(jahrId) {
  if (jahrId === activeJahr) return
  const sp = window.steuerpilot
  try {
    await sp.db.run('UPDATE steuerjahre SET aktiv = 0', [])
    await sp.db.run('UPDATE steuerjahre SET aktiv = 1 WHERE id = ?', [jahrId])
    setActiveJahr(jahrId)

    // Übernahme-Check: neues Jahr leer + Vorjahr hat Daten?
    const pruefung = await sp.jahresubernahme.pruefen(jahrId)
    if (pruefung.sollAnbieten) {
      setUbernahmeAngebot({
        zielJahrId: jahrId,
        quellJahrId: pruefung.quellJahrId,
        quellJahr: pruefung.quellJahr
      })
    }
  } catch (err) {
    console.error('Jahreswechsel fehlgeschlagen:', err)
  }
}
```

- [ ] **Schritt 3: Übernahme-Check auch beim App-Start (nach loadShellData)**

Am Ende von `loadShellData`, nach dem Auto-Jahr-Block aus Task 4, das `activeJahr` aus dem State ist da noch nicht aktuell — stattdessen das ermittelte `aktivId` nutzen:

```js
// Übernahme-Check beim Start
const aktivId = aktiv?.id ?? jahreRows?.[0]?.id ?? null
if (aktivId) {
  const pruefung = await window.steuerpilot.jahresubernahme.pruefen(aktivId)
  if (pruefung.sollAnbieten) {
    setUbernahmeAngebot({
      zielJahrId: aktivId,
      quellJahrId: pruefung.quellJahrId,
      quellJahr: pruefung.quellJahr
    })
  }
}
```

- [ ] **Schritt 4: `JahresübernahmeModal` implementieren**

Als neue Komponente direkt über `AppShell` (nach `Sidebar`, vor `export default`):

```jsx
function JahresubernahmeModal({ angebot, onUbernehmen, onAbbrechen }) {
  const [loading, setLoading] = useState(false)
  const zielJahrObj = { jahr: '?' } // wird von außen als Prop übergeben
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        transition={springGentle}
        style={{
          background: 'var(--color-surface-container-highest)',
          border: '1px solid var(--color-outline-variant)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          maxWidth: 420, width: '90%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{
          fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--color-secondary)',
          marginBottom: '0.75rem'
        }}>
          Neues Steuerjahr
        </div>
        <div style={{
          fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-on-surface)',
          letterSpacing: '-0.02em', marginBottom: '0.75rem'
        }}>
          Daten aus {angebot.quellJahr} übernehmen?
        </div>
        <div style={{
          fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)',
          lineHeight: 1.6, marginBottom: '1.25rem'
        }}>
          Ich kann folgendes aus {angebot.quellJahr} als Ausgangspunkt übernehmen:
        </div>
        <ul style={{
          margin: '0 0 1.5rem 0', padding: '0',
          listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem'
        }}>
          {['Nutzerprofil (Name, Steuer-ID, IBAN)', 'Wizard-Vorausfüllung (Fahrtkosten, Homeoffice, …)'].map(item => (
            <li key={item} style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              fontSize: '0.8125rem', color: 'var(--color-on-surface)'
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--color-tertiary-container)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="var(--color-on-tertiary-container)"
                    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onAbbrechen}
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-outline-variant)',
              borderRadius: 'var(--radius-lg)', padding: '0.625rem 1.25rem',
              cursor: 'pointer', fontFamily: 'var(--font-family)',
              color: 'var(--color-on-surface)', fontSize: '0.875rem'
            }}
          >Leer starten</button>
          <button
            onClick={async () => {
              setLoading(true)
              await onUbernehmen()
              setLoading(false)
            }}
            disabled={loading}
            style={{
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: 'var(--radius-lg)', padding: '0.625rem 1.25rem',
              cursor: loading ? 'default' : 'pointer',
              fontFamily: 'var(--font-family)',
              color: 'var(--color-on-primary)', fontSize: '0.875rem', fontWeight: 600,
              opacity: loading ? 0.7 : 1
            }}
          >{loading ? 'Wird übernommen…' : 'Übernehmen'}</button>
        </div>
      </motion.div>
    </motion.div>
  )
}
```

- [ ] **Schritt 5: `handleUbernehmen` implementieren und Modal in AppShell rendern**

In `AppShell` nach `handleDeleteJahr`:

```js
async function handleUbernehmen() {
  if (!ubernahmeAngebot) return
  try {
    await window.steuerpilot.jahresubernahme.ausfuehren({
      zielJahrId: ubernahmeAngebot.zielJahrId,
      quellJahrId: ubernahmeAngebot.quellJahrId
    })
  } catch (err) {
    console.error('Übernahme fehlgeschlagen:', err)
  } finally {
    setUbernahmeAngebot(null)
  }
}
```

Im JSX von `AppShell`, direkt vor dem schließenden `</motion.div>` des Wrappers:

```jsx
<AnimatePresence>
  {ubernahmeAngebot && (
    <JahresubernahmeModal
      key="ubernahme-modal"
      angebot={ubernahmeAngebot}
      onUbernehmen={handleUbernehmen}
      onAbbrechen={() => setUbernahmeAngebot(null)}
    />
  )}
</AnimatePresence>
```

- [ ] **Schritt 6: App testen**

```bash
npm run dev
```
Prüfen: Jahreswechsel auf ein leeres Jahr mit vorhandenen Vorjahresdaten → Modal erscheint → "Übernehmen" → keine Fehlermeldung → Modal schließt.

- [ ] **Schritt 7: Commit**

```bash
git add src/components/AppShell/AppShell.jsx
git commit -m "feat: add Jahresubernahme modal and auto-check on year change"
```

---

## Task 6: Wizard — manueller „Vom Vorjahr übernehmen" Button

**Files:**
- Modify: `src/screens/Wizard/WizardScreen.jsx`

- [ ] **Schritt 1: State und Effekt für Übernahme-Angebot ergänzen**

In `WizardScreen` (der Hauptkomponente), nach den bestehenden useState-Zeilen:

```js
const [ubernahmeAngebot, setUbernahmeAngebot] = useState(null)

useEffect(() => {
  if (!activeJahr?.id) return
  window.steuerpilot.jahresubernahme.pruefen(activeJahr.id).then(pruefung => {
    if (pruefung.sollAnbieten) setUbernahmeAngebot(pruefung)
    else setUbernahmeAngebot(null)
  }).catch(() => setUbernahmeAngebot(null))
}, [activeJahr?.id])
```

- [ ] **Schritt 2: Button im Wizard-Header ergänzen**

Im bestehenden Header-Bereich (suche nach `<StepIndicator`) — direkt über dem `<StepIndicator>`:

```jsx
{ubernahmeAngebot && (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={springGentle}
    style={{
      padding: '0.625rem 2rem',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end'
    }}
  >
    <button
      onClick={() => setShowUbernahmeModal(true)}
      style={{
        background: 'rgba(255,185,85,0.1)',
        border: '1px solid rgba(255,185,85,0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.5rem 1rem',
        cursor: 'pointer',
        fontFamily: 'var(--font-family)',
        color: 'var(--color-secondary)',
        fontSize: '0.8125rem', fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: '0.5rem'
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      Vom Vorjahr übernehmen ({ubernahmeAngebot.quellJahr})
    </button>
  </motion.div>
)}
```

- [ ] **Schritt 3: `showUbernahmeModal` State und Modal-Logik ergänzen**

Nach dem `ubernahmeAngebot`-State:

```js
const [showUbernahmeModal, setShowUbernahmeModal] = useState(false)

async function handleWizardUbernehmen() {
  if (!ubernahmeAngebot || !activeJahr?.id) return
  try {
    await window.steuerpilot.jahresubernahme.ausfuehren({
      zielJahrId: activeJahr.id,
      quellJahrId: ubernahmeAngebot.quellJahrId
    })
    setUbernahmeAngebot(null)
    setShowUbernahmeModal(false)
    // Draft neu laden damit Wizard mit den übernommenen Daten befüllt wird
    await ladeDraft(activeJahr.id)
  } catch (err) {
    console.error('Wizard Übernahme fehlgeschlagen:', err)
  }
}
```

- [ ] **Schritt 4: Modal im Wizard-JSX rendern**

Im JSX des Wizard, direkt vor dem schließenden `</div>` des Wrappers (wo der Content ist):

```jsx
<AnimatePresence>
  {showUbernahmeModal && ubernahmeAngebot && (
    <JahresubernahmeModal
      key="wizard-ubernahme"
      angebot={ubernahmeAngebot}
      onUbernehmen={handleWizardUbernehmen}
      onAbbrechen={() => setShowUbernahmeModal(false)}
    />
  )}
</AnimatePresence>
```

**Hinweis:** `JahresubernahmeModal` ist in `AppShell.jsx` definiert. Da es auch im Wizard gebraucht wird, muss es in eine eigene Datei extrahiert werden.

- [ ] **Schritt 5: `JahresubernahmeModal` in eigene Datei auslagern**

Neue Datei `src/components/JahresubernahmeModal/JahresubernahmeModal.jsx` erstellen mit dem Modal-Code aus Task 5 Schritt 4 (inklusive `import { useState } from 'react'`, `import { motion, AnimatePresence } from 'framer-motion'`, `import { springGentle } from '../../theme/tokens.js'`).

In `AppShell.jsx` und `WizardScreen.jsx`:
```js
import JahresubernahmeModal from '../JahresubernahmeModal/JahresubernahmeModal.jsx'
// bzw. in WizardScreen:
import JahresubernahmeModal from '../../components/JahresubernahmeModal/JahresubernahmeModal.jsx'
```

Den Modal-Code aus `AppShell.jsx` entfernen.

- [ ] **Schritt 6: App testen**

```bash
npm run dev
```
Prüfen: Wizard zeigt Button "Vom Vorjahr übernehmen (2024)" wenn Vorjahr Daten hat und aktuelles Jahr leer ist.

- [ ] **Schritt 7: Commit**

```bash
git add src/screens/Wizard/WizardScreen.jsx src/components/JahresubernahmeModal/JahresubernahmeModal.jsx src/components/AppShell/AppShell.jsx
git commit -m "feat: add manual Jahresubernahme button in WizardScreen"
```

---

## Task 7: Dashboard — JahresvergleichWidget

**Files:**
- Modify: `src/screens/Dashboard/DashboardScreen.jsx`

- [ ] **Schritt 1: `JahresvergleichWidget`-Komponente ergänzen**

Neue Komponente direkt vor `DashboardScreen` (der Hauptkomponente):

```jsx
function JahresvergleichWidget({ delay = 0, onNavigate }) {
  const [daten, setDaten] = useState(null)

  useEffect(() => {
    window.steuerpilot.vergleich.laden().then(ergebnisse => {
      const mitDaten = ergebnisse.filter(e => e.einnahmen > 0 || e.ausgaben > 0)
      if (mitDaten.length >= 2) setDaten(mitDaten)
    }).catch(() => {})
  }, [])

  if (!daten) return null

  const aktuell = daten[daten.length - 1]
  const vorjahr = daten[daten.length - 2]

  function delta(neu, alt) {
    if (!alt || alt === 0) return null
    const pct = Math.round(((neu - alt) / Math.abs(alt)) * 100)
    return pct
  }

  function DeltaBadge({ wert }) {
    if (wert === null) return null
    const pos = wert >= 0
    return (
      <span style={{
        fontSize: '0.625rem', fontWeight: 700,
        color: pos ? 'var(--color-tertiary)' : 'var(--color-error)',
        background: pos ? 'rgba(168,199,160,0.12)' : 'rgba(255,138,128,0.1)',
        padding: '0.125rem 0.375rem',
        borderRadius: 'var(--radius-pill)',
        marginLeft: '0.375rem'
      }}>
        {pos ? '+' : ''}{wert}%
      </span>
    )
  }

  const reihen = [
    { label: 'Einnahmen', aktuellWert: aktuell.einnahmen, vorjahrWert: vorjahr.einnahmen },
    { label: 'Werbungskosten', aktuellWert: aktuell.ausgaben, vorjahrWert: vorjahr.ausgaben },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springGentle, delay }}
      onClick={onNavigate ? () => onNavigate('jahresvergleich') : undefined}
      style={{
        background: 'var(--color-surface-container)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        cursor: onNavigate ? 'pointer' : 'default'
      }}
      onMouseEnter={onNavigate ? e => { e.currentTarget.style.filter = 'brightness(1.06)' } : undefined}
      onMouseLeave={onNavigate ? e => { e.currentTarget.style.filter = '' } : undefined}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <div>
          <div style={{
            fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--color-on-surface-variant)'
          }}>Jahresvergleich</div>
          <div style={{
            fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-on-surface)', marginTop: '0.125rem'
          }}>{vorjahr.jahr} → {aktuell.jahr}</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-on-surface-variant)' }}>
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {reihen.map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{r.label}</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                {formatEuro(r.aktuellWert)}
              </span>
              <DeltaBadge wert={delta(r.aktuellWert, r.vorjahrWert)} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
```

- [ ] **Schritt 2: Widget in DashboardScreen einbinden**

Im JSX von `DashboardScreen`, nach dem `EstimateCard`-Block und vor der unteren Reihe (DeadlineCard + ChecklistCard):

```jsx
{/* Jahresvergleich Widget — nur wenn Vorjahresdaten existieren */}
<div style={{ marginBottom: '1rem' }}>
  <JahresvergleichWidget delay={0.21} onNavigate={onNavigate} />
</div>
```

- [ ] **Schritt 3: App testen**

```bash
npm run dev
```
Prüfen: Widget erscheint nur wenn mindestens 2 Jahre mit Daten vorhanden. Klick navigiert (wird erst in Task 9 funktionieren — vorerst kein Crash).

- [ ] **Schritt 4: Commit**

```bash
git add src/screens/Dashboard/DashboardScreen.jsx
git commit -m "feat: add JahresvergleichWidget to Dashboard"
```

---

## Task 8: JahresvergleichScreen

**Files:**
- Create: `src/screens/Jahresvergleich/JahresvergleichScreen.jsx`

- [ ] **Schritt 1: Screen-Datei anlegen**

```jsx
// src/screens/Jahresvergleich/JahresvergleichScreen.jsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { springGentle } from '../../theme/tokens.js'
import { schaetzeRueckerstattung } from '../../engine/steuerberechnung.js'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts'

const JAHR_FARBEN = ['#1E3A5F', '#F5A623', '#4fc3f7', '#aed581', '#ce93d8']

function formatEuro(value) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value ?? 0)
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--color-surface-container-highest)',
      border: '1px solid var(--color-outline-variant)',
      borderRadius: 'var(--radius-lg)',
      padding: '0.75rem 1rem',
      fontSize: '0.8125rem'
    }}>
      <div style={{ fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.fill, marginTop: '0.125rem' }}>
          {p.name}: {formatEuro(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function JahresvergleichScreen() {
  const [daten, setDaten] = useState([])
  const [loading, setLoading] = useState(true)
  const [aktivJahre, setAktivJahre] = useState(new Set())

  useEffect(() => {
    ladeDaten()
  }, [])

  async function ladeDaten() {
    setLoading(true)
    try {
      const ergebnisse = await window.steuerpilot.vergleich.laden()
      // Rückerstattung schätzen
      const mitRueckerstattung = ergebnisse.map(e => {
        let rueckerstattung = 0
        if (e.einnahmen > 0) {
          try {
            const r = schaetzeRueckerstattung({
              bruttoJahreslohn: e.einnahmen,
              einbehalteneLoHSt: 0,
              werbungskosten: e.ausgaben,
              sonderausgaben: 0,
              jahr: e.jahr
            })
            rueckerstattung = Math.abs(r.geschaetzteRueckerstattung)
          } catch {}
        }
        return { ...e, rueckerstattung }
      })
      setDaten(mitRueckerstattung)
      setAktivJahre(new Set(mitRueckerstattung.map(e => e.jahr)))
    } catch (err) {
      console.error('Jahresvergleich laden:', err)
    } finally {
      setLoading(false)
    }
  }

  function toggleJahr(jahr) {
    setAktivJahre(prev => {
      const next = new Set(prev)
      if (next.has(jahr)) {
        if (next.size > 1) next.delete(jahr) // mindestens ein Jahr immer aktiv
      } else {
        next.add(jahr)
      }
      return next
    })
  }

  const sichtbareDaten = daten.filter(e => aktivJahre.has(e.jahr))

  // Daten für BarChart: eine Zeile pro Metrik mit Spalten pro Jahr
  const einnahmenData = [{ name: 'Einnahmen', ...Object.fromEntries(sichtbareDaten.map(e => [e.jahr, e.einnahmen])) }]
  const ausgabenData = [{ name: 'Werbungskosten', ...Object.fromEntries(sichtbareDaten.map(e => [e.jahr, e.ausgaben])) }]
  const rueckerstattungData = [{ name: 'Rückerstattung', ...Object.fromEntries(sichtbareDaten.map(e => [e.jahr, e.rueckerstattung])) }]

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>Laden…</div>
      </div>
    )
  }

  if (daten.length < 2) {
    return (
      <div style={{ padding: '2.5rem', maxWidth: 900, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springGentle}
          style={{
            background: 'var(--color-surface-container)',
            borderRadius: 'var(--radius-xl)',
            padding: '3rem', textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>
            Noch keine Vergleichsdaten
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
            Sobald du Daten für mindestens zwei Steuerjahre erfasst hast, erscheint hier der Vergleich.
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.05 }}
        style={{ marginBottom: '2rem' }}
      >
        <div style={{
          fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--color-secondary)', marginBottom: '0.375rem'
        }}>
          Jahresvergleich
        </div>
        <h1 style={{
          fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em',
          color: 'var(--color-on-surface)', lineHeight: 1.15, marginBottom: '0.375rem'
        }}>
          Deine Steuerjahre im Vergleich
        </h1>
      </motion.div>

      {/* Jahr-Pills */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.1 }}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}
      >
        {daten.map((e, i) => (
          <button
            key={e.jahr}
            onClick={() => toggleJahr(e.jahr)}
            style={{
              background: aktivJahre.has(e.jahr) ? JAHR_FARBEN[i % JAHR_FARBEN.length] : 'var(--color-surface-container)',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              padding: '0.375rem 0.875rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              color: aktivJahre.has(e.jahr) ? 'white' : 'var(--color-on-surface-variant)',
              fontSize: '0.875rem', fontWeight: 600,
              transition: 'background 0.15s, color 0.15s'
            }}
          >
            {e.jahr}
          </button>
        ))}
      </motion.div>

      {/* Diagramme */}
      {[
        { titel: 'Einnahmen', data: einnahmenData },
        { titel: 'Werbungskosten', data: ausgabenData },
        { titel: 'Geschätzte Steuerersparnis', data: rueckerstattungData },
      ].map(({ titel, data }, chartIdx) => (
        <motion.div
          key={titel}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.12 + chartIdx * 0.06 }}
          style={{
            background: 'var(--color-surface-container)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            marginBottom: '1rem'
          }}
        >
          <div style={{
            fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--color-on-surface-variant)',
            marginBottom: '1.25rem'
          }}>
            {titel}
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data} barCategoryGap="30%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-container-high)" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis
                tickFormatter={v => `${Math.round(v / 1000)}k`}
                tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {sichtbareDaten.map((e, i) => (
                <Bar
                  key={e.jahr}
                  dataKey={e.jahr}
                  name={String(e.jahr)}
                  fill={JAHR_FARBEN[daten.findIndex(d => d.jahr === e.jahr) % JAHR_FARBEN.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      ))}

      {/* Tabelle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.3 }}
        style={{
          background: 'var(--color-surface-container)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          overflowX: 'auto'
        }}
      >
        <div style={{
          fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--color-on-surface-variant)',
          marginBottom: '1rem'
        }}>
          Übersicht
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
                Kategorie
              </th>
              {sichtbareDaten.map((e, i) => (
                <th key={e.jahr} style={{
                  textAlign: 'right', padding: '0.5rem 0.75rem',
                  color: JAHR_FARBEN[daten.findIndex(d => d.jahr === e.jahr) % JAHR_FARBEN.length],
                  fontWeight: 700
                }}>
                  {e.jahr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Einnahmen', key: 'einnahmen', format: formatEuro },
              { label: 'Werbungskosten', key: 'ausgaben', format: formatEuro },
              { label: 'Belege', key: 'belege', format: v => `${v}` },
              { label: 'Steuerersparnis (Schätzung)', key: 'rueckerstattung', format: formatEuro },
            ].map((reihe, idx) => (
              <tr key={reihe.key} style={{
                background: idx % 2 === 0 ? 'transparent' : 'var(--color-surface-container-high)',
                borderRadius: 'var(--radius-md)'
              }}>
                <td style={{ padding: '0.625rem 0.75rem', color: 'var(--color-on-surface-variant)' }}>
                  {reihe.label}
                </td>
                {sichtbareDaten.map(e => (
                  <td key={e.jahr} style={{
                    padding: '0.625rem 0.75rem', textAlign: 'right',
                    color: 'var(--color-on-surface)', fontWeight: 500
                  }}>
                    {reihe.format(e[reihe.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  )
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/screens/Jahresvergleich/JahresvergleichScreen.jsx
git commit -m "feat: add JahresvergleichScreen with charts and table"
```

---

## Task 9: Navigation + App.jsx

**Files:**
- Modify: `src/components/AppShell/AppShell.jsx`
- Modify: `src/App.jsx`

- [ ] **Schritt 1: Nav-Icon für Jahresvergleich ergänzen**

In `AppShell.jsx`, nach `IconOptimierung()`:

```jsx
function IconVergleich() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
```

- [ ] **Schritt 2: NAV_ITEMS ergänzen**

In `AppShell.jsx`, `NAV_ITEMS`-Array — neuen Eintrag zwischen `optimierung` und `pdf` einfügen:

```js
{ id: 'jahresvergleich', label: 'Jahresvergleich', icon: <IconVergleich />, available: true },
```

- [ ] **Schritt 3: Screen in `App.jsx` einbinden**

Import ergänzen:
```js
import JahresvergleichScreen from './screens/Jahresvergleich/JahresvergleichScreen.jsx'
```

Im JSX nach dem `optimierung`-Block:
```jsx
{activeNav === 'jahresvergleich' && (
  <JahresvergleichScreen />
)}
```

- [ ] **Schritt 4: App vollständig testen**

```bash
npm run dev
```
Prüfen:
- "Jahresvergleich" erscheint in der Sidebar
- Screen lädt korrekt
- Widget im Dashboard navigiert bei Klick zu diesem Screen
- Bei weniger als 2 Jahren mit Daten: Empty State erscheint

- [ ] **Schritt 5: Alle Tests ausführen**

```bash
npm test
```
Erwartet: Alle Tests grün (mindestens die 6 neuen Engine-Tests aus Task 1 + bestehende Tests)

- [ ] **Schritt 6: Commit**

```bash
git add src/components/AppShell/AppShell.jsx src/App.jsx
git commit -m "feat: wire JahresvergleichScreen into navigation"
```

---

## Task 10: Logbuch + Push

**Files:**
- Modify: `docs/LOGBUCH.md`

- [ ] **Schritt 1: Logbucheintrag schreiben**

In `docs/LOGBUCH.md` oben einfügen:

```markdown
## 2026-03-27 — Phase 10: Jahresübernahme & Jahresvergleich

### Was wurde gebaut

**Engine (`src/engine/jahresubernahme.js`):**
- `bereiteDatenFuerNeuesJahr()` — kopiert Nutzerprofil + Wizard-Draft ins neue Jahr, setzt gespeicherte_ids zurück

**IPC + Preload:**
- `jahresubernahme:pruefen` / `jahresubernahme:ausfuehren`
- `steuerjahr:anlegen` / `steuerjahr:loeschen`
- `vergleich:laden`

**AppShell:**
- JahrSelector: "+" Button mit Auswahlliste, Löschen-Icon bei Hover, Bestätigungsdialog
- Auto-Anlage des aktuellen Kalenderjahres beim Start
- Automatischer Übernahme-Dialog beim Jahreswechsel auf ein leeres Jahr

**WizardScreen:**
- Manueller "Vom Vorjahr übernehmen"-Button im Header (nur wenn Vorjahr Daten hat)

**Dashboard:**
- JahresvergleichWidget: kompakter Vergleich Vorjahr vs. aktuell mit Δ-Prozentangabe

**JahresvergleichScreen:**
- Neuer Screen in der Navigation (zwischen Optimierungshinweise und PDF Export)
- Balkendiagramme (recharts) für Einnahmen, Werbungskosten, Steuerersparnis
- Vergleichstabelle mit allen Jahren
- Jahr-Pills zum Ein-/Ausblenden

### Entscheidungen

- JahresübernahmeModal in eigene Komponente ausgelagert (wird in AppShell + Wizard genutzt)
- recharts für Diagramme (bereits in Codebase, konsistent mit UmsatzCharts)
- Übernahme kopiert nicht: einnahmen, ausgaben, belege, transaktionen — nur Stammdaten + Wizard-Draft

### Offene Punkte / Nächste Schritte

- Einstellungen (Passwort ändern, Jetson-Verbindung, Sync-Status)
- iOS App — erst nach expliziter Rückfrage
```

- [ ] **Schritt 2: Finaler Commit + Push**

```bash
git add docs/LOGBUCH.md
git commit -m "docs: log Phase 10 Jahresubernahme & Jahresvergleich"
git push origin master
```
