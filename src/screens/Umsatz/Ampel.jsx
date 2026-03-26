import { getJahreswerte } from '../../engine/steuerberechnung.js'

function AmpelKarte({ titel, wert, max, farbe, formatierung, hinweis }) {
  const prozent = max ? Math.min((wert / max) * 100, 100) : null
  return (
    <div style={{
      flex: 1,
      background: 'var(--color-surface-container)',
      borderRadius: 'var(--radius-xl)',
      padding: '1.125rem 1.25rem',
      border: '1px solid var(--color-outline-variant)'
    }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '0.625rem' }}>
        {titel}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', marginBottom: max ? '0.75rem' : 0 }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: farbe }}>
          {formatierung(wert)}
        </span>
        {max && (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
            von {formatierung(max)}
          </span>
        )}
      </div>
      {max && (
        <div style={{ height: 6, background: 'var(--color-surface-container-high)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${prozent}%`,
            background: farbe,
            borderRadius: 999,
            transition: 'width 0.6s ease'
          }} />
        </div>
      )}
      {hinweis && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.4 }}>
          {hinweis}
        </div>
      )}
    </div>
  )
}

function ampelFarbe(wert, max) {
  if (!max) return 'var(--color-secondary)'
  const ratio = wert / max
  if (ratio >= 1) return '#f44336'
  if (ratio >= 0.75) return '#ff9800'
  return '#4caf50'
}

export default function Ampel({ transaktionen, jahr }) {
  const jahreswerte = getJahreswerte(jahr ?? 2025)

  const arbeitsmittelSumme = transaktionen
    .filter(t => t.typ === 'ausgabe' && t.kategorie === 'arbeitsmittel')
    .reduce((s, t) => s + t.betrag, 0)

  const nichtKategorisiert = transaktionen.filter(t => t.kategorie === 'sonstige').length

  const absetzbareGesamt = transaktionen
    .filter(t => t.abzugsfaehig === 1)
    .reduce((s, t) => s + t.betrag, 0)

  const euro = v => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const zahl = v => v.toString()

  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
      <AmpelKarte
        titel="Arbeitsmittel-Freigrenze"
        wert={Math.round(arbeitsmittelSumme)}
        max={jahreswerte.arbeitsmittelFreigrenze}
        farbe={ampelFarbe(arbeitsmittelSumme, jahreswerte.arbeitsmittelFreigrenze)}
        formatierung={euro}
        hinweis={arbeitsmittelSumme > jahreswerte.arbeitsmittelFreigrenze
          ? 'Über Freigrenze — Einzelbelege und ggf. AfA prüfen.'
          : `Bis ${euro(jahreswerte.arbeitsmittelFreigrenze)} keine Einzelnachweise nötig.`}
      />
      <AmpelKarte
        titel="Nicht kategorisiert"
        wert={nichtKategorisiert}
        max={null}
        farbe={nichtKategorisiert === 0 ? '#4caf50' : nichtKategorisiert > 10 ? '#f44336' : '#ff9800'}
        formatierung={v => `${zahl(v)} Tx`}
        hinweis={nichtKategorisiert === 0
          ? 'Alle Transaktionen kategorisiert.'
          : 'Bitte manuell prüfen — könnten absetzbar sein.'}
      />
      <AmpelKarte
        titel="Absetzbar gesamt"
        wert={Math.round(absetzbareGesamt)}
        max={null}
        farbe="var(--color-secondary)"
        formatierung={euro}
        hinweis="Summe aller als absetzbar markierten Transaktionen."
      />
    </div>
  )
}
