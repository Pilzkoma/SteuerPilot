# Optimierungshinweise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen eigenen Screen "Optimierungshinweise" bauen, der regelbasiert zeigt welche Steuerabzüge der Nutzer noch ausschöpfen könnte, mit Button zur Navigation in den Wizard.

**Architecture:** Pure-JS-Engine-Funktion `berechneOptimierungshinweise()` analysiert die gespeicherten Wizard-Daten aus der DB und gibt strukturierte Hinweis-Objekte zurück. Der Screen lädt diese Daten, ruft die Funktion auf und rendert Hinweis-Karten. Jetson/KI kann später Hinweise im gleichen Format liefern.

**Tech Stack:** Vitest (Tests), React/JSX (UI), Framer Motion (Animationen), SQLCipher via `window.steuerpilot.db` (Daten)

---

## File Map

| Datei | Aktion | Zweck |
|-------|--------|-------|
| `src/engine/optimierung.js` | Neu | Pure-JS-Funktion `berechneOptimierungshinweise()` |
| `src/engine/optimierung.test.js` | Neu | Unit-Tests für die Engine-Funktion |
| `src/screens/Optimierung/OptimierungScreen.jsx` | Neu | Screen-Komponente |
| `src/components/AppShell/AppShell.jsx` | Ändern | Nav-Eintrag + Icon hinzufügen |
| `src/App.jsx` | Ändern | Import + Rendering des neuen Screens |

---

## Task 1: Engine-Funktion mit Tests

**Files:**
- Create: `src/engine/optimierung.js`
- Create: `src/engine/optimierung.test.js`

- [ ] **Schritt 1: Test-Datei anlegen mit erstem fehlschlagenden Test**

Datei `src/engine/optimierung.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { berechneOptimierungshinweise } from './optimierung.js'

function emptyDaten() {
  return {
    lohn: { bruttogehalt: '', lohnsteuer: '', soli: '', kirchensteuer: '', honorar: '' },
    fahrtkosten: { km: '', arbeitstage: '', oeffentlich: false, oeffentlichKosten: '' },
    homeoffice: { tage: '' },
    arbeitsmittel: [],
    sonderausgaben: { krankenversicherung: '', altersvorsorge: '', spenden: '' },
    betriebsausgaben: [],
    gespeicherte_ids: { einnahmen: [], ausgaben: [] }
  }
}

describe('berechneOptimierungshinweise', () => {
  it('gibt leeres Array zurück wenn alle Felder ausgefüllt sind', () => {
    const daten = emptyDaten()
    daten.homeoffice.tage = '100'
    daten.arbeitsmittel = [{ betrag: '500', beschreibung: 'Laptop' }]
    daten.sonderausgaben.krankenversicherung = '2000'
    daten.sonderausgaben.altersvorsorge = '1000'
    daten.sonderausgaben.spenden = '200'
    daten.fahrtkosten.km = '20'
    daten.fahrtkosten.arbeitstage = '220'
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    expect(hinweise).toEqual([])
  })

  it('meldet homeoffice_fehlt wenn tage = 0', () => {
    const daten = emptyDaten()
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const ids = hinweise.map(h => h.id)
    expect(ids).toContain('homeoffice_fehlt')
  })

  it('meldet arbeitsmittel_fehlt wenn Array leer', () => {
    const daten = emptyDaten()
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const ids = hinweise.map(h => h.id)
    expect(ids).toContain('arbeitsmittel_fehlt')
  })

  it('meldet krankenversicherung_fehlt wenn Wert = 0', () => {
    const daten = emptyDaten()
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const ids = hinweise.map(h => h.id)
    expect(ids).toContain('krankenversicherung_fehlt')
  })

  it('meldet altersvorsorge_fehlt wenn Wert = 0', () => {
    const daten = emptyDaten()
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const ids = hinweise.map(h => h.id)
    expect(ids).toContain('altersvorsorge_fehlt')
  })

  it('meldet fahrtkosten_fehlt nur für Angestellte wenn km = 0', () => {
    const daten = emptyDaten()
    const angestellterHinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const freelancerHinweise = berechneOptimierungshinweise(daten, 'freelancer', 2025)
    expect(angestellterHinweise.map(h => h.id)).toContain('fahrtkosten_fehlt')
    expect(freelancerHinweise.map(h => h.id)).not.toContain('fahrtkosten_fehlt')
  })

  it('meldet werbungskosten_pauschbetrag wenn Werbungskosten > 0 aber < 1230', () => {
    const daten = emptyDaten()
    daten.homeoffice.tage = '10'     // 60 € — unter Pauschbetrag
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const ids = hinweise.map(h => h.id)
    expect(ids).toContain('werbungskosten_pauschbetrag')
  })

  it('meldet werbungskosten_pauschbetrag NICHT wenn Werbungskosten >= 1230', () => {
    const daten = emptyDaten()
    daten.fahrtkosten.km = '20'
    daten.fahrtkosten.arbeitstage = '220'  // 1320 € > Pauschbetrag
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const ids = hinweise.map(h => h.id)
    expect(ids).not.toContain('werbungskosten_pauschbetrag')
  })

  it('jeder Hinweis hat id, titel, beschreibung, prioritaet, wizardSchritt', () => {
    const daten = emptyDaten()
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    for (const h of hinweise) {
      expect(h).toHaveProperty('id')
      expect(h).toHaveProperty('titel')
      expect(h).toHaveProperty('beschreibung')
      expect(h).toHaveProperty('prioritaet')
      expect(h).toHaveProperty('wizardSchritt')
      expect(['hoch', 'mittel', 'niedrig']).toContain(h.prioritaet)
    }
  })

  it('sortiert nach Priorität: hoch → mittel → niedrig', () => {
    const daten = emptyDaten()
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const reihenfolge = { hoch: 0, mittel: 1, niedrig: 2 }
    for (let i = 1; i < hinweise.length; i++) {
      expect(reihenfolge[hinweise[i].prioritaet]).toBeGreaterThanOrEqual(
        reihenfolge[hinweise[i - 1].prioritaet]
      )
    }
  })
})
```

