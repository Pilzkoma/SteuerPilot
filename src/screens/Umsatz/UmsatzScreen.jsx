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
