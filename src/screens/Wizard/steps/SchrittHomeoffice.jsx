import { motion } from 'framer-motion'
import { springGentle } from '../../../theme/tokens.js'
import { berechneHomeofficePauschale, getJahreswerte } from '../../../engine/steuerberechnung.js'
import WizardField, { Input } from '../WizardField.jsx'

function formatEuro(val) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val ?? 0)
}

export default function SchrittHomeoffice({ daten, onChange, activeJahr }) {
  const tage = parseInt(daten.tage) || 0
  const jahr = activeJahr?.jahr ?? 2025
  const werte = getJahreswerte(jahr)

  const berechnet = tage > 0 ? berechneHomeofficePauschale(tage, jahr) : null
  const istMaximum = tage >= werte.homeofficeMaxTage

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
          Homeoffice-Pauschale
        </h2>
        <p style={{
          fontSize: '0.9375rem',
          color: 'var(--color-on-surface-variant)',
          margin: 0,
          lineHeight: 1.6
        }}>
          Seit 2020 gibt es die Homeoffice-Pauschale: {werte.homeofficeTagespauschale} € pro Tag im Homeoffice,
          maximal {werte.homeofficeMaxTage} Tage im Jahr (= {formatEuro(werte.homeofficeTagespauschale * werte.homeofficeMaxTage)}).
          Du brauchst kein Arbeitszimmer — es reicht der Küchentisch.
        </p>
      </div>

      <WizardField
        label="Tage im Homeoffice"
        erklarung={`Zähle alle Tage, an denen du ausschließlich von zu Hause aus gearbeitet hast. An Tagen wo du sowohl ins Büro als auch von zu Hause aus gearbeitet hast, gilt: Büro zählt — Homeoffice zählt nicht. Maximum: ${werte.homeofficeMaxTage} Tage.`}
        elster="Anlage N, Zeile 44 (Homeoffice-Pauschale)"
        hinweis={`${werte.homeofficeTagespauschale} € × Anzahl Tage, maximal ${werte.homeofficeMaxTage} Tage (${formatEuro(werte.homeofficeTagespauschale * werte.homeofficeMaxTage)}). Kein Nachweis nötig, kein Arbeitszimmer erforderlich.`}
      >
        <Input
          value={daten.tage}
          onChange={v => onChange({ tage: v })}
          suffix="Tage"
          placeholder="z.B. 80"
          type="number"
          min="0"
          max={werte.homeofficeMaxTage}
          step="1"
        />
      </WizardField>

      {/* Live-Berechnung */}
      {berechnet !== null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springGentle}
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(168, 199, 160, 0.07)',
            border: '1px solid rgba(168, 199, 160, 0.2)',
            borderRadius: '0.75rem'
          }}
        >
          <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>
            Homeoffice-Pauschale
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-tertiary)', letterSpacing: '-0.02em' }}>
              {formatEuro(berechnet)}
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
              ({Math.min(tage, werte.homeofficeMaxTage)} Tage × {werte.homeofficeTagespauschale} €)
            </span>
          </div>

          {istMaximum && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-secondary)',
                margin: '0.5rem 0 0',
                lineHeight: 1.5
              }}
            >
              Maximalbetrag erreicht — mehr als {werte.homeofficeMaxTage} Tage sind nicht anrechenbar.
            </motion.p>
          )}

          {!istMaximum && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.375rem 0 0', lineHeight: 1.5 }}>
              Dieser Betrag wird als Werbungskosten von deinen steuerpflichtigen Einkünften abgezogen.
            </p>
          )}
        </motion.div>
      )}

      {/* Kein Homeoffice */}
      {tage === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={springGentle}
          style={{
            padding: '0.875rem 1.125rem',
            background: 'var(--color-surface-container)',
            borderRadius: '0.75rem'
          }}
        >
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.55 }}>
            Kein Homeoffice genutzt? Kein Problem — trag einfach 0 ein oder lass das Feld leer.
            Diese Pauschale ist freiwillig, nur sinnvoll wenn du tatsächlich von zu Hause gearbeitet hast.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
