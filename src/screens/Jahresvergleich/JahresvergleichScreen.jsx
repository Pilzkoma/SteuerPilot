// src/screens/Jahresvergleich/JahresvergleichScreen.jsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { springGentle } from '../../theme/tokens.js'
import { schaetzeRueckerstattung } from '../../engine/steuerberechnung.js'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts'

const JAHR_FARBEN = ['#1E3A5F', '#F5A623', '#4fc3f7', '#aed581', '#ce93d8']

function formatEuro(value) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value ?? 0)
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--color-surface-container-highest)',
      border: '1px solid var(--color-outline-variant)',
      borderRadius: 'var(--radius-lg)',
      padding: '0.75rem 1rem',
      fontSize: '0.8125rem'
    }}>
      <div style={{ fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.fill, marginTop: '0.125rem' }}>
          {p.name}: {formatEuro(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function JahresvergleichScreen() {
  const [daten, setDaten] = useState([])
  const [loading, setLoading] = useState(true)
  const [aktivJahre, setAktivJahre] = useState(new Set())

  useEffect(() => {
    ladeDaten()
  }, [])

  async function ladeDaten() {
    setLoading(true)
    try {
      const ergebnisse = await window.steuerpilot.vergleich.laden()
      const mitRueckerstattung = ergebnisse.map(e => {
        let rueckerstattung = 0
        if (e.einnahmen > 0) {
          try {
            const r = schaetzeRueckerstattung({
              bruttoJahreslohn: e.einnahmen,
              einbehalteneLoHSt: 0,
              werbungskosten: e.ausgaben,
              sonderausgaben: 0,
              jahr: e.jahr
            })
            rueckerstattung = Math.abs(r.geschaetzteRueckerstattung)
          } catch {}
        }
        return { ...e, rueckerstattung }
      })
      setDaten(mitRueckerstattung)
      setAktivJahre(new Set(mitRueckerstattung.map(e => e.jahr)))
    } catch (err) {
      console.error('Jahresvergleich laden:', err)
    } finally {
      setLoading(false)
    }
  }

  function toggleJahr(jahr) {
    setAktivJahre(prev => {
      const next = new Set(prev)
      if (next.has(jahr)) {
        if (next.size > 1) next.delete(jahr)
      } else {
        next.add(jahr)
      }
      return next
    })
  }

  const sichtbareDaten = daten.filter(e => aktivJahre.has(e.jahr))

  const einnahmenData = [{ name: 'Einnahmen', ...Object.fromEntries(sichtbareDaten.map(e => [e.jahr, e.einnahmen])) }]
  const ausgabenData = [{ name: 'Werbungskosten', ...Object.fromEntries(sichtbareDaten.map(e => [e.jahr, e.ausgaben])) }]
  const rueckerstattungData = [{ name: 'Rückerstattung', ...Object.fromEntries(sichtbareDaten.map(e => [e.jahr, e.rueckerstattung])) }]

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>Laden…</div>
      </div>
    )
  }

  if (daten.length < 2) {
    return (
      <div style={{ padding: '2.5rem', maxWidth: 900, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springGentle}
          style={{
            background: 'var(--color-surface-container)',
            borderRadius: 'var(--radius-xl)',
            padding: '3rem', textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>
            Noch keine Vergleichsdaten
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
            Sobald du Daten für mindestens zwei Steuerjahre erfasst hast, erscheint hier der Vergleich.
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: 1000, margin: '0 auto' }}>

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
          Jahresvergleich
        </div>
        <h1 style={{
          fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em',
          color: 'var(--color-on-surface)', lineHeight: 1.15, marginBottom: '0.375rem'
        }}>
          Deine Steuerjahre im Vergleich
        </h1>
      </motion.div>

      {/* Jahr-Pills */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.1 }}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}
      >
        {daten.map((e, i) => (
          <button
            key={e.jahr}
            onClick={() => toggleJahr(e.jahr)}
            style={{
              background: aktivJahre.has(e.jahr) ? JAHR_FARBEN[i % JAHR_FARBEN.length] : 'var(--color-surface-container)',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              padding: '0.375rem 0.875rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              color: aktivJahre.has(e.jahr) ? 'white' : 'var(--color-on-surface-variant)',
              fontSize: '0.875rem', fontWeight: 600,
              transition: 'background 0.15s, color 0.15s'
            }}
          >
            {e.jahr}
          </button>
        ))}
      </motion.div>

      {/* Diagramme */}
      {[
        { titel: 'Einnahmen', data: einnahmenData },
        { titel: 'Werbungskosten', data: ausgabenData },
        { titel: 'Geschätzte Steuerersparnis', data: rueckerstattungData },
      ].map(({ titel, data }, chartIdx) => (
        <motion.div
          key={titel}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.12 + chartIdx * 0.06 }}
          style={{
            background: 'var(--color-surface-container)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            marginBottom: '1rem'
          }}
        >
          <div style={{
            fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--color-on-surface-variant)',
            marginBottom: '1.25rem'
          }}>
            {titel}
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data} barCategoryGap="30%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-container-high)" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis
                tickFormatter={v => `${Math.round(v / 1000)}k`}
                tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {sichtbareDaten.map((e, i) => (
                <Bar
                  key={e.jahr}
                  dataKey={e.jahr}
                  name={String(e.jahr)}
                  fill={JAHR_FARBEN[daten.findIndex(d => d.jahr === e.jahr) % JAHR_FARBEN.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      ))}

      {/* Tabelle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.3 }}
        style={{
          background: 'var(--color-surface-container)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          overflowX: 'auto'
        }}
      >
        <div style={{
          fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--color-on-surface-variant)',
          marginBottom: '1rem'
        }}>
          Übersicht
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
                Kategorie
              </th>
              {sichtbareDaten.map((e, i) => (
                <th key={e.jahr} style={{
                  textAlign: 'right', padding: '0.5rem 0.75rem',
                  color: JAHR_FARBEN[daten.findIndex(d => d.jahr === e.jahr) % JAHR_FARBEN.length],
                  fontWeight: 700
                }}>
                  {e.jahr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Einnahmen', key: 'einnahmen', format: formatEuro },
              { label: 'Werbungskosten', key: 'ausgaben', format: formatEuro },
              { label: 'Belege', key: 'belege', format: v => `${v}` },
              { label: 'Steuerersparnis (Schätzung)', key: 'rueckerstattung', format: formatEuro },
            ].map((reihe, idx) => (
              <tr key={reihe.key} style={{
                background: idx % 2 === 0 ? 'transparent' : 'var(--color-surface-container-high)',
                borderRadius: 'var(--radius-md)'
              }}>
                <td style={{ padding: '0.625rem 0.75rem', color: 'var(--color-on-surface-variant)' }}>
                  {reihe.label}
                </td>
                {sichtbareDaten.map(e => (
                  <td key={e.jahr} style={{
                    padding: '0.625rem 0.75rem', textAlign: 'right',
                    color: 'var(--color-on-surface)', fontWeight: 500
                  }}>
                    {reihe.format(e[reihe.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  )
}
