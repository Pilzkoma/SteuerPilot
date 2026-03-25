import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { spring, springGentle, springBouncy } from '../../theme/tokens.js'

// ── Icons ─────────────────────────────────────────────────────────────────────

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M12 5l7 7-7 7"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="12" x2="12" y2="12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function LaptopIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M1 21h22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 21l2-4h4l2 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 21V7l9-4 9 4v14" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="9" y="8" width="2" height="2" rx="0.5" fill="currentColor" />
      <rect x="13" y="8" width="2" height="2" rx="0.5" fill="currentColor" />
      <rect x="9" y="12" width="2" height="2" rx="0.5" fill="currentColor" />
      <rect x="13" y="12" width="2" height="2" rx="0.5" fill="currentColor" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
        fill="currentColor" />
    </svg>
  )
}

// ── Hintergrund ───────────────────────────────────────────────────────────────

function BackgroundGlow() {
  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0
    }}>
      <div style={{
        position: 'absolute',
        width: 900,
        height: 900,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(173,200,245,0.035) 0%, transparent 65%)',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)'
      }} />
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,185,85,0.025) 0%, transparent 70%)',
        top: '10%', right: '10%'
      }} />
    </div>
  )
}

// ── Fortschrittsleiste ────────────────────────────────────────────────────────

function StepIndicator({ current, total }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ color: 'var(--color-secondary)', fontSize: '1rem' }}>✦</span>
        <span style={{
          color: 'var(--color-secondary)', fontWeight: 800, fontSize: '0.9375rem', letterSpacing: '-0.02em'
        }}>SteuerPilot</span>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {Array.from({ length: total }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === current ? 24 : 6,
              background: i < current
                ? 'var(--color-primary)'
                : i === current
                  ? 'var(--color-secondary)'
                  : 'var(--color-outline-variant)'
            }}
            transition={spring}
            style={{ height: 6, borderRadius: 999 }}
          />
        ))}
      </div>

      {/* Label */}
      <p style={{
        color: 'var(--color-on-surface-variant)',
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase'
      }}>
        Schritt {current + 1} von {total}
      </p>
    </div>
  )
}

// ── Schritt 0: Willkommen ─────────────────────────────────────────────────────

function StepWillkommen() {
  const features = [
    { icon: '🔒', text: 'Vollständig verschlüsselt — lokal auf deinem Gerät' },
    { icon: '📊', text: 'Steuererstattung präzise berechnen' },
    { icon: '📄', text: 'Belege digitalisieren & kategorisieren' },
    { icon: '📑', text: 'Steuererklärung als PDF exportieren' }
  ]

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Hero */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...springBouncy, delay: 0.05 }}
        style={{
          width: 80, height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-surface-container-high), var(--color-surface-container-highest))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.75rem',
          boxShadow: '0 0 40px rgba(255,185,85,0.12), 0 8px 24px rgba(0,0,0,0.3)',
          fontSize: '2rem'
        }}
      >
        ✦
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.1 }}
        style={{
          fontSize: '2.25rem', fontWeight: 800,
          lineHeight: 1.15, letterSpacing: '-0.025em',
          color: 'var(--color-on-surface)',
          marginBottom: '0.75rem'
        }}
      >
        Willkommen bei<br />
        <span style={{ color: 'var(--color-secondary)' }}>SteuerPilot</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.15 }}
        style={{
          color: 'var(--color-on-surface-variant)',
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          maxWidth: 380,
          margin: '0 auto 2.5rem'
        }}
      >
        Dein persönlicher Steuerassistent. Privat, verschlüsselt, präzise.
        Einmalig einrichten — dauerhaft sparen.
      </motion.p>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.2 }}
        style={{
          display: 'flex', flexDirection: 'column', gap: '0.625rem',
          maxWidth: 360, margin: '0 auto'
        }}
      >
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springGentle, delay: 0.25 + i * 0.05 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.875rem',
              background: 'var(--color-surface-container)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.75rem 1rem',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>{f.icon}</span>
            <span style={{
              color: 'var(--color-on-surface)', fontSize: '0.8125rem',
              fontWeight: 500, lineHeight: 1.4
            }}>{f.text}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

