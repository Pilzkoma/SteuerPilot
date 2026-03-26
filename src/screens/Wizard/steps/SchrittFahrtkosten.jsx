import { motion } from 'framer-motion'
import { springGentle } from '../../../theme/tokens.js'
import { berechneFahrtkosten } from '../../../engine/steuerberechnung.js'
import WizardField, { Input, Toggle } from '../WizardField.jsx'

function formatEuro(val) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val ?? 0)
}

export default function SchrittFahrtkosten({ daten, onChange, activeJahr }) {
  const km = parseFloat(daten.km) || 0
  const tage = parseInt(daten.arbeitstage) || 0
  const jahr = activeJahr?.jahr ?? 2025

  const berechnet = (!daten.oeffentlich && km > 0 && tage > 0)
    ? berechneFahrtkosten(km, tage, jahr)
    : null

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
          Fahrtkosten
        </h2>
        <p style={{
          fontSize: '0.9375rem',
          color: 'var(--color-on-surface-variant)',
          margin: 0,
          lineHeight: 1.6
        }}>
          Fahrten zwischen deiner Wohnung und deiner ersten Tätigkeitsstätte (Arbeitsstätte) sind steuerlich absetzbar — unabhängig vom Verkehrsmittel.
        </p>
      </div>

      <WizardField
        label="Öffentliche Verkehrsmittel genutzt?"
        erklarung="Wenn du Bus, Bahn oder andere öffentliche Verkehrsmittel für deine Arbeitswege genutzt hast, können tatsächliche Kosten (Ticket/Abo) statt der Entfernungspauschale günstiger sein."
        elster="Anlage N, Zeile 32–33"
        hinweis="Bei Öffentlichen Verkehrsmitteln trägst du die tatsächlichen Kosten ein. Die Entfernungspauschale gilt nur für private Fahrzeuge. Wähle was höher ist."
      >
        <div style={{ marginTop: '0.25rem' }}>
          <Toggle
            value={daten.oeffentlich}
            onChange={v => onChange({ oeffentlich: v })}
            label="Ja, ich habe überwiegend öffentliche Verkehrsmittel genutzt"
          />
        </div>
      </WizardField>

      {daten.oeffentlich ? (
        <WizardField
          label="Tatsächliche Fahrtkosten (z.B. Jahresticket)"
          erklarung="Die Summe aller Kosten für Fahrkarten, Monats- oder Jahrestickets für Fahrten zur Arbeit. Kein Privatanteil, nur Arbeitswege. Heb die Belege auf."
          elster="Anlage N, Zeile 33"
        >
          <Input
            value={daten.oeffentlichKosten ?? ''}
            onChange={v => onChange({ oeffentlichKosten: v })}
            suffix="€"
            placeholder="z.B. 1200"
          />
        </WizardField>
      ) : (
        <>
          <WizardField
            label="Einfache Entfernung zur Arbeit"
            erklarung="Die kürzeste Straßenverbindung (oder verkehrsgünstigste Route) von deiner Wohnung zu deiner Arbeitsstätte — nur eine Strecke, nicht hin und zurück. Das Finanzamt rechnet nur die Hinfahrt."
            elster="Anlage N, Zeile 31"
          >
            <Input
              value={daten.km}
              onChange={v => onChange({ km: v })}
              suffix="km"
              placeholder="z.B. 15"
              type="number"
              min="0"
              step="1"
            />
          </WizardField>

          <WizardField
            label="Arbeitstage pro Jahr"
            erklarung="Die tatsächliche Anzahl der Tage, an denen du deine Arbeitsstätte aufgesucht hast. Typisch sind 220–230 Tage bei Vollzeit. Homeoffice-Tage zählen nicht mit. Urlaub, Krankheit und Feiertage werden abgezogen."
            elster="Anlage N, Zeile 31 (Grundlage der Berechnung)"
            hinweis="Homeoffice-Tage nicht mitzählen — die kommen im nächsten Schritt. Faustregel: 5 Tage/Woche × 52 Wochen = 260 minus Urlaub (30) minus Feiertage (10) = ca. 220 Tage."
          >
            <Input
              value={daten.arbeitstage}
              onChange={v => onChange({ arbeitstage: v })}
              suffix="Tage"
              placeholder="z.B. 220"
              type="number"
              min="0"
              max="365"
              step="1"
            />
          </WizardField>
        </>
      )}

      {/* Live-Berechnung */}
      {(berechnet !== null || (daten.oeffentlich && parseFloat(daten.oeffentlichKosten) > 0)) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springGentle}
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(168, 199, 160, 0.07)',
            border: '1px solid rgba(168, 199, 160, 0.2)',
            borderRadius: '0.75rem',
            marginTop: '0.25rem'
          }}
        >
          <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>
            Abzugsfähige Fahrtkosten
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-tertiary)', letterSpacing: '-0.02em' }}>
              {formatEuro(berechnet ?? parseFloat(daten.oeffentlichKosten))}
            </span>
            {!daten.oeffentlich && berechnet !== null && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                ({km} km × {tage} Tage × Entfernungspauschale)
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.375rem 0 0', lineHeight: 1.5 }}>
            Dieser Betrag wird von deinen steuerpflichtigen Einkünften abgezogen.
          </p>
        </motion.div>
      )}

      {/* Kein Auto, kein ÖPNV */}
      {!daten.oeffentlich && km === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={springGentle}
          style={{
            padding: '0.875rem 1.125rem',
            background: 'var(--color-surface-container)',
            borderRadius: '0.75rem',
            marginTop: '0.25rem'
          }}
        >
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.55 }}>
            Arbeitest du vollständig im Homeoffice? Dann hast du keine Fahrtkosten.
            Das ist völlig in Ordnung — die Homeoffice-Pauschale kommt im nächsten Schritt.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
