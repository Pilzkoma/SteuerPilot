// src/screens/Einstellungen/EinstellungenScreen.jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { springGentle } from '../../theme/tokens.js'

// ── Shared Card-Wrapper ───────────────────────────────────────────────────────

function SettingsCard({ titel, beschreibung, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle}
      style={{
        background: 'var(--color-surface-container)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        marginBottom: '1rem'
      }}
    >
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{
          fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--color-secondary)',
          marginBottom: '0.25rem'
        }}>
          {titel}
        </div>
        {beschreibung && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
            {beschreibung}
          </div>
        )}
      </div>
      {children}
    </motion.div>
  )
}

// ── Shared Input ──────────────────────────────────────────────────────────────

function SettingsInput({ label, value, onChange, type = 'text', placeholder, showToggle, show, onToggle }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{
        display: 'block', fontSize: '0.75rem', fontWeight: 600,
        color: 'var(--color-on-surface-variant)', marginBottom: '0.375rem'
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={showToggle ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            background: 'var(--color-surface-container-high)',
            border: '1px solid var(--color-outline-variant)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.625rem 0.875rem',
            paddingRight: showToggle ? '2.5rem' : '0.875rem',
            fontFamily: 'var(--font-family)',
            fontSize: '0.875rem',
            color: 'var(--color-on-surface)',
            outline: 'none',
            boxSizing: 'border-box'
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-outline-variant)' }}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            style={{
              position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--color-on-surface-variant)', padding: '0.125rem',
              display: 'flex', alignItems: 'center'
            }}
          >
            {show ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ type, message }) {
  const isSuccess = type === 'success'
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={springGentle}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
        background: isSuccess ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
        color: isSuccess ? '#22c55e' : '#ef4444',
        borderRadius: 'var(--radius-pill)',
        padding: '0.25rem 0.75rem',
        fontSize: '0.75rem', fontWeight: 600,
        marginTop: '0.75rem'
      }}
    >
      <span>{isSuccess ? '✓' : '✕'}</span>
      {message}
    </motion.div>
  )
}

// ── Section: Passwort ─────────────────────────────────────────────────────────

