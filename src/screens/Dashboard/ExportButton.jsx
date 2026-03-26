import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { springGentle } from '../../theme/tokens.js'
import { generiereElsterPdf } from '../../engine/pdfExport.js'

// ── Icons ────────────────────────────────────────────────────────────────────

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function IconSpinner() {
  return (
    <motion.svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </motion.svg>
  )
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function IconError() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

// ── ExportButton ─────────────────────────────────────────────────────────────

export default function ExportButton({ nutzer, activeJahr }) {
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'done' | 'error'
  const [errorMsg, setErrorMsg] = useState(null)

  async function handleExport() {
    if (status === 'loading') return
    setStatus('loading')
    setErrorMsg(null)

    try {
      const db = window.steuerpilot.db
      const jahrId = activeJahr?.id

      if (!jahrId) throw new Error('Kein Steuerjahr aktiv.')

      // Einnahmen und Ausgaben laden
      const [einnahmenRows, ausgabenRows, wizardRow] = await Promise.all([
        db.all(
          'SELECT betrag, kategorie, beschreibung FROM einnahmen WHERE steuerjahr_id = ?',
          [jahrId]
        ),
        db.all(
          'SELECT betrag, kategorie, beschreibung FROM ausgaben WHERE steuerjahr_id = ? AND abzugsfaehig = 1',
          [jahrId]
        ),
        db.get(
          'SELECT daten FROM wizard_fortschritt WHERE steuerjahr_id = ? ORDER BY id DESC LIMIT 1',
          [jahrId]
        )
      ])

      let fortschritt = {}
      if (wizardRow?.daten) {
        try { fortschritt = JSON.parse(wizardRow.daten) } catch {}
      }

      // PDF generieren
      const { buffer } = generiereElsterPdf({
        nutzer,
        activeJahr,
        einnahmenRows: einnahmenRows ?? [],
        ausgabenRows: ausgabenRows ?? [],
        fortschritt
      })

      // Speichern via IPC
      const jahr = activeJahr?.jahr ?? 'export'
      const nachname = nutzer?.nachname ? `_${nutzer.nachname}` : ''
      const filename = `SteuerPilot_${jahr}${nachname}.pdf`

      const saved = await window.steuerpilot.pdf.save(new Uint8Array(buffer), filename)

      if (saved === false) {
        // Nutzer hat Dialog abgebrochen
        setStatus('idle')
        return
      }

      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      console.error('PDF Export:', err)
      setErrorMsg(err.message ?? 'Unbekannter Fehler')
      setStatus('error')
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  const isLoading = status === 'loading'
  const isDone    = status === 'done'
  const isError   = status === 'error'

  return (
    <div style={{ position: 'relative' }}>
      <motion.button
        onClick={handleExport}
        disabled={isLoading}
        whileHover={isLoading ? {} : { scale: 1.03 }}
        whileTap={isLoading ? {} : { scale: 0.97 }}
        transition={springGentle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-lg)',
          border: isError
            ? '1px solid rgba(220,53,69,0.4)'
            : isDone
              ? '1px solid rgba(40,140,60,0.3)'
              : '1px solid rgba(245,166,35,0.25)',
          background: isError
            ? 'rgba(220,53,69,0.08)'
            : isDone
              ? 'rgba(40,140,60,0.08)'
              : 'rgba(245,166,35,0.08)',
          color: isError
            ? 'var(--color-error)'
            : isDone
              ? '#28a028'
              : 'var(--color-secondary)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          cursor: isLoading ? 'wait' : 'pointer',
          transition: 'background 0.2s, color 0.2s, border-color 0.2s',
          userSelect: 'none',
          letterSpacing: '0.01em',
          minWidth: 160,
          justifyContent: 'center'
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isLoading && (
            <motion.span key="spin"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={springGentle}
              style={{ display: 'flex' }}
            >
              <IconSpinner />
            </motion.span>
          )}
          {isDone && (
            <motion.span key="check"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={springGentle}
              style={{ display: 'flex' }}
            >
              <IconCheck />
            </motion.span>
          )}
          {isError && (
            <motion.span key="err"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={springGentle}
              style={{ display: 'flex' }}
            >
              <IconError />
            </motion.span>
          )}
          {!isLoading && !isDone && !isError && (
            <motion.span key="dl"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={springGentle}
              style={{ display: 'flex' }}
            >
              <IconDownload />
            </motion.span>
          )}
        </AnimatePresence>

        <span>
          {isLoading ? 'PDF wird erstellt…'
            : isDone   ? 'Gespeichert!'
            : isError  ? 'Fehler — Nochmal'
            : 'ELSTER-Zusammenfassung'}
        </span>
      </motion.button>

      {/* Fehler-Tooltip */}
      <AnimatePresence>
        {isError && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={springGentle}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: 'var(--color-error)',
              color: '#fff',
              fontSize: '0.6875rem',
              padding: '0.375rem 0.625rem',
              borderRadius: 'var(--radius-md)',
              whiteSpace: 'normal',
              zIndex: 10,
              maxWidth: 260,
              lineHeight: 1.4
            }}
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