- [ ] **Schritt 2: Tests fehlschlagen lassen**

```bash
npm test -- optimierung
```

Erwartet: FAIL — `berechneOptimierungshinweise` nicht gefunden

- [ ] **Schritt 3: Engine-Funktion implementieren**

Datei `src/engine/optimierung.js`:

```js
/**
 * SteuerPilot Engine — Optimierungshinweise
 *
 * Kein Electron. Kein Node. Pure JS — vollständig unit-testbar.
 * Analysiert eingegebene Steuerdaten und gibt Hinweise auf nicht ausgeschöpfte Abzüge.
 */

import { getJahreswerte, berechneFahrtkosten, berechneHomeofficePauschale } from './steuerberechnung.js'

const PRIORITAET_ORDER = { hoch: 0, mittel: 1, niedrig: 2 }

/**
 * Berechnet Optimierungshinweise basierend auf eingegebenen Steuerdaten.
 *
 * @param {object} daten - Wizard-Daten: { lohn, fahrtkosten, homeoffice, arbeitsmittel, sonderausgaben, betriebsausgaben }
 * @param {'angestellter'|'freelancer'|'selbstaendiger'} nutzertyp
 * @param {number} jahr
 * @returns {Array<{id: string, titel: string, beschreibung: string, potenzial: number|null, prioritaet: string, wizardSchritt: string}>}
 */
export function berechneOptimierungshinweise(daten, nutzertyp, jahr = 2025) {
  const { lohn, fahrtkosten, homeoffice, arbeitsmittel, sonderausgaben } = daten
  const werte = getJahreswerte(jahr)
  const istAngestellter = nutzertyp === 'angestellter'
  const hinweise = []

  // ── Homeoffice ───────────────────────────────────────────────────────────────
  const homeofficeTage = parseInt(homeoffice?.tage) || 0
  if (homeofficeTage === 0) {
    hinweise.push({
      id: 'homeoffice_fehlt',
      titel: 'Homeoffice-Pauschale nicht eingetragen',
      beschreibung: `Für jeden Tag im Homeoffice kannst du ${werte.homeofficeTagespauschale} € absetzen — bis zu ${werte.homeofficeMaxTage * werte.homeofficeTagespauschale} € im Jahr. Auch einzelne Tage zählen.`,
      potenzial: werte.homeofficeMaxTage * werte.homeofficeTagespauschale,
      prioritaet: 'hoch',
      wizardSchritt: 'homeoffice'
    })
  }

  // ── Fahrtkosten (nur Angestellte) ────────────────────────────────────────────
  if (istAngestellter) {
    const kmEinfach = parseFloat(fahrtkosten?.km) || 0
    const arbeitstage = parseInt(fahrtkosten?.arbeitstage) || 0
    const oeffentlichKosten = parseFloat(fahrtkosten?.oeffentlichKosten) || 0
    const hatFahrtkosten = (kmEinfach > 0 && arbeitstage > 0) || oeffentlichKosten > 0
    if (!hatFahrtkosten) {
      hinweise.push({
        id: 'fahrtkosten_fehlt',
        titel: 'Fahrtkosten nicht eingetragen',
        beschreibung: 'Für jeden Arbeitstag kannst du die Entfernung zur Arbeit absetzen — egal ob du mit dem Auto oder dem ÖPNV fährst.',
        potenzial: null,
        prioritaet: 'hoch',
        wizardSchritt: 'fahrtkosten'
      })
    }
  }

  // ── Krankenversicherung ──────────────────────────────────────────────────────
  const kranken = parseFloat(sonderausgaben?.krankenversicherung) || 0
  if (kranken === 0) {
    hinweise.push({
      id: 'krankenversicherung_fehlt',
      titel: 'Krankenversicherungsbeiträge nicht eingetragen',
      beschreibung: 'Deine Beiträge zur Kranken- und Pflegeversicherung sind als Sonderausgaben absetzbar. Schau auf deine Jahresmeldung von der Krankenkasse.',
      potenzial: null,
      prioritaet: 'hoch',
      wizardSchritt: 'sonderausgaben'
    })
  }

  // ── Arbeitsmittel ────────────────────────────────────────────────────────────
  const arbeitsmittelListe = arbeitsmittel ?? []
  const hatArbeitsmittel = arbeitsmittelListe.some(i => parseFloat(i.betrag) > 0)
  if (!hatArbeitsmittel) {
    hinweise.push({
      id: 'arbeitsmittel_fehlt',
      titel: 'Arbeitsmittel nicht eingetragen',
      beschreibung: `Beruflich genutzte Geräte, Software, Büromaterial und Fachliteratur sind absetzbar. Einzelposten unter ${werte.arbeitsmittelFreigrenze} € brauchen keine Belege.`,
      potenzial: null,
      prioritaet: 'mittel',
      wizardSchritt: 'arbeitsmittel'
    })
  }

  // ── Altersvorsorge ───────────────────────────────────────────────────────────
  const alters = parseFloat(sonderausgaben?.altersvorsorge) || 0
  if (alters === 0) {
    hinweise.push({
      id: 'altersvorsorge_fehlt',
      titel: 'Altersvorsorge nicht eingetragen',
      beschreibung: 'Beiträge zur gesetzlichen Rentenversicherung, Riester- oder Rürup-Rente sind als Sonderausgaben absetzbar.',
      potenzial: null,
      prioritaet: 'mittel',
      wizardSchritt: 'sonderausgaben'
    })
  }

  // ── Spenden ──────────────────────────────────────────────────────────────────
  const spenden = parseFloat(sonderausgaben?.spenden) || 0
  if (spenden === 0) {
    hinweise.push({
      id: 'spenden_fehlt',
      titel: 'Keine Spenden eingetragen',
      beschreibung: 'Spenden an gemeinnützige Organisationen sind bis zu 20 % deines Einkommens absetzbar. Spendenquittungen aufbewahren.',
      potenzial: null,
      prioritaet: 'niedrig',
      wizardSchritt: 'sonderausgaben'
    })
  }

  // ── Werbungskosten unter Pauschbetrag ────────────────────────────────────────
  const kmEinfach = parseFloat(fahrtkosten?.km) || 0
  const arbeitstage = parseInt(fahrtkosten?.arbeitstage) || 0
  const fahrtkostenBetrag = !fahrtkosten?.oeffentlich && kmEinfach > 0 && arbeitstage > 0
    ? berechneFahrtkosten(kmEinfach, arbeitstage, jahr)
    : fahrtkosten?.oeffentlich
      ? parseFloat(fahrtkosten?.oeffentlichKosten) || 0
      : 0
  const homeofficeBerechnet = homeofficeTage > 0 ? berechneHomeofficePauschale(homeofficeTage, jahr) : 0
  const arbeitsmittelSumme = arbeitsmittelListe.reduce((s, i) => s + (parseFloat(i.betrag) || 0), 0)
  const gesamtWerbungskosten = fahrtkostenBetrag + homeofficeBerechnet + arbeitsmittelSumme

  if (gesamtWerbungskosten > 0 && gesamtWerbungskosten < werte.arbeitnehmerPauschbetrag) {
    const differenz = Math.round((werte.arbeitnehmerPauschbetrag - gesamtWerbungskosten) * 100) / 100
    hinweise.push({
      id: 'werbungskosten_pauschbetrag',
      titel: `Noch ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(differenz)} bis zum Pauschbetrag`,
      beschreibung: `Der Arbeitnehmer-Pauschbetrag (${werte.arbeitnehmerPauschbetrag} €) wird automatisch angerechnet. Deine eingetragenen Werbungskosten liegen darunter — lohnt sich noch mehr einzutragen?`,
      potenzial: differenz,
      prioritaet: 'niedrig',
      wizardSchritt: 'arbeitsmittel'
    })
  }

  // ── Sortierung: hoch → mittel → niedrig ──────────────────────────────────────
  return hinweise.sort((a, b) => PRIORITAET_ORDER[a.prioritaet] - PRIORITAET_ORDER[b.prioritaet])
}
```