// ── Schritt 1: Nutzertyp ──────────────────────────────────────────────────────

function StepNutzertyp({ value, onChange }) {
  const typen = [
    {
      id: 'angestellter',
      label: 'Angestellter',
      subtitle: 'Arbeitnehmer mit Lohnsteuerkarte',
      icon: <BriefcaseIcon />,
      tags: ['Werbungskosten', 'Homeoffice', 'Fahrtkosten']
    },
    {
      id: 'freelancer',
      label: 'Freelancer',
      subtitle: 'Selbstständig ohne Gewerbe',
      icon: <LaptopIcon />,
      tags: ['Betriebsausgaben', 'EÜR', 'USt-Voranmeldung']
    },
    {
      id: 'selbststaendiger',
      label: 'Selbstständiger',
      subtitle: 'Gewerbetreibender mit Gewerbe',
      icon: <BuildingIcon />,
      tags: ['Bilanz oder EÜR', 'GewSt', 'USt']
    }
  ]

  return (
    <div style={{ textAlign: 'center' }}>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.05 }}
        style={{
          fontSize: '1.75rem', fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--color-on-surface)',
          marginBottom: '0.5rem'
        }}
      >
        Wer bist du?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...springGentle, delay: 0.1 }}
        style={{
          color: 'var(--color-on-surface-variant)',
          fontSize: '0.875rem',
          marginBottom: '2rem'
        }}
      >
        Dein Beschäftigungsstatus bestimmt, welche Felder wir dir zeigen.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.12 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', maxWidth: 440, margin: '0 auto' }}
      >
        {typen.map((typ, i) => {
          const selected = value === typ.id
          return (
            <motion.button
              key={typ.id}
              onClick={() => onChange(typ.id)}
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: selected ? 1 : 1.01 }}
              transition={spring}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { ...springGentle, delay: 0.15 + i * 0.06 } }}
              style={{
                background: selected
                  ? 'linear-gradient(135deg, rgba(173,200,245,0.1) 0%, rgba(173,200,245,0.06) 100%)'
                  : 'var(--color-surface-container)',
                border: selected
                  ? '1.5px solid var(--color-primary)'
                  : '1.5px solid var(--color-outline-variant)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.125rem 1.25rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                textAlign: 'left',
                position: 'relative',
                transition: 'border-color 0.15s, background 0.15s',
                boxShadow: selected ? '0 0 24px rgba(173,200,245,0.08)' : 'none'
              }}
            >
              {/* Selected indicator */}
              {selected && (
                <motion.div
                  layoutId="selected-check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={springBouncy}
                  style={{
                    position: 'absolute',
                    top: '0.875rem',
                    right: '0.875rem',
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-on-primary)',
                    flexShrink: 0
                  }}
                >
                  <CheckIcon />
                </motion.div>
              )}

              <div style={{
                width: 44, height: 44, flexShrink: 0,
                borderRadius: 'var(--radius-lg)',
                background: selected
                  ? 'rgba(173,200,245,0.12)'
                  : 'var(--color-surface-container-high)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: selected ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                transition: 'background 0.15s, color 0.15s'
              }}>
                {typ.icon}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 700, fontSize: '0.9375rem',
                  color: selected ? 'var(--color-primary)' : 'var(--color-on-surface)',
                  marginBottom: '0.2rem',
                  transition: 'color 0.15s'
                }}>{typ.label}</div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-on-surface-variant)',
                  marginBottom: '0.625rem'
                }}>{typ.subtitle}</div>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {typ.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--color-surface-container-highest)',
                      color: 'var(--color-on-surface-variant)'
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}

// ── Schritt 2: Basisdaten ─────────────────────────────────────────────────────

