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
      const fortschritt = await db.get(
        "SELECT wert FROM wizard_fortschritt WHERE steuerjahr_id = ? AND schritt = 'draft'",
        [jahrId]
      )

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