function PasswortSection() {
  const [passwort, setPasswort] = useState('')
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRekey() {
    if (!passwort.trim()) {
      setStatus('error')
      setMsg('Bitte ein neues Passwort eingeben.')
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const result = await window.steuerpilot.db.rekey(passwort)
      if (result?.ok) {
        setStatus('success')
        setMsg('Passwort wurde geändert.')
        setPasswort('')
        setTimeout(() => setStatus(null), 3000)
      } else {
        setStatus('error')
        setMsg(result?.fehler ?? 'Fehler beim Ändern des Passworts.')
      }
    } catch (err) {
      setStatus('error')
      setMsg(err.message ?? 'Unbekannter Fehler.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SettingsCard
      titel="Passwort ändern"
      beschreibung="Das Passwort verschlüsselt deine Steuerdaten. Merke es gut — es gibt keine Wiederherstellung."
    >
      <SettingsInput
        label="Neues Passwort"
        value={passwort}
        onChange={setPasswort}
        placeholder="Neues Passwort eingeben"
        showToggle
        show={show}
        onToggle={() => setShow(v => !v)}
      />
      <button
        onClick={handleRekey}
        disabled={loading}
        style={{
          background: 'var(--color-primary)',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          padding: '0.625rem 1.25rem',
          cursor: loading ? 'default' : 'pointer',
          fontFamily: 'var(--font-family)',
          color: 'white', fontSize: '0.875rem', fontWeight: 600,
          opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s'
        }}
      >
        {loading ? 'Wird geändert…' : 'Passwort ändern'}
      </button>
      <AnimatePresence>
        {status && <StatusBadge type={status} message={msg} />}
      </AnimatePresence>
    </SettingsCard>
  )
}

// ── Section: Jetson ───────────────────────────────────────────────────────────

function JetsonSection() {
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [testStatus, setTestStatus] = useState(null)
  const [savePending, setSavePending] = useState(false)

  useEffect(() => {
    async function laden() {
      try {
        const einst = await window.steuerpilot.einstellungen.get()
        if (einst.jetson_url) setUrl(einst.jetson_url)
        if (einst.jetson_token) setToken(einst.jetson_token)
      } catch (err) {
        console.error('Jetson-Einstellungen laden:', err)
      }
    }
    laden()
  }, [])

  async function handleSpeichern() {
    setSavePending(true)
    setSaveStatus(null)
    try {
      await window.steuerpilot.einstellungen.set('jetson_url', url)
      await window.steuerpilot.einstellungen.set('jetson_token', token)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (err) {
      setSaveStatus('error')
    } finally {
      setSavePending(false)
    }
  }

  async function handleTest() {
    setTestStatus('testing')
    try {
      const result = await window.steuerpilot.jetson.test(url, token)
      setTestStatus(result)
    } catch (err) {
      setTestStatus({ ok: false, fehler: err.message ?? 'Verbindungsfehler.' })
    }
  }

  const testBadgeType = testStatus && testStatus !== 'testing'
    ? (testStatus.ok ? 'success' : 'error')
    : null

  const testBadgeMsg = testStatus && testStatus !== 'testing'
    ? (testStatus.ok
        ? `Verbunden — ${testStatus.modelle?.length ? testStatus.modelle.join(', ') : 'keine Modelle gefunden'}`
        : testStatus.fehler)
    : null

  return (
    <SettingsCard
      titel="Jetson-Verbindung"
      beschreibung="Dein Heimserver für OCR und KI-Analyse. Wird für automatische Belegerfassung verwendet."
    >
      <SettingsInput
        label="URL"
        value={url}
        onChange={setUrl}
        placeholder="http://192.168.1.100:11434"
        type="text"
      />
      <SettingsInput
        label="Token"
        value={token}
        onChange={setToken}
        placeholder="Bearer-Token (optional)"
        showToggle
        show={showToken}
        onToggle={() => setShowToken(v => !v)}
      />
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={handleSpeichern}
          disabled={savePending}
          style={{
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            padding: '0.625rem 1.25rem',
            cursor: savePending ? 'default' : 'pointer',
            fontFamily: 'var(--font-family)',
            color: 'white', fontSize: '0.875rem', fontWeight: 600,
            opacity: savePending ? 0.6 : 1, transition: 'opacity 0.15s'
          }}
        >
          {savePending ? 'Wird gespeichert…' : 'Speichern'}
        </button>
        <button
          onClick={handleTest}
          disabled={testStatus === 'testing' || !url.trim()}
          style={{
            background: 'var(--color-surface-container-high)',
            border: '1px solid var(--color-outline-variant)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.625rem 1.25rem',
            cursor: (testStatus === 'testing' || !url.trim()) ? 'default' : 'pointer',
            fontFamily: 'var(--font-family)',
            color: 'var(--color-on-surface)', fontSize: '0.875rem', fontWeight: 500,
            opacity: (!url.trim()) ? 0.5 : 1, transition: 'opacity 0.15s'
          }}
        >
          {testStatus === 'testing' ? 'Teste…' : 'Verbindung testen'}
        </button>
      </div>
      <AnimatePresence>
        {saveStatus && <StatusBadge type={saveStatus} message={saveStatus === 'success' ? 'Gespeichert.' : 'Fehler beim Speichern.'} />}
      </AnimatePresence>
      <AnimatePresence>
        {testBadgeType && <StatusBadge type={testBadgeType} message={testBadgeMsg} />}
      </AnimatePresence>
    </SettingsCard>
  )
}

// ── Section: Sync (Platzhalter) ───────────────────────────────────────────────

function SyncSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springGentle, delay: 0.1 }}
      style={{
        background: 'var(--color-surface-container)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        marginBottom: '1rem',
        display: 'flex', alignItems: 'center', gap: '1.25rem'
      }}
    >
      <div style={{
        width: 44, height: 44, flexShrink: 0,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface-container-high)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-outline)'
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M1 20v-6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '0.875rem', fontWeight: 600,
          color: 'var(--color-on-surface)', marginBottom: '0.25rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          iOS-Synchronisation
          <span style={{
            fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--color-outline)',
            background: 'var(--color-surface-container-high)',
            padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-pill)'
          }}>Bald</span>
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
          Wird mit der iOS-App aktiviert. Beide Geräte synchronisieren automatisch im selben WLAN.
        </div>
      </div>
    </motion.div>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EinstellungenScreen() {
  return (
    <div style={{ padding: '2.5rem', maxWidth: 680, margin: '0 auto' }}>

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
          Einstellungen
        </div>
        <h1 style={{
          fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em',
          color: 'var(--color-on-surface)', lineHeight: 1.15
        }}>
          App konfigurieren
        </h1>
      </motion.div>

      <PasswortSection />
      <JetsonSection />
      <SyncSection />
    </div>
  )
}
