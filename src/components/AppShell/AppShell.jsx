import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { spring, springGentle } from '../../theme/tokens.js'

// ── Nav-Icons ─────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function IconWizard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconBelege() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="17" x2="13" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconUmsatz() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconPdf() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 15v-2h1.5a1 1 0 0 1 0 2H9z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M13 13h1a2 2 0 0 1 0 4h-1v-4z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M17 13h2M17 15h1.5M17 17h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Navigation Config ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconDashboard />, available: true },
  { id: 'wizard', label: 'Dateneingabe', icon: <IconWizard />, available: true },
  { id: 'belege', label: 'Belege', icon: <IconBelege />, available: false },
  { id: 'umsatz', label: 'Umsatz', icon: <IconUmsatz />, available: false },
  { id: 'pdf', label: 'PDF Export', icon: <IconPdf />, available: false },
]

const BOTTOM_ITEMS = [
  { id: 'einstellungen', label: 'Einstellungen', icon: <IconSettings />, available: false },
]

// ── Jahres-Selektor ───────────────────────────────────────────────────────────

function JahrSelector({ jahre, activeJahr, onChangeJahr }) {
  const [open, setOpen] = useState(false)
  const aktiv = jahre.find(j => j.id === activeJahr)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'var(--color-surface-container)',
          border: '1px solid var(--color-outline-variant)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.625rem 0.875rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-family)',
          color: 'var(--color-on-surface)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{
            fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--color-secondary)',
            background: 'rgba(255,185,85,0.1)',
            padding: '0.125rem 0.375rem',
            borderRadius: 'var(--radius-pill)'
          }}>Jahr</span>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
            {aktiv?.jahr ?? '—'}
          </span>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={spring}
          style={{ color: 'var(--color-on-surface-variant)', display: 'flex' }}
        >
          <IconChevronDown />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
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
              zIndex: 50,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              transformOrigin: 'top'
            }}
          >
            {jahre.map(j => (
              <button
                key={j.id}
                onClick={() => { onChangeJahr(j.id); setOpen(false) }}
                style={{
                  width: '100%',
                  background: j.id === activeJahr ? 'rgba(255,185,85,0.08)' : 'transparent',
                  border: 'none',
                  padding: '0.75rem 0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-family)',
                  color: j.id === activeJahr ? 'var(--color-secondary)' : 'var(--color-on-surface)',
                  fontSize: '0.875rem',
                  fontWeight: j.id === activeJahr ? 700 : 400,
                  transition: 'background 0.1s'
                }}
                onMouseEnter={e => { if (j.id !== activeJahr) e.currentTarget.style.background = 'var(--color-surface-container)' }}
                onMouseLeave={e => { if (j.id !== activeJahr) e.currentTarget.style.background = 'transparent' }}
              >
                <span>{j.jahr}</span>
                {j.id === activeJahr && (
                  <span style={{
                    fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--color-secondary)'
                  }}>Aktiv</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({ item, active, onClick }) {
  return (
    <motion.button
      onClick={item.available ? onClick : undefined}
      whileTap={item.available ? { scale: 0.97 } : {}}
      style={{
        width: '100%',
        background: active ? 'var(--color-surface-container-high)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        padding: '0.6875rem 0.875rem',
        cursor: item.available ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontFamily: 'var(--font-family)',
        color: active
          ? 'var(--color-primary)'
          : item.available
            ? 'var(--color-on-surface-variant)'
            : 'var(--color-outline-variant)',
        fontSize: '0.8125rem',
        fontWeight: active ? 600 : 400,
        position: 'relative',
        transition: 'background 0.15s, color 0.15s',
        textAlign: 'left'
      }}
      onMouseEnter={e => {
        if (!active && item.available) e.currentTarget.style.background = 'var(--color-surface-container)'
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = 'transparent'
      }}
    >
      {/* Active indicator */}
      {active && (
        <motion.div
          layoutId="nav-active"
          style={{
            position: 'absolute',
            left: 0,
            top: '20%', bottom: '20%',
            width: 3,
            borderRadius: 999,
            background: 'var(--color-primary)'
          }}
          transition={spring}
        />
      )}

      <span style={{ display: 'flex', flexShrink: 0 }}>{item.icon}</span>
      <span>{item.label}</span>

      {!item.available && (
        <span style={{
          marginLeft: 'auto',
          fontSize: '0.5rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-outline)',
          background: 'var(--color-surface-container)',
          padding: '0.125rem 0.375rem',
          borderRadius: 'var(--radius-pill)'
        }}>Bald</span>
      )}
    </motion.button>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ activeScreen, onNavigate, nutzer, jahre, activeJahr, onChangeJahr }) {
  return (
    <div style={{
      width: 240,
      flexShrink: 0,
      height: '100vh',
      background: 'var(--color-surface-container-lowest)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.5rem 1.25rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span style={{ color: 'var(--color-secondary)', fontSize: '1.125rem' }}>✦</span>
        <div>
          <div style={{
            color: 'var(--color-secondary)', fontWeight: 800,
            fontSize: '0.9375rem', letterSpacing: '-0.02em'
          }}>SteuerPilot</div>
          <div style={{
            color: 'var(--color-on-surface-variant)',
            fontSize: '0.5625rem', fontWeight: 500,
            letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6
          }}>Wealth Navigator</div>
        </div>
      </div>

      {/* Jahresselektor */}
      <div style={{ padding: '0 1rem 1.25rem' }}>
        <JahrSelector jahre={jahre} activeJahr={activeJahr} onChangeJahr={onChangeJahr} />
      </div>

      {/* Trennlinie via Hintergrundfarbe */}
      <div style={{ height: 1, background: 'var(--color-surface-container)', margin: '0 1rem 1rem' }} />

      {/* Hauptnavigation */}
      <nav style={{ flex: 1, padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.125rem', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.id}
            item={item}
            active={activeScreen === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </nav>

      {/* Bottom: Einstellungen + Nutzer */}
      <div style={{ padding: '0 0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        {BOTTOM_ITEMS.map(item => (
          <NavItem
            key={item.id}
            item={item}
            active={activeScreen === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}

        {/* Nutzerprofil */}
        {nutzer && (
          <div style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            background: 'var(--color-surface-container)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem'
          }}>
            <div style={{
              width: 30, height: 30, flexShrink: 0,
              borderRadius: '50%',
              background: 'var(--color-primary-container)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-on-primary-container)'
            }}>
              {nutzer.vorname?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: '0.75rem', fontWeight: 600,
                color: 'var(--color-on-surface)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {nutzer.vorname} {nutzer.nachname}
              </div>
              <div style={{
                fontSize: '0.625rem', color: 'var(--color-on-surface-variant)',
                textTransform: 'capitalize', letterSpacing: '0.04em'
              }}>
                {nutzer.nutzertyp}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── AppShell ──────────────────────────────────────────────────────────────────

export default function AppShell({ children, activeScreen = 'dashboard', onNavigate }) {
  const [nutzer, setNutzer] = useState(null)
  const [jahre, setJahre] = useState([])
  const [activeJahr, setActiveJahr] = useState(null)

  useEffect(() => {
    loadShellData()
  }, [])

  async function loadShellData() {
    const db = window.steuerpilot.db
    try {
      const [nutzerRow, jahreRows] = await Promise.all([
        db.get('SELECT vorname, nachname, nutzertyp FROM nutzer LIMIT 1', []),
        db.all('SELECT id, jahr, aktiv FROM steuerjahre ORDER BY jahr DESC', [])
      ])
      setNutzer(nutzerRow ?? null)
      setJahre(jahreRows ?? [])
      const aktiv = jahreRows?.find(j => j.aktiv === 1)
      setActiveJahr(aktiv?.id ?? jahreRows?.[0]?.id ?? null)
    } catch (err) {
      console.error('AppShell loadShellData:', err)
    }
  }

  async function handleChangeJahr(jahrId) {
    if (jahrId === activeJahr) return
    const db = window.steuerpilot.db
    try {
      await db.run('UPDATE steuerjahre SET aktiv = 0', [])
      await db.run('UPDATE steuerjahre SET aktiv = 1 WHERE id = ?', [jahrId])
      setActiveJahr(jahrId)
    } catch (err) {
      console.error('Jahreswechsel fehlgeschlagen:', err)
    }
  }

  const activeJahrObj = jahre.find(j => j.id === activeJahr) ?? null

  return (
    <motion.div
      key="app-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={springGentle}
      style={{
        height: '100vh',
        display: 'flex',
        background: 'var(--color-background)',
        fontFamily: 'var(--font-family)',
        overflow: 'hidden'
      }}
    >
      <Sidebar
        activeScreen={activeScreen}
        onNavigate={onNavigate}
        nutzer={nutzer}
        jahre={jahre}
        activeJahr={activeJahr}
        onChangeJahr={handleChangeJahr}
      />

      {/* Content */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        minWidth: 0
      }}>
        {typeof children === 'function'
          ? children({ nutzer, activeJahr: activeJahrObj })
          : children}
      </main>
    </motion.div>
  )
}
