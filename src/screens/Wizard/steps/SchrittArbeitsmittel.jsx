import { motion, AnimatePresence } from 'framer-motion'
import { springGentle, spring, colors } from '../../../theme/tokens.js'
import WizardField, { Input } from '../WizardField.jsx'

function formatEuro(val) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val ?? 0)
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArtikelRow({ item, onChangeBeschreibung, onChangeBetrag, onRemove }) {
  const betrag = parseFloat(item.betrag) || 0
  const ueber952 = betrag > 952

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={springGentle}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 140px 36px',
        gap: '0.625rem',
        alignItems: 'flex-start',
        marginBottom: '0.625rem'
      }}
    >
      <div>
        <Input
          value={item.beschreibung}
          onChange={onChangeBeschreibung}
          placeholder="z.B. Laptop, Headset, Schreibtischstuhl"
        />
        {ueber952 && (
          <p style={{ fontSize: '0.6875rem', color: colors.warning, margin: '0.25rem 0 0', lineHeight: 1.4 }}>
            Über 952 € — ggf. Abschreibung (AfA) prüfen
          </p>
        )}
      </div>
      <Input
        value={item.betrag}
        onChange={onChangeBetrag}
        suffix="€"
        placeholder="0"
        type="number"
        min="0"
        step="0.01"
      />
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onRemove}
        style={{
          width: 36,
          height: 40,
          background: 'transparent',
          border: '1px solid var(--color-outline-variant)',
          borderRadius: '0.625rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-on-surface-variant)',
          flexShrink: 0,
          transition: 'border-color 0.15s, color 0.15s'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = colors.error; e.currentTarget.style.color = colors.error }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = colors.outline_variant; e.currentTarget.style.color = colors.on_surface_variant }}
      >
        <IconTrash />
      </motion.button>
    </motion.div>
  )
}

export default function SchrittArbeitsmittel({ daten, onChange }) {
  const items = daten ?? []

  const gesamtBetrag = items.reduce((sum, i) => sum + (parseFloat(i.betrag) || 0), 0)
  const hatEintraege = items.length > 0

  function addItem() {
    onChange([...items, { key: Date.now(), beschreibung: '', betrag: '' }])
  }

  function removeItem(key) {
    onChange(items.filter(i => i.key !== key))
  }

  function updateItem(key, field, value) {
    onChange(items.map(i => i.key === key ? { ...i, [field]: value } : i))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={springGentle}
    >
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '1.375rem',
          fontWeight: 700,
          color: 'var(--color-on-surface)',
          margin: '0 0 0.5rem',
          letterSpacing: '-0.01em'
        }}>
          Arbeitsmittel
        </h2>
        <p style={{
          fontSize: '0.9375rem',
          color: 'var(--color-on-surface-variant)',
          margin: 0,
          lineHeight: 1.6
        }}>
          Gegenstände die du für deine Arbeit benötigst — Laptop, Headset, Schreibtisch, Fachliteratur.
          Bis 952 € (inkl. Mehrwertsteuer) kannst du sie im Kaufjahr vollständig absetzen.
        </p>
      </div>

      {/* Erklärungsfeld (immer sichtbar) */}
      <WizardField
        label="Deine Arbeitsmittel"
        erklarung="Trag jedes Arbeitsmittel einzeln ein. Wichtig: mindestens 10 % berufliche Nutzung ist Voraussetzung. Ein Laptop der überwiegend privat genutzt wird, kann nicht abgesetzt werden. Heb Kaufbelege auf."
        elster="Anlage N, Zeile 44 (Werbungskosten: Arbeitsmittel)"
        hinweis="Freigrenze: 952 € (brutto) — darunter sofort voll absetzbar, kein Nachweis der Nutzung nötig. Über 952 € wird über die Nutzungsdauer abgeschrieben (AfA)."
      >
        <div style={{ marginTop: '0.25rem' }}>
          {/* Liste */}
          <AnimatePresence>
            {hatEintraege && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 36px',
                  gap: '0.625rem',
                  marginBottom: '0.375rem'
                }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Bezeichnung</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Kaufpreis</span>
                  <div />
                </div>

                <AnimatePresence>
                  {items.map(item => (
                    <ArtikelRow
                      key={item.key}
                      item={item}
                      onChangeBeschreibung={v => updateItem(item.key, 'beschreibung', v)}
                      onChangeBetrag={v => updateItem(item.key, 'betrag', v)}
                      onRemove={() => removeItem(item.key)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hinzufügen-Button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={addItem}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              background: 'transparent',
              border: '1.5px dashed var(--color-outline-variant)',
              borderRadius: '0.75rem',
              cursor: 'pointer',
              color: 'var(--color-on-surface-variant)',
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.875rem',
              fontWeight: 500,
              width: '100%',
              justifyContent: 'center',
              marginTop: hatEintraege ? '0.25rem' : 0,
              transition: 'border-color 0.15s, color 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.color = colors.primary }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = colors.outline_variant; e.currentTarget.style.color = colors.on_surface_variant }}
          >
            <IconPlus />
            Arbeitsmittel hinzufügen
          </motion.button>
        </div>
      </WizardField>

      {/* Summe */}
      <AnimatePresence>
        {gesamtBetrag > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={springGentle}
            style={{
              padding: '1rem 1.25rem',
              background: 'rgba(168, 199, 160, 0.07)',
              border: '1px solid rgba(168, 199, 160, 0.2)',
              borderRadius: '0.75rem'
            }}
          >
            <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '0.375rem' }}>
              Gesamt Arbeitsmittel
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-tertiary)', letterSpacing: '-0.02em' }}>
              {formatEuro(gesamtBetrag)}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.375rem 0 0', lineHeight: 1.5 }}>
              Wird als Werbungskosten von deinen steuerpflichtigen Einkünften abgezogen.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leer-Zustand */}
      {!hatEintraege && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: '0.875rem 1.125rem',
            background: 'var(--color-surface-container)',
            borderRadius: '0.75rem',
            marginTop: '0.5rem'
          }}
        >
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.55 }}>
            Keine Arbeitsmittel gekauft? Das ist völlig normal. Dieser Schritt ist optional —
            überspring ihn wenn du im Steuerjahr keine beruflich genutzten Gegenstände angeschafft hast.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