- [ ] **Schritt 4: Tests laufen lassen**

```bash
npm test -- optimierung
```

Erwartet: alle Tests PASS

- [ ] **Schritt 5: Commit**

```bash
git add src/engine/optimierung.js src/engine/optimierung.test.js
git commit -m "feat: add Optimierungshinweise engine function with tests"
```

---

## Task 2: OptimierungScreen

**Files:**
- Create: `src/screens/Optimierung/OptimierungScreen.jsx`

- [ ] **Schritt 1: Screen-Datei anlegen**

Datei `src/screens/Optimierung/OptimierungScreen.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { springGentle } from '../../theme/tokens.js'
import { berechneOptimierungshinweise } from '../../engine/optimierung.js'

function formatEuro(value) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value ?? 0)
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconBulb() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.2-1.2 4.1-3 5.2V17a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-2.8C7.2 13.1 6 11.2 6 9a6 6 0 0 1 6-6z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Priorität Badge ───────────────────────────────────────────────────────────

const PRIORITAET_STYLE = {
  hoch:    { bg: 'rgba(255,138,128,0.12)', color: '#FF8A80', label: 'Hoch' },
  mittel:  { bg: 'rgba(255,185,85,0.12)',  color: 'var(--color-secondary)', label: 'Mittel' },
  niedrig: { bg: 'rgba(168,199,160,0.12)', color: 'var(--color-tertiary)', label: 'Niedrig' },
}

function PrioritaetBadge({ prioritaet }) {
  const style = PRIORITAET_STYLE[prioritaet] ?? PRIORITAET_STYLE.niedrig
  return (
    <span style={{
      fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.12em',
      textTransform: 'uppercase',
      background: style.bg, color: style.color,
      padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-pill)'
    }}>
      {style.label}
    </span>
  )
}

// ── HinweisKarte ──────────────────────────────────────────────────────────────

function HinweisKarte({ hinweis, onNavigate, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springGentle, delay }}
      style={{
        background: 'var(--color-surface-container)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{
          width: 36, height: 36, flexShrink: 0, borderRadius: '50%',
          background: 'var(--color-surface-container-high)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-secondary)'
        }}>
          <IconBulb />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <span style={{
              fontSize: '0.9375rem', fontWeight: 700,
              color: 'var(--color-on-surface)', letterSpacing: '-0.01em'
            }}>
              {hinweis.titel}
            </span>
            <PrioritaetBadge prioritaet={hinweis.prioritaet} />
          </div>
          <p style={{
            fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)',
            margin: 0, lineHeight: 1.6
          }}>
            {hinweis.beschreibung}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        {hinweis.potenzial != null ? (
          <span style={{
            fontSize: '0.75rem', fontWeight: 700,
            color: 'var(--color-tertiary)',
            background: 'rgba(168,199,160,0.1)',
            padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-pill)'
          }}>
            bis zu {formatEuro(hinweis.potenzial)}
          </span>
        ) : (
          <span />
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate('wizard')}
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            padding: '0.5rem 1rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
            flexShrink: 0
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
          onMouseLeave={e => { e.currentTarget.style.filter = '' }}
        >
          Jetzt eintragen
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── OptimierungScreen ─────────────────────────────────────────────────────────

export default function OptimierungScreen({ activeJahr, nutzer, onNavigate }) {
  const [hinweise, setHinweise] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeJahr?.id) loadHinweise()
  }, [activeJahr?.id])

  async function loadHinweise() {
    setLoading(true)
    const db = window.steuerpilot.db
    const jahrId = activeJahr.id

    try {
      // Gleiche Abfrage wie WizardScreen beim Laden des Drafts
      const [einnahmenRows, ausgabenRows, fortschritt] = await Promise.all([
        db.all('SELECT * FROM einnahmen WHERE steuerjahr_id = ?', [jahrId]),
        db.all('SELECT * FROM ausgaben WHERE steuerjahr_id = ?', [jahrId]),
        db.get("SELECT wert FROM wizard_fortschritt WHERE steuerjahr_id = ? AND schritt = 'draft'", [jahrId])
      ])

      // Draft aus wizard_fortschritt laden (enthält alle Wizard-Felder als JSON)
      let daten = null
      if (fortschritt?.wert) {
        try { daten = JSON.parse(fortschritt.wert) } catch {}
      }

      if (!daten) {
        setHinweise([])
        setLoading(false)
        return
      }

      const nutzertyp = nutzer?.nutzertyp ?? 'angestellter'
      const jahr = activeJahr?.jahr ?? 2025
      const berechnet = berechneOptimierungshinweise(daten, nutzertyp, jahr)
      setHinweise(berechnet)
    } catch (err) {
      console.error('OptimierungScreen loadHinweise:', err)
      setHinweise([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      maxWidth: 720,
      margin: '0 auto',
      padding: '2.5rem 2rem',
      fontFamily: 'var(--font-family)'
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springGentle}
        style={{ marginBottom: '2rem' }}
      >
        <h1 style={{
          fontSize: '1.625rem', fontWeight: 800,
          color: 'var(--color-on-surface)',
          margin: '0 0 0.5rem',
          letterSpacing: '-0.02em'
        }}>
          Optimierungshinweise
        </h1>
        <p style={{
          fontSize: '0.9375rem',
          color: 'var(--color-on-surface-variant)',
          margin: 0, lineHeight: 1.6
        }}>
          Was du noch absetzen könntest — basierend auf deinen eingetragenen Daten.
        </p>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
          Wird geladen…
        </div>
      )}

      {/* Kein Draft vorhanden */}
      {!loading && hinweise.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springGentle}
        >
          {/* Prüfen ob es überhaupt Daten gibt — wenn nicht: CTA */}
          <EmptyState onNavigate={onNavigate} />
        </motion.div>
      )}

      {/* Hinweis-Karten */}
      {!loading && hinweise.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {hinweise.map((hinweis, idx) => (
            <HinweisKarte
              key={hinweis.id}
              hinweis={hinweis}
              onNavigate={onNavigate}
              delay={idx * 0.05}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ onNavigate }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '4rem 2rem',
      color: 'var(--color-on-surface-variant)'
    }}>
      <div style={{
        width: 64, height: 64, margin: '0 auto 1.25rem',
        borderRadius: '50%',
        background: 'var(--color-surface-container)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-tertiary)'
      }}>
        <IconCheck />
      </div>
      <div style={{
        fontSize: '1rem', fontWeight: 700,
        color: 'var(--color-on-surface)',
        marginBottom: '0.5rem'
      }}>
        Noch keine Daten eingetragen
      </div>
      <p style={{ fontSize: '0.875rem', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
        Trag zuerst deine Steuerdaten ein — dann zeigen wir dir was du noch optimieren kannst.
      </p>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onNavigate('wizard')}
        style={{
          background: 'var(--color-primary)',
          color: 'var(--color-on-primary)',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          padding: '0.625rem 1.5rem',
          fontSize: '0.875rem', fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'var(--font-family)'
        }}
        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
        onMouseLeave={e => { e.currentTarget.style.filter = '' }}
      >
        Daten eingeben
      </motion.button>
    </div>
  )
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/screens/Optimierung/OptimierungScreen.jsx
git commit -m "feat: add OptimierungScreen UI"
```

