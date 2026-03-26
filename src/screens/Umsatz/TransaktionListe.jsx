import { useState } from 'react'

const KATEGORIEN = [
  { value: 'fahrtkosten', label: 'Fahrtkosten' },
  { value: 'homeoffice', label: 'Homeoffice' },
  { value: 'arbeitsmittel', label: 'Arbeitsmittel' },
  { value: 'krankenversicherung', label: 'Krankenversicherung' },
  { value: 'altersvorsorge', label: 'Altersvorsorge' },
  { value: 'spende', label: 'Spende' },
  { value: 'sonstige', label: 'Sonstige' }
]

const ABZUGSFAEHIGE_KATEGORIEN = new Set(['fahrtkosten', 'homeoffice', 'arbeitsmittel', 'krankenversicherung', 'altersvorsorge', 'spende'])

const KATEGORIE_FARBEN = {
  fahrtkosten: '#4fc3f7',
  homeoffice: '#aed581',
  arbeitsmittel: '#ffb74d',
  krankenversicherung: '#ce93d8',
  altersvorsorge: '#80cbc4',
  spende: '#ef9a9a',
  sonstige: '#90a4ae'
}

export default function TransaktionListe({ transaktionen, onUpdate, onDelete }) {
  const [deletingId, setDeletingId] = useState(null)

  function handleKategorieChange(t, kategorie) {
    const abzugsfaehig = ABZUGSFAEHIGE_KATEGORIEN.has(kategorie) ? 1 : 0
    onUpdate(t.id, { kategorie, abzugsfaehig })
  }

  function handleDeleteClick(id) {
    if (deletingId === id) {
      onDelete(id)
      setDeletingId(null)
    } else {
      setDeletingId(id)
      setTimeout(() => setDeletingId(null), 3000)
    }
  }

  if (transaktionen.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '2rem',
        color: 'var(--color-on-surface-variant)',
        fontSize: '0.8125rem'
      }}>
        Keine Transaktionen für diesen Filter.
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--color-surface-container)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      border: '1px solid var(--color-outline-variant)'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-container-high)' }}>
              {['Datum', 'Empfänger / Verwendungszweck', 'Betrag', 'Kategorie', 'Absetzbar', ''].map(col => (
                <th key={col} style={{
                  padding: '0.75rem 1rem', textAlign: 'left',
                  fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--color-on-surface-variant)',
                  borderBottom: '1px solid var(--color-outline-variant)',
                  whiteSpace: 'nowrap'
                }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transaktionen.map(t => (
              <tr
                key={t.id}
                style={{
                  borderBottom: '1px solid var(--color-outline-variant)',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-container-high)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Datum */}
                <td style={{ padding: '0.625rem 1rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                  {t.datum}
                </td>
                {/* Empfänger */}
                <td style={{ padding: '0.625rem 1rem', maxWidth: 280 }}>
                  <div style={{
                    color: 'var(--color-on-surface)', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {t.empfaenger || '—'}
                  </div>
                  {t.verwendungszweck && (
                    <div style={{
                      color: 'var(--color-on-surface-variant)', fontSize: '0.6875rem',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {t.verwendungszweck}
                    </div>
                  )}
                </td>
                {/* Betrag */}
                <td style={{
                  padding: '0.625rem 1rem', fontWeight: 700, whiteSpace: 'nowrap',
                  color: t.typ === 'einnahme' ? '#4caf50' : 'var(--color-on-surface)'
                }}>
                  {t.typ === 'einnahme' ? '+' : '-'}
                  {t.betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </td>
                {/* Kategorie */}
                <td style={{ padding: '0.625rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: KATEGORIE_FARBEN[t.kategorie] ?? '#90a4ae'
                    }} />
                    <select
                      value={t.kategorie}
                      onChange={e => handleKategorieChange(t, e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-on-surface)',
                        fontSize: '0.8125rem',
                        fontFamily: 'var(--font-family)',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {KATEGORIEN.map(k => (
                        <option key={k.value} value={k.value}>{k.label}</option>
                      ))}
                    </select>
                  </div>
                </td>
                {/* Absetzbar */}
                <td style={{ padding: '0.625rem 1rem' }}>
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-pill)',
                    background: t.abzugsfaehig ? 'rgba(76,175,80,0.15)' : 'var(--color-surface-container-high)',
                    color: t.abzugsfaehig ? '#4caf50' : 'var(--color-on-surface-variant)'
                  }}>
                    {t.abzugsfaehig ? 'Ja' : '—'}
                  </span>
                </td>
                {/* Löschen */}
                <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                  <button
                    onClick={() => handleDeleteClick(t.id)}
                    title={deletingId === t.id ? 'Nochmal klicken zum Bestätigen' : 'Löschen'}
                    style={{
                      background: deletingId === t.id ? 'rgba(244,67,54,0.15)' : 'none',
                      border: 'none', cursor: 'pointer',
                      color: deletingId === t.id ? '#f44336' : 'var(--color-outline)',
                      padding: '0.25rem', borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem', fontFamily: 'var(--font-family)',
                      transition: 'all 0.15s'
                    }}
                  >
                    {deletingId === t.id ? 'Bestätigen?' : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid var(--color-outline-variant)',
        fontSize: '0.75rem', color: 'var(--color-on-surface-variant)'
      }}>
        {transaktionen.length} Transaktionen
        {' · '}
        Absetzbar gesamt: <strong style={{ color: 'var(--color-secondary)' }}>
          {transaktionen.filter(t => t.abzugsfaehig).reduce((s, t) => s + t.betrag, 0)
            .toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
        </strong>
      </div>
    </div>
  )
}
