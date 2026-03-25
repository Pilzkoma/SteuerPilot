import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { spring, springGentle } from '../../theme/tokens.js'

// ── Icons (inline SVG — kein externes Icon-Paket nötig) ──────────────────────

function LockIcon({ filled = false }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  )
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="1" y1="1" x2="23" y2="23"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M12 5l7 7-7 7"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="7.5" cy="15.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M21 2l-9.6 9.6M15.5 7.5L19 11l2.5-2.5-3.5-3.5"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Hintergrunddekor (subtiler Ambient-Glow) ──────────────────────────────────

function BackgroundGlow() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0
    }}>
      <div style={{
        position: 'absolute',
        width: 700,
        height: 700,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(173,200,245,0.04) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }} />
    </div>
  )
}

// ── Linke Seite: Brand Panel ──────────────────────────────────────────────────

function BrandPanel() {
  return (
    <div style={{
      width: '50%',
      background: 'var(--color-surface-container-lowest)',
      padding: '3rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      {/* Dekorative geometrische Linien */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}
        viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice"
      >
        <line x1="0" y1="0" x2="400" y2="640" stroke="#adc8f5" strokeWidth="0.5" />
        <line x1="400" y1="0" x2="0" y2="640" stroke="#adc8f5" strokeWidth="0.5" />
        <circle cx="200" cy="320" r="180" stroke="#adc8f5" strokeWidth="0.5" fill="none" />
        <circle cx="200" cy="320" r="280" stroke="#ffb955" strokeWidth="0.5" fill="none" />
        <line x1="200" y1="0" x2="200" y2="640" stroke="#adc8f5" strokeWidth="0.3" />
        <line x1="0" y1="320" x2="400" y2="320" stroke="#adc8f5" strokeWidth="0.3" />
      </svg>

      {/* Logo */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ color: 'var(--color-secondary)', fontSize: '1.5rem' }}>✦</span>
          <span style={{
            color: 'var(--color-secondary)',
            fontWeight: 800,
            fontSize: '1.125rem',
            letterSpacing: '-0.02em'
          }}>SteuerPilot</span>
        </div>
        <p style={{
          color: 'var(--color-on-surface-variant)',
          fontSize: '0.6875rem',
          marginTop: '0.25rem',
          fontWeight: 500,
          letterSpacing: '0.18em',
          textTransform: 'uppercase'
        }}>Wealth Navigator</p>
      </div>

      {/* Headline */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.025em',
          color: 'var(--color-on-surface)',
          marginBottom: '1.5rem'
        }}>
          Ihre Finanzen.<br />
          <span style={{ color: 'var(--color-primary)' }}>Präzise</span> gesteuert.
        </h2>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: 'var(--color-primary)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase'
        }}>
          <span>Desktop App</span>
          <span style={{
            width: 4, height: 4,
            borderRadius: '50%',
            background: 'var(--color-primary)',
            opacity: 0.5
          }} />
          <span>Ende-zu-Ende verschlüsselt</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        color: 'var(--color-on-surface-variant)',
        opacity: 0.3,
        fontSize: '0.625rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase'
      }}>
        SteuerPilot · Lokal &amp; Privat
      </div>
    </div>
  )
}

// ── Passwort-Input ─────────────────────────────────────────────────────────────