---

## Task 3: Navigation + App-Integration

**Files:**
- Modify: `src/components/AppShell/AppShell.jsx`
- Modify: `src/App.jsx`

- [ ] **Schritt 1: Icon + Nav-Eintrag in AppShell.jsx hinzufügen**

In `src/components/AppShell/AppShell.jsx` nach der `IconUmsatz`-Funktion (Zeile ~47) einfügen:

```jsx
function IconOptimierung() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.2-1.2 4.1-3 5.2V17a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-2.8C7.2 13.1 6 11.2 6 9a6 6 0 0 1 6-6z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
```

In `NAV_ITEMS` zwischen Umsatz und PDF den neuen Eintrag einfügen:

```jsx
const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',            icon: <IconDashboard />,    available: true },
  { id: 'wizard',       label: 'Dateneingabe',          icon: <IconWizard />,       available: true },
  { id: 'belege',       label: 'Belege',                icon: <IconBelege />,       available: true },
  { id: 'umsatz',       label: 'Umsatz',                icon: <IconUmsatz />,       available: true },
  { id: 'optimierung',  label: 'Optimierungshinweise',  icon: <IconOptimierung />,  available: true },
  { id: 'pdf',          label: 'PDF Export',            icon: <IconPdf />,          available: false },
]
```

- [ ] **Schritt 2: OptimierungScreen in App.jsx einbinden**

In `src/App.jsx` den Import hinzufügen (nach dem UmsatzScreen-Import):

```jsx
import OptimierungScreen from './screens/Optimierung/OptimierungScreen.jsx'
```

Im JSX-Block nach dem `umsatz`-Block einfügen:

```jsx
{activeNav === 'optimierung' && (
  <OptimierungScreen
    activeJahr={activeJahr}
    nutzer={nutzer}
    onNavigate={setActiveNav}
  />
)}
```

- [ ] **Schritt 3: App manuell testen**

```bash
npm start
```

Prüfen:
- "Optimierungshinweise" erscheint in der Navigation
- Klick öffnet den Screen
- Ohne eingetragene Daten: Leer-State mit "Daten eingeben"-Button
- Mit eingetragenen Daten (Wizard ausfüllen): Hinweis-Karten erscheinen
- "Jetzt eintragen"-Button navigiert zum Wizard

- [ ] **Schritt 4: Abschluss-Commit**

```bash
git add src/components/AppShell/AppShell.jsx src/App.jsx
git commit -m "feat: add Optimierungshinweise to navigation"
```
