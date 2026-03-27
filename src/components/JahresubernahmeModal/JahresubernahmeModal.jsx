import { useState } from 'react'
import { motion } from 'framer-motion'
import { springGentle } from '../../theme/tokens.js'

export default function JahresubernahmeModal({ angebot, onUbernehmen, onAbbrechen }) {
  const [loading, setLoading] = useState(false)
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
              try { await onUbernehmen() }
              finally { setLoading(false) }
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
