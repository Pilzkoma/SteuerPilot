import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { springGentle, spring, colors } from '../../theme/tokens.js'
import { berechneFahrtkosten, berechneHomeofficePauschale } from '../../engine/steuerberechnung.js'

import SchrittLohn from './steps/SchrittLohn.jsx'
import SchrittFahrtkosten from './steps/SchrittFahrtkosten.jsx'
import SchrittHomeoffice from './steps/SchrittHomeoffice.jsx'
import SchrittArbeitsmittel from './steps/SchrittArbeitsmittel.jsx'
import SchrittSonderausgaben from './steps/SchrittSonderausgaben.jsx'
import SchrittZusammenfassung from './steps/SchrittZusammenfassung.jsx'
import JahresubernahmeModal from '../../components/JahresubernahmeModal/JahresubernahmeModal.jsx'

// ── Schritte Config ───────────────────────────────────────────────────────────

const SCHRITTE = [
  { id: 'lohn',             label: 'Einnahmen' },
  { id: 'fahrtkosten',      label: 'Fahrtkosten' },
  { id: 'homeoffice',       label: 'Homeoffice' },
  { id: 'arbeitsmittel',    label: 'Arbeitsmittel' },
  { id: 'sonderausgaben',   label: 'Sonderausgaben' },
  { id: 'zusammenfassung',  label: 'Zusammenfassung' },
]