function TextInput({ label, value, onChange, placeholder, optional = false, autoFocus = false }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: '0.375rem',
        fontSize: '0.625rem', fontWeight: 700,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color: focused ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
        marginBottom: '0.5rem', marginLeft: '0.25rem',
        transition: 'color 0.2s'
      }}>
        {label}
        {optional && (
          <span style={{
            fontWeight: 500, letterSpacing: '0.06em', opacity: 0.6,
            textTransform: 'none', fontSize: '0.6875rem'
          }}>— optional</span>
        )}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          background: 'var(--color-surface-container)',
          color: 'var(--color-on-surface)',
          border: 'none',
          borderBottom: `2px solid ${focused ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
          borderRadius: '0.5rem 0.5rem 0 0',
          padding: '0.875rem 1rem',
          fontSize: '1rem',
          fontFamily: 'var(--font-family)',
          outline: 'none',
          transition: 'border-color 0.2s',
          caretColor: 'var(--color-primary)',
          boxSizing: 'border-box'
        }}
      />
    </div>
  )
}

function StepBasisdaten({ data, onChange }) {
  return (
    <div style={{ maxWidth: 440, margin: '0 auto', width: '100%' }}>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.05 }}
        style={{
          fontSize: '1.75rem', fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--color-on-surface)',
          marginBottom: '0.5rem', textAlign: 'center'
        }}
      >
        Deine Daten
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...springGentle, delay: 0.1 }}
        style={{
          color: 'var(--color-on-surface-variant)',
          fontSize: '0.875rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}
      >
        Damit SteuerPilot die richtigen Formulare befüllt.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.12 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <TextInput
            label="Vorname"
            value={data.vorname}
            onChange={v => onChange({ ...data, vorname: v })}
            placeholder="Max"
            autoFocus
          />
          <TextInput
            label="Nachname"
            value={data.nachname}
            onChange={v => onChange({ ...data, nachname: v })}
            placeholder="Mustermann"
          />
        </div>

        <TextInput
          label="Steuer-Identifikationsnummer"
          value={data.steuer_id}
          onChange={v => onChange({ ...data, steuer_id: v })}
          placeholder="00 000 000 000"
          optional
        />

        <TextInput
          label="Finanzamt"
          value={data.finanzamt}
          onChange={v => onChange({ ...data, finanzamt: v })}
          placeholder="z.B. Finanzamt München"
          optional
        />

        {/* Hinweis */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
          background: 'rgba(173,200,245,0.05)',
          border: '1px solid rgba(173,200,245,0.1)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.75rem 1rem'
        }}>
          <span style={{ color: 'var(--color-primary)', marginTop: 1, display: 'flex', flexShrink: 0 }}>
            <SparkIcon />
          </span>
          <p style={{
            color: 'var(--color-on-surface-variant)',
            fontSize: '0.75rem', lineHeight: 1.5
          }}>
            Alle Daten bleiben <strong style={{ color: 'var(--color-on-surface)' }}>lokal auf deinem Gerät</strong> —
            verschlüsselt durch dein Passwort. Keine Cloud.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

// ── Schritt 3: Steuerjahr ─────────────────────────────────────────────────────

function StepSteuerjahr({ value, onChange }) {
  const jahre = [
    {
      jahr: 2025,
      label: '2025',
      subtitle: 'Laufendes Jahr',
      detail: 'Grundfreibetrag 12.096 €',
      badge: 'Aktuell',
      badgeColor: 'var(--color-secondary)'
    },
    {
      jahr: 2024,
      label: '2024',
      subtitle: 'Vergangenes Jahr',
      detail: 'Grundfreibetrag 11.604 €',
      badge: 'Nachträglich',
      badgeColor: 'var(--color-on-surface-variant)'
    }
  ]

  return (
    <div style={{ textAlign: 'center' }}>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.05 }}
        style={{
          fontSize: '1.75rem', fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--color-on-surface)',
          marginBottom: '0.5rem'
        }}
      >
        Welches Steuerjahr?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...springGentle, delay: 0.1 }}
        style={{
          color: 'var(--color-on-surface-variant)',
          fontSize: '0.875rem',
          marginBottom: '2rem'
        }}
      >
        Du kannst jederzeit zwischen Jahren wechseln.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.12 }}
        style={{ display: 'flex', gap: '1rem', maxWidth: 440, margin: '0 auto', justifyContent: 'center' }}
      >
        {jahre.map((j, i) => {
          const selected = value === j.jahr
          return (
            <motion.button
              key={j.jahr}
              onClick={() => onChange(j.jahr)}
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: selected ? 1 : 1.02 }}
              transition={spring}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { ...springGentle, delay: 0.18 + i * 0.06 } }}
              style={{
                flex: 1,
                background: selected
                  ? 'linear-gradient(145deg, rgba(255,185,85,0.12) 0%, rgba(255,185,85,0.06) 100%)'
                  : 'var(--color-surface-container)',
                border: selected
                  ? '1.5px solid var(--color-secondary)'
                  : '1.5px solid var(--color-outline-variant)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.75rem 1.5rem',
                cursor: 'pointer',
                position: 'relative',
                transition: 'border-color 0.15s, background 0.15s',
                boxShadow: selected ? '0 0 32px rgba(255,185,85,0.1)' : 'none'
              }}
            >
              {/* Badge */}
              <div style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                fontSize: '0.5625rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: j.badgeColor,
                opacity: selected ? 1 : 0.6,
                transition: 'opacity 0.15s'
              }}>
                {j.badge}
              </div>

              {/* Selected check */}
              <AnimatePresence>
                {selected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={springBouncy}
                    style={{
                      position: 'absolute',
                      top: '0.75rem',
                      left: '0.75rem',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'var(--color-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-on-secondary)'
                    }}
                  >
                    <CheckIcon />
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{
                fontSize: '3rem', fontWeight: 800,
                letterSpacing: '-0.04em',
                color: selected ? 'var(--color-secondary)' : 'var(--color-on-surface)',
                lineHeight: 1, marginBottom: '0.5rem',
                transition: 'color 0.15s'
              }}>
                {j.label}
              </div>

              <div style={{
                fontSize: '0.75rem', fontWeight: 500,
                color: selected ? 'var(--color-on-secondary-container)' : 'var(--color-on-surface-variant)',
                marginBottom: '0.75rem',
                transition: 'color 0.15s'
              }}>
                {j.subtitle}
              </div>

              <div style={{
                fontSize: '0.6875rem',
                color: 'var(--color-on-surface-variant)',
                padding: '0.25rem 0.625rem',
                background: 'var(--color-surface-container-high)',
                borderRadius: 'var(--radius-pill)',
                display: 'inline-block',
                fontWeight: 500
              }}>
                {j.detail}
              </div>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

const TOTAL_STEPS = 4

export default function OnboardingScreen({ onCompleted }) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [nutzertyp, setNutzertyp] = useState('angestellter')
  const [basisdaten, setBasisdaten] = useState({
    vorname: '',
    nachname: '',
    steuer_id: '',
    finanzamt: ''
  })
  const [steuerjahr, setSteuerjahr] = useState(2025)

  function canProceed() {
    if (step === 1) return Boolean(nutzertyp)
    if (step === 2) return basisdaten.vorname.trim().length > 0 && basisdaten.nachname.trim().length > 0
    return true
  }

  function goNext() {
    if (!canProceed()) return
    if (step < TOTAL_STEPS - 1) {
      setDirection(1)
      setStep(s => s + 1)
    }
  }

  function goBack() {
    if (step > 0) {
      setDirection(-1)
      setStep(s => s - 1)
    }
  }

  async function handleComplete() {
    if (saving) return
    setSaving(true)
    setSaveError('')
    try {
      const db = window.steuerpilot.db

      // 1. Nutzerprofil speichern
      await db.run(
        `INSERT INTO nutzer (vorname, nachname, steuer_id, finanzamt, nutzertyp)
         VALUES (?, ?, ?, ?, ?)`,
        [
          basisdaten.vorname.trim(),
          basisdaten.nachname.trim(),
          basisdaten.steuer_id.trim() || null,
          basisdaten.finanzamt.trim() || null,
          nutzertyp
        ]
      )

      // 2. Aktives Steuerjahr setzen (alle auf 0, dann gewähltes auf 1)
      await db.run('UPDATE steuerjahre SET aktiv = 0')
      await db.run('UPDATE steuerjahre SET aktiv = 1 WHERE jahr = ?', [steuerjahr])

      // 3. Onboarding als abgeschlossen markieren
      await db.run(
        `INSERT OR REPLACE INTO einstellungen (schluessel, wert, zuletzt_geaendert)
         VALUES ('onboarding_abgeschlossen', '1', datetime('now'))`,
        []
      )

      onCompleted()
    } catch (err) {
      console.error('Onboarding-Fehler:', err)
      setSaveError('Fehler beim Speichern. Bitte nochmal versuchen.')
      setSaving(false)
    }
  }

  // Slide-Varianten
  const variants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 48 : -48 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -48 : 48 })
  }

  const isLastStep = step === TOTAL_STEPS - 1

  return (
    <motion.div
      key="onboarding"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={springGentle}
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--color-background)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--font-family)'
      }}
    >
      <BackgroundGlow />

      {/* Inhalt */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 600,
        padding: '2rem',
        position: 'relative',
        zIndex: 1
      }}>

        {/* Step Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.05 }}
          style={{ marginBottom: '3rem', width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <StepIndicator current={step} total={TOTAL_STEPS} />
        </motion.div>

        {/* Step Content */}
        <div style={{ width: '100%', position: 'relative', minHeight: 380 }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={springGentle}
              style={{ width: '100%' }}
            >
              {step === 0 && <StepWillkommen />}
              {step === 1 && <StepNutzertyp value={nutzertyp} onChange={setNutzertyp} />}
              {step === 2 && <StepBasisdaten data={basisdaten} onChange={setBasisdaten} />}
              {step === 3 && <StepSteuerjahr value={steuerjahr} onChange={setSteuerjahr} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Fehler */}
        <AnimatePresence>
          {saveError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={springGentle}
              style={{
                color: 'var(--color-error)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                marginTop: '1rem'
              }}
            >
              {saveError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.2 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: 440,
            marginTop: '2.5rem',
            gap: '1rem'
          }}
        >
          {/* Zurück */}
          <motion.button
            onClick={goBack}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            transition={spring}
            style={{
              background: 'var(--color-surface-container)',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              padding: '0.875rem 1.5rem',
              cursor: step === 0 ? 'default' : 'pointer',
              color: step === 0 ? 'var(--color-outline-variant)' : 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-family)',
              fontWeight: 600,
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: step === 0 ? 0.3 : 1,
              pointerEvents: step === 0 ? 'none' : 'auto',
              transition: 'color 0.15s, opacity 0.15s'
            }}
          >
            <ArrowLeftIcon />
            Zurück
          </motion.button>

          {/* Weiter / Abschließen */}
          <motion.button
            onClick={isLastStep ? handleComplete : goNext}
            disabled={!canProceed() || saving}
            whileTap={{ scale: canProceed() ? 0.97 : 1 }}
            whileHover={{ scale: canProceed() && !saving ? 1.02 : 1 }}
            transition={spring}
            style={{
              flex: 1,
              background: canProceed() && !saving
                ? 'var(--color-secondary)'
                : 'var(--color-secondary-container)',
              color: canProceed() && !saving
                ? 'var(--color-on-secondary)'
                : 'var(--color-on-surface-variant)',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              padding: '0.875rem 1.5rem',
              cursor: canProceed() && !saving ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-family)',
              fontWeight: 700,
              fontSize: '0.8125rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: canProceed() && !saving ? '0 4px 16px rgba(255,185,85,0.15)' : 'none',
              transition: 'background 0.15s, color 0.15s, box-shadow 0.15s'
            }}
          >
            {saving ? (
              <span style={{ opacity: 0.7 }}>Einen Moment…</span>
            ) : isLastStep ? (
              <>
                <span>Loslegen</span>
                <ArrowRightIcon />
              </>
            ) : (
              <>
                <span>Weiter</span>
                <ArrowRightIcon />
              </>
            )}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  )
}
