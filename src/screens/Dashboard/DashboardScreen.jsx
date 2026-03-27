import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { springGentle } from '../../theme/tokens.js'
import { schaetzeRueckerstattung } from '../../engine/steuerberechnung.js'
import ExportButton from './ExportButton.jsx'

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function formatEuro(value) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value ?? 0)
}

function getDaysBetween(from, to) {
  const ms = to.getTime() - from.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function getDeadlines(jahr) {
  if (!jahr) return null
  const y = jahr.jahr
  return {
    ohneStb: new Date(y + 1, 9, 31),   // 31. Oktober Folgejahr
    mitStb: new Date(y + 2, 1, 28),     // 28. Februar übernächstes Jahr
  }
}

// ── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

// ── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ title, value, subtitle, accent = false, highlight = false, delay = 0, empty = false, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springGentle, delay }}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      style={{
        background: highlight
          ? 'linear-gradient(135deg, rgba(255,185,85,0.1) 0%, rgba(255,185,85,0.04) 100%)'
          : 'var(--color-surface-container)',
        border: highlight
          ? '1px solid rgba(255,185,85,0.2)'
          : '1px solid transparent',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        cursor: onClick ? 'pointer' : 'default'
      }}
      onMouseEnter={onClick ? e => { e.currentTarget.style.filter = 'brightness(1.06)' } : undefined}
      onMouseLeave={onClick ? e => { e.currentTarget.style.filter = '' } : undefined}
    >
      <div style={{
        fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: highlight ? 'var(--color-secondary)' : 'var(--color-on-surface-variant)'
      }}>
        {title}
      </div>

      <div style={{
        fontSize: '1.875rem', fontWeight: 800,
        letterSpacing: '-0.03em',
        color: empty
          ? 'var(--color-outline)'
          : accent
            ? 'var(--color-primary)'
            : highlight
              ? 'var(--color-secondary)'
              : 'var(--color-on-surface)',
        lineHeight: 1.1
      }}>
        {empty ? '—' : value}
      </div>

      <div style={{
        fontSize: '0.75rem',
        color: 'var(--color-on-surface-variant)',
        lineHeight: 1.4
      }}>
        {subtitle}
      </div>
    </motion.div>
  )
}

// ── Deadline Card ─────────────────────────────────────────────────────────────

function DeadlineCard({ jahr, delay = 0 }) {
  const deadlines = getDeadlines(jahr)
  if (!deadlines) return null

  const now = new Date()
  const daysOhneStb = getDaysBetween(now, deadlines.ohneStb)
  const daysMitStb = getDaysBetween(now, deadlines.mitStb)

  const ohneStbPast = daysOhneStb < 0
  const mitStbPast = daysMitStb < 0

  function urgencyColor(days) {
    if (days < 0) return 'var(--color-outline)'
    if (days <= 30) return 'var(--color-error)'
    if (days <= 90) return 'var(--color-warning)'
    return 'var(--color-primary)'
  }

  function DeadlineRow({ label, date, days }) {
    const past = days < 0
    const color = urgencyColor(days)
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.875rem 0',
        borderBottom: '1px solid var(--color-surface-container-high)'
      }}>
        <div>
          <div style={{
            fontSize: '0.8125rem', fontWeight: 500,
            color: past ? 'var(--color-outline)' : 'var(--color-on-surface)'
          }}>
            {label}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)', marginTop: '0.125rem' }}>
            {date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{
          textAlign: 'right', flexShrink: 0, marginLeft: '1rem'
        }}>
          {past ? (
            <span style={{
              fontSize: '0.6875rem', fontWeight: 600,
              color: 'var(--color-outline)',
              background: 'var(--color-surface-container)',
              padding: '0.25rem 0.625rem',
              borderRadius: 'var(--radius-pill)'
            }}>Abgelaufen</span>
          ) : (
            <>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {days}
              </div>
              <div style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase' }}>
                Tage
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springGentle, delay }}
      style={{
        background: 'var(--color-surface-container)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{
        fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: 'var(--color-on-surface-variant)',
        marginBottom: '0.25rem'
      }}>
        Abgabefristen {jahr?.jahr}
      </div>
      <div style={{
        fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)',
        marginBottom: '0.5rem'
      }}>
        Für die Steuererklärung {jahr?.jahr}
      </div>

      <DeadlineRow
        label="Ohne Steuerberater"
        date={deadlines.ohneStb}
        days={daysOhneStb}
      />
      <DeadlineRow
        label="Mit Steuerberater"
        date={deadlines.mitStb}
        days={daysMitStb}
      />

      <div style={{
        marginTop: '0.875rem',
        fontSize: '0.6875rem',
        color: 'var(--color-on-surface-variant)',
        lineHeight: 1.5,
        display: 'flex', alignItems: 'flex-start', gap: '0.375rem'
      }}>
        <span style={{ color: 'var(--color-primary)', marginTop: 1 }}>ℹ</span>
        <span>
          Mit Steuerberater verlängert sich die Frist auf den 28.&nbsp;Februar {(jahr?.jahr ?? 0) + 2}.
        </span>
      </div>
    </motion.div>
  )
}