function PasswordInput({ label, value, onChange, onKeyDown, placeholder, autoFocus, error }) {
  const [visible, setVisible] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [autoFocus])

  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '0.625rem',
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: error ? 'var(--color-error)' : 'var(--color-on-surface-variant)',
        marginBottom: '0.5rem',
        marginLeft: '0.25rem',
        transition: 'color 0.2s'
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder || '••••••••••••'}
          style={{
            width: '100%',
            background: 'var(--color-surface-container)',
            color: 'var(--color-on-surface)',
            border: 'none',
            borderBottom: `2px solid ${error ? 'var(--color-error)' : 'var(--color-outline-variant)'}`,
            borderRadius: '0.5rem 0.5rem 0 0',
            padding: '1rem 3rem 1rem 1rem',
            fontSize: '1.125rem',
            fontFamily: 'monospace',
            outline: 'none',
            transition: 'border-color 0.2s',
            caretColor: 'var(--color-primary)'
          }}
          onFocus={e => {
            e.target.style.borderBottomColor = error
              ? 'var(--color-error)'
              : 'var(--color-primary)'
          }}
          onBlur={e => {
            e.target.style.borderBottomColor = error
              ? 'var(--color-error)'
              : 'var(--color-outline-variant)'
          }}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          style={{
            position: 'absolute',
            right: '0.875rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-on-surface-variant)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-on-surface-variant)'}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={springGentle}
            style={{
              color: 'var(--color-error)',
              fontSize: '0.75rem',
              marginTop: '0.375rem',
              marginLeft: '0.25rem',
              fontWeight: 500
            }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function LoginScreen({ onUnlocked }) {
  const [mode, setMode] = useState(null)        // null | 'login' | 'create'
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [loading, setLoading] = useState(false)

  // Beim Start: prüfen ob DB existiert
  useEffect(() => {
    window.steuerpilot.db.exists().then(exists => {
      setMode(exists ? 'login' : 'create')
    })
  }, [])

  function handlePasswordChange(val) {
    setPassword(val)
    if (error) setError('')
  }

  function handleConfirmChange(val) {
    setConfirm(val)
    if (confirmError) setConfirmError('')
  }

  async function handleSubmit() {
    if (loading) return
    setError('')
    setConfirmError('')

    if (mode === 'create') {
      if (password.length < 8) {
        setError('Passwort muss mindestens 8 Zeichen haben.')
        return
      }
      if (password !== confirm) {
        setConfirmError('Passwörter stimmen nicht überein.')
        return
      }
    }

    if (!password.trim()) {
      setError('Bitte Passwort eingeben.')
      return
    }

    setLoading(true)
    try {
      await window.steuerpilot.db.init(password)
      onUnlocked()
    } catch {
      setError('Falsches Passwort. Bitte nochmal versuchen.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  if (mode === null) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-background)'
      }} />
    )
  }

  const isCreate = mode === 'create'

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-background)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <BackgroundGlow />

      <motion.main
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={springGentle}
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: 960,
          height: 620,
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <BrandPanel />

        {/* Rechte Seite: Interaktionsbereich */}
        <div style={{
          flex: 1,
          background: 'linear-gradient(145deg, rgba(30,30,50,0.7) 0%, rgba(17,17,37,0.92) 100%)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          padding: '3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ width: '100%', maxWidth: 320 }}>

            {/* Lock-Icon */}
            <motion.div
              style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...spring, delay: 0.1 }}
            >
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--color-surface-container-high)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-secondary)'
              }}>
                <LockIcon filled />
              </div>
            </motion.div>

            {/* Überschrift */}
            <motion.div
              style={{ textAlign: 'center', marginBottom: '2.5rem' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springGentle, delay: 0.15 }}
            >
              <h3 style={{
                fontSize: '1.375rem',
                fontWeight: 700,
                color: 'var(--color-on-surface)',
                letterSpacing: '-0.015em',
                marginBottom: '0.5rem'
              }}>
                {isCreate ? 'Passwort festlegen' : 'Sicherer Zugriff'}
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                color: 'var(--color-on-surface-variant)',
                fontSize: '0.8125rem'
              }}>
                <span style={{ color: 'var(--color-primary)', display: 'flex' }}>
                  <ShieldIcon />
                </span>
                <span>Ende-zu-Ende verschlüsselt</span>
              </div>
            </motion.div>

            {/* Formular */}
            <motion.div
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springGentle, delay: 0.2 }}
            >
              <PasswordInput
                label="Master-Passwort"
                value={password}
                onChange={handlePasswordChange}
                onKeyDown={isCreate ? undefined : handleKeyDown}
                autoFocus
                error={error}
              />

              {isCreate && (
                <>
                  <PasswordInput
                    label="Passwort bestätigen"
                    value={confirm}
                    onChange={handleConfirmChange}
                    onKeyDown={handleKeyDown}
                    error={confirmError}
                  />

                  {/* Warnung: Passwort kann nicht zurückgesetzt werden */}
                  <div style={{
                    background: 'rgba(255,185,85,0.08)',
                    border: '1px solid rgba(255,185,85,0.2)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.875rem 1rem',
                    display: 'flex',
                    gap: '0.625rem',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{ color: 'var(--color-secondary)', marginTop: 1, display: 'flex', flexShrink: 0 }}>
                      <KeyIcon />
                    </span>
                    <p style={{
                      color: 'var(--color-on-secondary-container)',
                      fontSize: '0.75rem',
                      lineHeight: 1.5,
                      fontWeight: 500
                    }}>
                      Dieses Passwort kann <strong style={{ color: 'var(--color-secondary)' }}>nicht zurückgesetzt</strong> werden.
                      Es verschlüsselt direkt deine Steuerdaten.
                      Schreib es auf und bewahr es sicher auf.
                    </p>
                  </div>
                </>
              )}

              {/* Submit-Button */}
              <motion.button
                onClick={handleSubmit}
                disabled={loading}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
                transition={spring}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: loading ? 'var(--color-secondary-container)' : 'var(--color-secondary)',
                  color: 'var(--color-on-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--font-family)',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.625rem',
                  boxShadow: '0 4px 16px rgba(255,185,85,0.15)',
                  transition: 'background 0.2s, box-shadow 0.2s',
                  marginTop: '0.5rem'
                }}
              >
                {loading ? (
                  <span style={{ opacity: 0.7 }}>Einen Moment…</span>
                ) : (
                  <>
                    <span>{isCreate ? 'Passwort speichern' : 'Entsperren'}</span>
                    <ArrowIcon />
                  </>
                )}
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.main>
    </div>
  )
}