// ── Leerer Zustand ────────────────────────────────────────────────────────────

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

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ aktiv, gesamt }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      padding: '0 2rem',
      overflowX: 'auto',
    }}>
      {SCHRITTE.map((schritt, idx) => {
        const state = idx < aktiv ? 'done' : idx === aktiv ? 'active' : 'future'

        return (
          <div key={schritt.id} style={{ display: 'flex', alignItems: 'center', flex: idx < SCHRITTE.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
              <motion.div
                layout
                style={{
                  width: state === 'active' ? 32 : 26,
                  height: state === 'active' ? 32 : 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: state === 'done'
                    ? colors.primary_container
                    : state === 'active'
                      ? colors.secondary
                      : 'var(--color-surface-container-high)',
                  flexShrink: 0,
                  transition: 'background 0.2s, width 0.2s, height 0.2s'
                }}
                transition={spring}
              >
                {state === 'done' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5L20 7" stroke={colors.on_primary_container} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span style={{
                    fontSize: state === 'active' ? '0.8125rem' : '0.6875rem',
                    fontWeight: 800,
                    color: state === 'active' ? colors.on_secondary : 'var(--color-on-surface-variant)',
                    lineHeight: 1
                  }}>
                    {idx + 1}
                  </span>
                )}
              </motion.div>

              <span style={{
                fontSize: '0.5625rem',
                fontWeight: state === 'active' ? 700 : 500,
                color: state === 'active' ? colors.secondary : state === 'done' ? 'var(--color-on-surface-variant)' : 'var(--color-outline)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}>
                {schritt.label}
              </span>
            </div>

            {idx < SCHRITTE.length - 1 && (
              <div style={{
                flex: 1,
                height: 1.5,
                background: idx < aktiv ? colors.primary_container : 'var(--color-outline-variant)',
                margin: '0 0.375rem',
                marginBottom: '1.1rem',
                transition: 'background 0.3s'
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── WizardScreen ──────────────────────────────────────────────────────────────

export default function WizardScreen({ nutzer, activeJahr, onNavigateDashboard }) {
  const [schritt, setSchritt] = useState(0)
  const [direction, setDirection] = useState(1)
  const [daten, setDaten] = useState(emptyDaten())
  const [isSaving, setIsSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [ubernahmeAngebot, setUbernahmeAngebot] = useState(null)

  useEffect(() => {
    if (!activeJahr?.id) return
    window.steuerpilot.jahresubernahme.pruefen(activeJahr.id).then(pruefung => {
      if (pruefung.sollAnbieten) setUbernahmeAngebot(pruefung)
      else setUbernahmeAngebot(null)
    }).catch(() => setUbernahmeAngebot(null))
  }, [activeJahr?.id])

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
      await loadFortschritt()
    } catch (err) {
      console.error('Wizard Übernahme fehlgeschlagen:', err)
    }
  }

  const nutzertyp = nutzer?.nutzertyp ?? 'angestellter'

  // ── Fortschritt laden ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeJahr?.id) return
    loadFortschritt()
  }, [activeJahr?.id])

  async function loadFortschritt() {
    try {
      const row = await window.steuerpilot.db.get(
        'SELECT schritt, daten FROM wizard_fortschritt WHERE steuerjahr_id = ?',
        [activeJahr.id]
      )
      if (row?.daten) {
        const parsed = JSON.parse(row.daten)
        setDaten({ ...emptyDaten(), ...parsed })
        // Wenn abgeschlossen: trotzdem auf Schritt 0 starten (Bearbeitung)
        setSchritt(0)
      }
    } catch (err) {
      console.error('WizardScreen loadFortschritt:', err)
    } finally {
      setLoaded(true)
    }
  }

  // ── Draft speichern ─────────────────────────────────────────────────────────

  const saveDraft = useCallback(async (aktuelleDaten, aktuellerSchritt) => {
    if (!activeJahr?.id) return
    try {
      await window.steuerpilot.db.run(
        'INSERT OR REPLACE INTO wizard_fortschritt (steuerjahr_id, schritt, daten, abgeschlossen) VALUES (?, ?, ?, ?)',
        [activeJahr.id, aktuellerSchritt, JSON.stringify(aktuelleDaten), 0]
      )
    } catch (err) {
      console.error('Draft-Speicherung fehlgeschlagen:', err)
    }
  }, [activeJahr?.id])

  // ── Navigation ──────────────────────────────────────────────────────────────

  function gotoNext() {
    const next = schritt + 1
    if (next >= SCHRITTE.length) return
    setDirection(1)
    setSchritt(next)
    saveDraft(daten, next)
  }

  function gotoBack() {
    const prev = schritt - 1
    if (prev < 0) return
    setDirection(-1)
    setSchritt(prev)
    saveDraft(daten, prev)
  }

  // ── Daten aktualisieren ─────────────────────────────────────────────────────

  function updateSchritt(schrittId, updates) {
    setDaten(prev => ({
      ...prev,
      [schrittId]: typeof updates === 'function'
        ? updates(prev[schrittId])
        : { ...prev[schrittId], ...updates }
    }))
  }

  // ── Final speichern ─────────────────────────────────────────────────────────

  async function handleFinalSave() {
    if (!activeJahr?.id || isSaving) return
    setIsSaving(true)

    const db = window.steuerpilot.db
    const jahrId = activeJahr.id
    const jahr = activeJahr.jahr
    const today = new Date().toISOString().split('T')[0]

    try {
      // 1. Vorherige Wizard-Einträge löschen
      const { einnahmen: altEinnahmen, ausgaben: altAusgaben } = daten.gespeicherte_ids
      for (const id of altEinnahmen) {
        await db.run('DELETE FROM einnahmen WHERE id = ?', [id])
      }
      for (const id of altAusgaben) {
        await db.run('DELETE FROM ausgaben WHERE id = ?', [id])
      }

      const neueEinnahmenIds = []
      const neueAusgabenIds = []

      // 2. Einnahmen einfügen
      if (nutzertyp === 'angestellter') {
        if (parseFloat(daten.lohn.bruttogehalt) > 0) {
          await db.run(
            'INSERT INTO einnahmen (steuerjahr_id, beschreibung, betrag, kategorie, datum) VALUES (?, ?, ?, ?, ?)',
            [jahrId, 'Bruttogehalt', parseFloat(daten.lohn.bruttogehalt), 'lohn', today]
          )
          const { id } = await db.get('SELECT last_insert_rowid() as id', [])
          neueEinnahmenIds.push(id)
        }
        if (parseFloat(daten.lohn.lohnsteuer) > 0) {
          await db.run(
            'INSERT INTO einnahmen (steuerjahr_id, beschreibung, betrag, kategorie, datum) VALUES (?, ?, ?, ?, ?)',
            [jahrId, 'Einbehaltene Lohnsteuer', parseFloat(daten.lohn.lohnsteuer), 'lohnsteuer_einbehalten', today]
          )
          const { id } = await db.get('SELECT last_insert_rowid() as id', [])
          neueEinnahmenIds.push(id)
        }
      } else {
        // Freelancer / Selbstständige
        if (parseFloat(daten.lohn.honorar) > 0) {
          await db.run(
            'INSERT INTO einnahmen (steuerjahr_id, beschreibung, betrag, kategorie, datum) VALUES (?, ?, ?, ?, ?)',
            [jahrId, 'Honorareinnahmen', parseFloat(daten.lohn.honorar), 'honorar', today]
          )
          const { id } = await db.get('SELECT last_insert_rowid() as id', [])
          neueEinnahmenIds.push(id)
        }
        if (parseFloat(daten.lohn.lohnsteuer) > 0) {
          await db.run(
            'INSERT INTO einnahmen (steuerjahr_id, beschreibung, betrag, kategorie, datum) VALUES (?, ?, ?, ?, ?)',
            [jahrId, 'Einbehaltene Lohnsteuer (Nebentätigkeit)', parseFloat(daten.lohn.lohnsteuer), 'lohnsteuer_einbehalten', today]
          )
          const { id } = await db.get('SELECT last_insert_rowid() as id', [])
          neueEinnahmenIds.push(id)
        }
      }

      // 3. Ausgaben einfügen
      // Fahrtkosten
      const km = parseFloat(daten.fahrtkosten.km) || 0
      const arbeitstage = parseInt(daten.fahrtkosten.arbeitstage) || 0
      if (!daten.fahrtkosten.oeffentlich && km > 0 && arbeitstage > 0) {
        const betrag = berechneFahrtkosten(km, arbeitstage, jahr)
        await db.run(
          'INSERT INTO ausgaben (steuerjahr_id, beschreibung, betrag, kategorie, datum, abzugsfaehig, notiz) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [jahrId, `Fahrtkosten (${km} km × ${arbeitstage} Tage)`, betrag, 'fahrtkosten', today, 1, `km:${km},tage:${arbeitstage}`]
        )
        const { id } = await db.get('SELECT last_insert_rowid() as id', [])
        neueAusgabenIds.push(id)
      } else if (daten.fahrtkosten.oeffentlich && parseFloat(daten.fahrtkosten.oeffentlichKosten) > 0) {
        await db.run(
          'INSERT INTO ausgaben (steuerjahr_id, beschreibung, betrag, kategorie, datum, abzugsfaehig) VALUES (?, ?, ?, ?, ?, ?)',
          [jahrId, 'Fahrtkosten ÖPNV', parseFloat(daten.fahrtkosten.oeffentlichKosten), 'fahrtkosten', today, 1]
        )
        const { id } = await db.get('SELECT last_insert_rowid() as id', [])
        neueAusgabenIds.push(id)
      }

      // Homeoffice
      const haTage = parseInt(daten.homeoffice.tage) || 0
      if (haTage > 0) {
        const betrag = berechneHomeofficePauschale(haTage, jahr)
        await db.run(
          'INSERT INTO ausgaben (steuerjahr_id, beschreibung, betrag, kategorie, datum, abzugsfaehig, notiz) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [jahrId, `Homeoffice-Pauschale (${haTage} Tage)`, betrag, 'homeoffice', today, 1, `tage:${haTage}`]
        )
        const { id } = await db.get('SELECT last_insert_rowid() as id', [])
        neueAusgabenIds.push(id)
      }

      // Arbeitsmittel
      for (const item of (daten.arbeitsmittel ?? [])) {
        const betrag = parseFloat(item.betrag) || 0
        if (betrag > 0 && item.beschreibung) {
          await db.run(
            'INSERT INTO ausgaben (steuerjahr_id, beschreibung, betrag, kategorie, datum, abzugsfaehig) VALUES (?, ?, ?, ?, ?, ?)',
            [jahrId, item.beschreibung, betrag, 'arbeitsmittel', today, 1]
          )
          const { id } = await db.get('SELECT last_insert_rowid() as id', [])
          neueAusgabenIds.push(id)
        }
      }

      // Krankenversicherung
      if (parseFloat(daten.sonderausgaben.krankenversicherung) > 0) {
        await db.run(
          'INSERT INTO ausgaben (steuerjahr_id, beschreibung, betrag, kategorie, datum, abzugsfaehig) VALUES (?, ?, ?, ?, ?, ?)',
          [jahrId, 'Krankenversicherungsbeiträge', parseFloat(daten.sonderausgaben.krankenversicherung), 'krankenversicherung', today, 1]
        )
        const { id } = await db.get('SELECT last_insert_rowid() as id', [])
        neueAusgabenIds.push(id)
      }

      // Altersvorsorge
      if (parseFloat(daten.sonderausgaben.altersvorsorge) > 0) {
        await db.run(
          'INSERT INTO ausgaben (steuerjahr_id, beschreibung, betrag, kategorie, datum, abzugsfaehig) VALUES (?, ?, ?, ?, ?, ?)',
          [jahrId, 'Altersvorsorge / Rentenbeiträge', parseFloat(daten.sonderausgaben.altersvorsorge), 'altersvorsorge', today, 1]
        )
        const { id } = await db.get('SELECT last_insert_rowid() as id', [])
        neueAusgabenIds.push(id)
      }

      // Spenden
      if (parseFloat(daten.sonderausgaben.spenden) > 0) {
        await db.run(
          'INSERT INTO ausgaben (steuerjahr_id, beschreibung, betrag, kategorie, datum, abzugsfaehig) VALUES (?, ?, ?, ?, ?, ?)',
          [jahrId, 'Spenden', parseFloat(daten.sonderausgaben.spenden), 'spende', today, 1]
        )
        const { id } = await db.get('SELECT last_insert_rowid() as id', [])
        neueAusgabenIds.push(id)
      }

      // Betriebsausgaben
      for (const item of (daten.betriebsausgaben ?? [])) {
        const betrag = parseFloat(item.betrag) || 0
        if (betrag > 0 && item.beschreibung) {
          await db.run(
            'INSERT INTO ausgaben (steuerjahr_id, beschreibung, betrag, kategorie, datum, abzugsfaehig) VALUES (?, ?, ?, ?, ?, ?)',
            [jahrId, item.beschreibung, betrag, 'betriebsausgaben', today, 1]
          )
          const { id } = await db.get('SELECT last_insert_rowid() as id', [])
          neueAusgabenIds.push(id)
        }
      }

      // 4. Fortschritt als abgeschlossen markieren
      const finalDaten = {
        ...daten,
        gespeicherte_ids: { einnahmen: neueEinnahmenIds, ausgaben: neueAusgabenIds }
      }
      await db.run(
        'INSERT OR REPLACE INTO wizard_fortschritt (steuerjahr_id, schritt, daten, abgeschlossen) VALUES (?, ?, ?, ?)',
        [jahrId, SCHRITTE.length - 1, JSON.stringify(finalDaten), 1]
      )

      // 5. Zurück zum Dashboard
      onNavigateDashboard()

    } catch (err) {
      console.error('WizardScreen finalSave:', err)
      setIsSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!loaded) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-on-surface-variant)',
        fontSize: '0.875rem'
      }}>
        Lade Daten…
      </div>
    )
  }

  const istLetzterSchritt = schritt === SCHRITTE.length - 1
  const istErsterSchritt = schritt === 0

  const variants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -40 : 40 })
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Manrope', sans-serif",
      background: 'var(--color-background)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '2rem 2rem 1.5rem',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h1 style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-on-surface)',
              margin: '0 0 0.25rem',
              letterSpacing: '-0.01em'
            }}>
              Dateneingabe {activeJahr?.jahr ?? ''}
            </h1>
            <p style={{
              fontSize: '0.8125rem',
              color: 'var(--color-on-surface-variant)',
              margin: 0
            }}>
              Schritt {schritt + 1} von {SCHRITTE.length} — {SCHRITTE[schritt].label}
            </p>
          </div>

          {/* Fortschrittsbalken */}
          <div style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: colors.secondary,
            background: 'rgba(255,185,85,0.08)',
            border: '1px solid rgba(255,185,85,0.15)',
            borderRadius: '999px',
            padding: '0.25rem 0.75rem'
          }}>
            {Math.round(((schritt + 1) / SCHRITTE.length) * 100)} %
          </div>
        </div>

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

        {/* Step Indicator */}
        <StepIndicator aktiv={schritt} gesamt={SCHRITTE.length} />
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 2rem',
        position: 'relative'
      }}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={schritt}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={springGentle}
            style={{ maxWidth: 640 }}
          >
            {schritt === 0 && (
              <SchrittLohn
                daten={daten.lohn}
                onChange={u => updateSchritt('lohn', u)}
                nutzertyp={nutzertyp}
              />
            )}
            {schritt === 1 && (
              <SchrittFahrtkosten
                daten={daten.fahrtkosten}
                onChange={u => updateSchritt('fahrtkosten', u)}
                activeJahr={activeJahr}
              />
            )}
            {schritt === 2 && (
              <SchrittHomeoffice
                daten={daten.homeoffice}
                onChange={u => updateSchritt('homeoffice', u)}
                activeJahr={activeJahr}
              />
            )}
            {schritt === 3 && (
              <SchrittArbeitsmittel
                daten={daten.arbeitsmittel}
                onChange={v => setDaten(prev => ({ ...prev, arbeitsmittel: v }))}
              />
            )}
            {schritt === 4 && (
              <SchrittSonderausgaben
                daten={daten.sonderausgaben}
                onChange={u => updateSchritt('sonderausgaben', u)}
                betriebsausgaben={daten.betriebsausgaben}
                onChangeBetriebsausgaben={v => setDaten(prev => ({ ...prev, betriebsausgaben: v }))}
                nutzertyp={nutzertyp}
              />
            )}
            {schritt === 5 && (
              <SchrittZusammenfassung
                alleDaten={daten}
                nutzertyp={nutzertyp}
                activeJahr={activeJahr}
                isSaving={isSaving}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Spacing am Ende */}
        <div style={{ height: '2rem' }} />
      </div>

      {/* Navigation */}
      <div style={{
        flexShrink: 0,
        padding: '1.25rem 2rem',
        background: 'var(--color-surface-container-lowest)',
        borderTop: '1px solid var(--color-outline-variant)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        {/* Zurück */}
        <motion.button
          whileTap={!istErsterSchritt ? { scale: 0.97 } : {}}
          onClick={gotoBack}
          disabled={istErsterSchritt}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: '1.5px solid var(--color-outline-variant)',
            borderRadius: '999px',
            cursor: istErsterSchritt ? 'default' : 'pointer',
            fontFamily: "'Manrope', sans-serif",
            fontSize: '0.875rem',
            fontWeight: 600,
            color: istErsterSchritt ? 'var(--color-outline)' : 'var(--color-on-surface-variant)',
            transition: 'border-color 0.15s, color 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück
        </motion.button>

        {/* Mitte: Schritt-Info */}
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {SCHRITTE.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === schritt ? 20 : 6,
                height: 6,
                borderRadius: 999,
                background: idx === schritt
                  ? colors.secondary
                  : idx < schritt
                    ? colors.primary_container
                    : 'var(--color-outline-variant)',
                transition: 'width 0.2s ease, background 0.2s ease'
              }}
            />
          ))}
        </div>

        {/* Weiter / Speichern */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={istLetzterSchritt ? handleFinalSave : gotoNext}
          disabled={isSaving}
          style={{
            padding: '0.75rem 1.5rem',
            background: istLetzterSchritt
              ? `linear-gradient(135deg, ${colors.tertiary_container}, ${colors.tertiary_container})`
              : colors.primary_container,
            border: 'none',
            borderRadius: '999px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontFamily: "'Manrope', sans-serif",
            fontSize: '0.875rem',
            fontWeight: 700,
            color: istLetzterSchritt ? colors.on_tertiary_container : colors.on_primary_container,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            opacity: isSaving ? 0.7 : 1,
            transition: 'opacity 0.15s'
          }}
        >
          {istLetzterSchritt ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              {isSaving ? 'Wird gespeichert…' : 'Daten speichern'}
            </>
          ) : (
            <>
              Weiter
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </motion.button>
      </div>

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
    </div>
  )
}