// ── Checklist-Card ────────────────────────────────────────────────────────────

const CHECKLIST_NAV = {
  einnahmen:    'wizard',
  werbungskosten: 'wizard',
  belege:       'belege',
}

function ChecklistCard({ nutzer, metrics, delay = 0, onNavigate }) {
  const checks = [
    {
      id: 'profil',
      label: 'Nutzerprofil angelegt',
      detail: nutzer ? `${nutzer.vorname} ${nutzer.nachname}` : null,
      done: Boolean(nutzer)
    },
    {
      id: 'steuerId',
      label: 'Steuer-ID hinterlegt',
      detail: 'Für Anlage N und ELSTER-Vorbefüllung',
      done: Boolean(nutzer?.steuer_id)
    },
    {
      id: 'einnahmen',
      label: 'Einnahmen erfasst',
      detail: 'Lohnsteuerbescheinigung oder Honorare',
      done: (metrics?.einnahmen ?? 0) > 0
    },
    {
      id: 'werbungskosten',
      label: 'Werbungskosten erfasst',
      detail: 'Fahrtkosten, Homeoffice, Arbeitsmittel',
      done: (metrics?.ausgaben ?? 0) > 0
    },
    {
      id: 'belege',
      label: 'Belege hochgeladen',
      detail: 'Fotos oder PDFs der Ausgaben',
      done: (metrics?.belege ?? 0) > 0
    }
  ]

  const doneCount = checks.filter(c => c.done).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springGentle, delay }}
      style={{
        background: 'var(--color-surface-container)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem'
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <div>
          <div style={{
            fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--color-on-surface-variant)'
          }}>Fortschritt</div>
          <div style={{
            fontSize: '0.8125rem', color: 'var(--color-on-surface)', fontWeight: 500, marginTop: '0.125rem'
          }}>
            Was noch fehlt
          </div>
        </div>
        <div style={{
          fontSize: '0.75rem', fontWeight: 700,
          color: doneCount === checks.length ? 'var(--color-tertiary)' : 'var(--color-secondary)',
          background: doneCount === checks.length
            ? 'rgba(168,199,160,0.1)'
            : 'rgba(255,185,85,0.1)',
          padding: '0.25rem 0.625rem',
          borderRadius: 'var(--radius-pill)'
        }}>
          {doneCount}/{checks.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: 4, background: 'var(--color-surface-container-high)',
        borderRadius: 999, marginBottom: '1.125rem', overflow: 'hidden'
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(doneCount / checks.length) * 100}%` }}
          transition={{ ...springGentle, delay: delay + 0.2 }}
          style={{
            height: '100%',
            background: doneCount === checks.length
              ? 'var(--color-tertiary)'
              : 'var(--color-secondary)',
            borderRadius: 999
          }}
        />
      </div>

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {checks.map((check, i) => {
          const navTarget = !check.done ? CHECKLIST_NAV[check.id] : null
          return (
          <motion.div
            key={check.id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springGentle, delay: delay + 0.1 + i * 0.04 }}
            onClick={navTarget && onNavigate ? () => onNavigate(navTarget) : undefined}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              padding: '0.5rem 0.25rem',
              borderRadius: 'var(--radius-md)',
              cursor: navTarget ? 'pointer' : 'default'
            }}
            onMouseEnter={navTarget ? e => { e.currentTarget.style.background = 'var(--color-surface-container-high)' } : undefined}
            onMouseLeave={navTarget ? e => { e.currentTarget.style.background = '' } : undefined}
          >
            <div style={{
              width: 20, height: 20, flexShrink: 0,
              borderRadius: '50%',
              background: check.done ? 'var(--color-tertiary-container)' : 'var(--color-surface-container-high)',
              border: check.done ? 'none' : '1.5px solid var(--color-outline-variant)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 1
            }}>
              {check.done && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="var(--color-on-tertiary-container)"
                    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div>
              <div style={{
                fontSize: '0.8125rem', fontWeight: 500,
                color: check.done ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)',
                textDecoration: check.done ? 'none' : 'none'
              }}>
                {check.label}
              </div>
              {!check.done && (
                <div style={{
                  fontSize: '0.6875rem', color: 'var(--color-outline)',
                  marginTop: '0.125rem', lineHeight: 1.4
                }}>
                  {check.detail}
                </div>
              )}
              {check.done && check.detail && (
                <div style={{
                  fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)',
                  marginTop: '0.125rem'
                }}>
                  {check.detail}
                </div>
              )}
            </div>
          </motion.div>
        )})}
      </div>
    </motion.div>
  )
}

// ── Estimate Card ─────────────────────────────────────────────────────────────

function EstimateCard({ metrics, activeJahr, delay = 0 }) {
  const jahr = activeJahr?.jahr
  const hasData = (metrics?.einnahmen ?? 0) > 0

  let ergebnis = null
  let vollstaendig = false

  if (hasData && jahr) {
    try {
      ergebnis = schaetzeRueckerstattung({
        bruttoJahreslohn: metrics.einnahmen,
        einbehalteneLoHSt: metrics.lohnsteuer ?? 0,
        werbungskosten: metrics.ausgaben ?? 0,
        sonderausgaben: 0,
        jahr
      })
      vollstaendig = Boolean(metrics.lohnsteuer)
    } catch {}
  }

  const istRueckerstattung = (ergebnis?.geschaetzteRueckerstattung ?? 0) > 0
  const betrag = ergebnis
    ? Math.abs(ergebnis.geschaetzteRueckerstattung)
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springGentle, delay }}
      style={{
        background: hasData && ergebnis
          ? istRueckerstattung
            ? 'linear-gradient(135deg, rgba(168,199,160,0.1) 0%, rgba(168,199,160,0.04) 100%)'
            : 'linear-gradient(135deg, rgba(255,138,128,0.08) 0%, rgba(255,138,128,0.03) 100%)'
          : 'var(--color-surface-container)',
        border: hasData && ergebnis
          ? istRueckerstattung
            ? '1px solid rgba(168,199,160,0.2)'
            : '1px solid rgba(255,138,128,0.15)'
          : '1px solid transparent',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem'
      }}
    >
      <div style={{
        fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: hasData && ergebnis
          ? istRueckerstattung ? 'var(--color-tertiary)' : 'var(--color-error)'
          : 'var(--color-on-surface-variant)',
        marginBottom: '0.5rem'
      }}>
        {hasData && ergebnis
          ? istRueckerstattung ? 'Voraussichtliche Rückerstattung' : 'Voraussichtliche Nachzahlung'
          : 'Schätzung'}
      </div>

      {!hasData ? (
        <>
          <div style={{
            fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em',
            color: 'var(--color-outline)', lineHeight: 1.1, marginBottom: '0.5rem'
          }}>
            —
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.4 }}>
            Erfasse deine Einnahmen im Dateneingabe-Wizard, um eine Schätzung zu erhalten.
          </div>
        </>
      ) : (
        <>
          <div style={{
            fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em',
            color: istRueckerstattung ? 'var(--color-tertiary)' : 'var(--color-error)',
            lineHeight: 1.1, marginBottom: '0.5rem'
          }}>
            {formatEuro(betrag)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.4 }}>
            {!vollstaendig
              ? 'Unvollständige Schätzung — Lohnsteuer-Daten fehlen noch.'
              : `Basierend auf ${formatEuro(metrics.einnahmen)} Einnahmen und ${formatEuro(metrics.ausgaben)} Werbungskosten.`}
          </div>
        </>
      )}
    </motion.div>
  )
}

// ── JahresvergleichWidget ─────────────────────────────────────────────────────

function vergleichDelta(neu, alt) {
  if (!alt || alt === 0) return null
  return Math.round(((neu - alt) / Math.abs(alt)) * 100)
}

function DeltaBadge({ wert }) {
  if (wert === null) return null
  const pos = wert >= 0
  return (
    <span style={{
      fontSize: '0.625rem', fontWeight: 700,
      color: pos ? 'var(--color-tertiary)' : 'var(--color-error)',
      background: pos ? 'rgba(168,199,160,0.12)' : 'rgba(255,138,128,0.1)',
      padding: '0.125rem 0.375rem',
      borderRadius: 'var(--radius-pill)',
      marginLeft: '0.375rem'
    }}>
      {pos ? '+' : ''}{wert}%
    </span>
  )
}

function JahresvergleichWidget({ delay = 0, onNavigate }) {
  const [daten, setDaten] = useState(null)

  useEffect(() => {
    window.steuerpilot.vergleich.laden().then(ergebnisse => {
      const mitDaten = ergebnisse.filter(e => e.einnahmen > 0 || e.ausgaben > 0)
      if (mitDaten.length >= 2) setDaten(mitDaten)
    }).catch(() => {})
  }, [])

  if (!daten) return null

  const aktuell = daten[daten.length - 1]
  const vorjahr = daten[daten.length - 2]

  const reihen = [
    { label: 'Einnahmen', aktuellWert: aktuell.einnahmen, vorjahrWert: vorjahr.einnahmen },
    { label: 'Werbungskosten', aktuellWert: aktuell.ausgaben, vorjahrWert: vorjahr.ausgaben },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springGentle, delay }}
      onClick={onNavigate ? () => onNavigate('jahresvergleich') : undefined}
      style={{
        background: 'var(--color-surface-container)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        cursor: onNavigate ? 'pointer' : 'default'
      }}
      onMouseEnter={onNavigate ? e => { e.currentTarget.style.filter = 'brightness(1.06)' } : undefined}
      onMouseLeave={onNavigate ? e => { e.currentTarget.style.filter = '' } : undefined}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <div>
          <div style={{
            fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--color-on-surface-variant)'
          }}>Jahresvergleich</div>
          <div style={{
            fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-on-surface)', marginTop: '0.125rem'
          }}>{vorjahr.jahr} → {aktuell.jahr}</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-on-surface-variant)' }}>
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {reihen.map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{r.label}</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                {formatEuro(r.aktuellWert)}
              </span>
              <DeltaBadge wert={vergleichDelta(r.aktuellWert, r.vorjahrWert)} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function DashboardScreen({ nutzer, activeJahr, onNavigate }) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeJahr?.id) {
      loadMetrics(activeJahr.id)
    }
  }, [activeJahr?.id])

  async function loadMetrics(jahrId) {
    setLoading(true)
    const db = window.steuerpilot.db
    try {
      const [einnahmen, ausgaben, belege, nutzerFull] = await Promise.all([
        db.get('SELECT COALESCE(SUM(betrag), 0) as total FROM einnahmen WHERE steuerjahr_id = ?', [jahrId]),
        db.get('SELECT COALESCE(SUM(betrag), 0) as total FROM ausgaben WHERE steuerjahr_id = ? AND abzugsfaehig = 1', [jahrId]),
        db.get('SELECT COUNT(*) as total FROM belege WHERE steuerjahr_id = ?', [jahrId]),
        db.get('SELECT steuer_id FROM nutzer LIMIT 1', [])
      ])
      setMetrics({
        einnahmen: einnahmen?.total ?? 0,
        ausgaben: ausgaben?.total ?? 0,
        belege: belege?.total ?? 0,
        lohnsteuer: null, // kommt aus Wizard (Phase 4)
        steuer_id: nutzerFull?.steuer_id ?? null
      })
    } catch (err) {
      console.error('Dashboard loadMetrics:', err)
      setMetrics({ einnahmen: 0, ausgaben: 0, belege: 0, lohnsteuer: null })
    } finally {
      setLoading(false)
    }
  }

  const nutzerMitSteuer = nutzer ? { ...nutzer, steuer_id: metrics?.steuer_id } : null

  if (loading) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem'
        }}>
          Laden…
        </div>
      </div>
    )
  }

  return (
    <div style={{
      padding: '2.5rem',
      maxWidth: 1100,
      margin: '0 auto'
    }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.05 }}
        style={{
          marginBottom: '2.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{
            fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--color-secondary)',
            marginBottom: '0.375rem'
          }}>
            {getGreeting()}
          </div>
          <h1 style={{
            fontSize: '2rem', fontWeight: 800,
            letterSpacing: '-0.025em',
            color: 'var(--color-on-surface)',
            lineHeight: 1.15, marginBottom: '0.375rem'
          }}>
            {nutzer?.vorname
              ? `${nutzer.vorname}, hier ist deine Übersicht`
              : 'Deine Übersicht'}
          </h1>
          <p style={{
            color: 'var(--color-on-surface-variant)',
            fontSize: '0.875rem'
          }}>
            Steuerjahr {activeJahr?.jahr ?? '—'} · {
              metrics?.einnahmen > 0 || metrics?.ausgaben > 0
                ? 'Daten werden laufend aktualisiert'
                : 'Noch keine Daten erfasst — starte mit der Dateneingabe'
            }
          </p>
        </div>

        <div style={{ flexShrink: 0, paddingTop: '1.5rem' }}>
          <ExportButton nutzer={nutzerMitSteuer} activeJahr={activeJahr} />
        </div>
      </motion.div>

      {/* Metriken — 3 Spalten */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <MetricCard
          title="Einnahmen"
          value={formatEuro(metrics?.einnahmen)}
          subtitle={metrics?.einnahmen > 0 ? `Steuerjahr ${activeJahr?.jahr}` : 'Noch nichts erfasst'}
          accent
          empty={!metrics?.einnahmen}
          delay={0.1}
          onClick={onNavigate ? () => onNavigate('wizard') : undefined}
        />
        <MetricCard
          title="Werbungskosten"
          value={formatEuro(metrics?.ausgaben)}
          subtitle={metrics?.ausgaben > 0
            ? `Steuerjahr ${activeJahr?.jahr}`
            : 'Fahrtkosten, Homeoffice, Arbeitsmittel'
          }
          empty={!metrics?.ausgaben}
          delay={0.13}
          onClick={onNavigate ? () => onNavigate('wizard') : undefined}
        />
        <MetricCard
          title="Belege"
          value={`${metrics?.belege ?? 0} Dokument${(metrics?.belege ?? 0) !== 1 ? 'e' : ''}`}
          subtitle={metrics?.belege > 0 ? 'Erfasst und gespeichert' : 'Noch keine Belege hochgeladen'}
          empty={!metrics?.belege}
          delay={0.16}
          onClick={onNavigate ? () => onNavigate('belege') : undefined}
        />
      </div>

      {/* Schätzung — volle Breite */}
      <div style={{ marginBottom: '1rem' }}>
        <EstimateCard
          metrics={metrics}
          activeJahr={activeJahr}
          delay={0.18}
        />
      </div>

      {/* Jahresvergleich Widget — nur wenn Vorjahresdaten existieren */}
      <div style={{ marginBottom: '1rem' }}>
        <JahresvergleichWidget delay={0.21} onNavigate={onNavigate} />
      </div>

      {/* Untere Reihe: Fristen + Checklist */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem'
      }}>
        <DeadlineCard jahr={activeJahr} delay={0.22} />
        <ChecklistCard nutzer={nutzerMitSteuer} metrics={metrics} delay={0.25} onNavigate={onNavigate} />
      </div>

    </div>
  )
}
