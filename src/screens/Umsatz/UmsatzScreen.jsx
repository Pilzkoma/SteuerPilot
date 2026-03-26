import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { springGentle } from '../../theme/tokens.js'
import CsvImportFlow from './CsvImportFlow.jsx'
import TransaktionListe from './TransaktionListe.jsx'
import UmsatzCharts from './UmsatzCharts.jsx'
import Ampel from './Ampel.jsx'

const KATEGORIEN_EINNAHMEN = [
  { id: 'lohn',     label: 'Lohn / Gehalt' },
  { id: 'honorar',  label: 'Honorar / Freelance' },
  { id: 'sonstige', label: 'Sonstige Einnahmen' },
]

const KATEGORIEN_AUSGABEN = [
  { id: 'fahrtkosten',      label: 'Fahrtkosten' },
  { id: 'homeoffice',       label: 'Homeoffice' },
  { id: 'arbeitsmittel',    label: 'Arbeitsmittel' },
  { id: 'krankenversicherung', label: 'Krankenversicherung' },
  { id: 'altersvorsorge',   label: 'Altersvorsorge' },
  { id: 'spende',           label: 'Spende' },
  { id: 'sonstige',         label: 'Sonstige' },
]

const FORM_LEER = {
  datum: new Date().toISOString().slice(0, 10),
  betrag: '',
  typ: 'ausgabe',
  empfaenger: '',
  kategorie: 'sonstige',
  notiz: '',
}

export default function UmsatzScreen({ activeJahr }) {
  const [transaktionen, setTransaktionen] = useState([])
  const [showImport, setShowImport] = useState(false)
  const [showManuelleEingabe, setShowManuelleEingabe] = useState(false)
  const [manuellesForm, setManuellesForm] = useState(FORM_LEER)
  const [saving, setSaving] = useState(false)
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

  async function handleManuelleEingabeSave() {
    if (saving || !activeJahr?.id) return
    const betrag = parseFloat(manuellesForm.betrag)
    if (!manuellesForm.datum || isNaN(betrag)) return
    setSaving(true)
    try {
      await window.steuerpilot.transaktionen.saveBatch({
        transaktionen: [{
          datum: manuellesForm.datum,
          betrag: manuellesForm.typ === 'ausgabe' ? -Math.abs(betrag) : Math.abs(betrag),
          typ: manuellesForm.typ === 'einnahme' ? 'einnahme' : 'ausgabe',
          empfaenger: manuellesForm.empfaenger || '',
          verwendungszweck: manuellesForm.notiz || '',
          kategorie: manuellesForm.kategorie,
          abzugsfaehig: 0,
          bank: 'manuell',
        }],
        steuerjahrId: activeJahr.id,
      })
      setManuellesForm(FORM_LEER)
      setShowManuelleEingabe(false)
      await loadTransaktionen()
    } catch (err) {
      console.error('Manuelle Transaktion speichern fehlgeschlagen:', err)
    } finally {
      setSaving(false)
    }
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
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button
            onClick={() => { setShowManuelleEingabe(v => !v); setManuellesForm(FORM_LEER) }}
            style={{
              background: 'var(--color-surface-container)',
              color: 'var(--color-on-surface)',
              border: '1px solid var(--color-outline-variant)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.625rem 1rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-container-high)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-container)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Manuell
          </button>
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
      </div>

      {/* Import Modal */}
      {showImport && (
        <CsvImportFlow
          activeJahr={activeJahr}
          onComplete={handleImportComplete}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Manuelle Eingabe — Inline-Formular */}
      {showManuelleEingabe && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={springGentle}
          style={{
            background: 'var(--color-surface-container)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid var(--color-outline-variant)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              Transaktion manuell erfassen
            </div>
            <button
              onClick={() => setShowManuelleEingabe(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', padding: '0.25rem', display: 'flex' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Typ-Auswahl */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {[{ id: 'ausgabe', label: 'Ausgabe' }, { id: 'einnahme', label: 'Einnahme' }].map(t => (
              <button
                key={t.id}
                onClick={() => setManuellesForm(f => ({
                  ...f, typ: t.id,
                  kategorie: t.id === 'einnahme' ? 'sonstige' : 'sonstige'
                }))}
                style={{
                  background: manuellesForm.typ === t.id ? 'var(--color-primary-container)' : 'var(--color-surface-container-high)',
                  color: manuellesForm.typ === t.id ? 'var(--color-on-primary-container)' : 'var(--color-on-surface-variant)',
                  border: 'none',
                  borderRadius: 'var(--radius-pill)',
                  padding: '0.375rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: manuellesForm.typ === t.id ? 700 : 400,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Felder */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {[
              { key: 'datum', label: 'Datum', type: 'date' },
              { key: 'betrag', label: 'Betrag (€)', type: 'number', placeholder: '0,00' },
              { key: 'empfaenger', label: 'Empfänger / Absender', type: 'text', placeholder: 'z.B. REWE, Kunde GmbH…' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '0.3rem' }}>
                  {label}
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={manuellesForm[key]}
                  onChange={e => setManuellesForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--color-surface)', color: 'var(--color-on-surface)',
                    border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--radius-md)',
                    padding: '0.5rem 0.625rem', fontSize: '0.8125rem', fontFamily: 'var(--font-family)', outline: 'none'
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-outline-variant)' }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            {/* Kategorie */}
            <div>
              <label style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '0.3rem' }}>
                Kategorie
              </label>
              <select
                value={manuellesForm.kategorie}
                onChange={e => setManuellesForm(f => ({ ...f, kategorie: e.target.value }))}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--color-surface)', color: 'var(--color-on-surface)',
                  border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--radius-md)',
                  padding: '0.5rem 0.625rem', fontSize: '0.8125rem', fontFamily: 'var(--font-family)', outline: 'none', cursor: 'pointer'
                }}
              >
                {(manuellesForm.typ === 'einnahme' ? KATEGORIEN_EINNAHMEN : KATEGORIEN_AUSGABEN).map(k => (
                  <option key={k.id} value={k.id}>{k.label}</option>
                ))}
              </select>
            </div>

            {/* Notiz */}
            <div>
              <label style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '0.3rem' }}>
                Notiz <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Verwendungszweck, Anmerkung…"
                value={manuellesForm.notiz}
                onChange={e => setManuellesForm(f => ({ ...f, notiz: e.target.value }))}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--color-surface)', color: 'var(--color-on-surface)',
                  border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--radius-md)',
                  padding: '0.5rem 0.625rem', fontSize: '0.8125rem', fontFamily: 'var(--font-family)', outline: 'none'
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-outline-variant)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
            <button
              onClick={() => setShowManuelleEingabe(false)}
              style={{
                background: 'transparent', color: 'var(--color-on-surface-variant)',
                border: '1px solid var(--color-outline-variant)',
                borderRadius: 'var(--radius-pill)', padding: '0.5rem 1.125rem',
                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family)'
              }}
            >
              Abbrechen
            </button>
            <motion.button
              onClick={handleManuelleEingabeSave}
              disabled={saving || !manuellesForm.datum || !manuellesForm.betrag}
              whileTap={{ scale: 0.97 }}
              transition={springGentle}
              style={{
                background: 'var(--color-secondary)', color: 'var(--color-on-secondary)',
                border: 'none', borderRadius: 'var(--radius-pill)',
                padding: '0.5rem 1.25rem', fontSize: '0.8125rem', fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-family)',
                opacity: saving || !manuellesForm.datum || !manuellesForm.betrag ? 0.6 : 1
              }}
            >
              {saving ? 'Wird gespeichert…' : 'Speichern'}
            </motion.button>
          </div>
        </motion.div>
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
