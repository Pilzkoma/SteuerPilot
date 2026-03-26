import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

const KATEGORIE_FARBEN = {
  fahrtkosten: '#4fc3f7',
  homeoffice: '#aed581',
  arbeitsmittel: '#ffb74d',
  krankenversicherung: '#ce93d8',
  altersvorsorge: '#80cbc4',
  spende: '#ef9a9a',
  sonstige: '#90a4ae'
}

const KATEGORIE_LABEL = {
  fahrtkosten: 'Fahrtkosten',
  homeoffice: 'Homeoffice',
  arbeitsmittel: 'Arbeitsmittel',
  krankenversicherung: 'Krankenvers.',
  altersvorsorge: 'Altersvorsorge',
  spende: 'Spenden',
  sonstige: 'Sonstige'
}

function buildMonatlicheDaten(transaktionen) {
  const byMonth = {}
  for (const t of transaktionen) {
    const monat = t.datum?.slice(5, 7) // "YYYY-MM-DD" → "MM"
    if (!monat) continue
    const idx = parseInt(monat, 10) - 1
    if (!byMonth[idx]) byMonth[idx] = { monat: MONATE[idx], einnahmen: 0, ausgaben: 0 }
    if (t.typ === 'einnahme') byMonth[idx].einnahmen += t.betrag
    else byMonth[idx].ausgaben += t.betrag
  }
  return Object.values(byMonth).sort((a, b) => MONATE.indexOf(a.monat) - MONATE.indexOf(b.monat))
}

function buildKategorieDaten(transaktionen) {
  const byKat = {}
  for (const t of transaktionen) {
    if (t.typ !== 'ausgabe' || !t.abzugsfaehig) continue
    if (!byKat[t.kategorie]) byKat[t.kategorie] = 0
    byKat[t.kategorie] += t.betrag
  }
  return Object.entries(byKat)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, label: KATEGORIE_LABEL[name] ?? name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

const tooltipStyle = {
  background: 'var(--color-surface-container-high)',
  border: '1px solid var(--color-outline-variant)',
  borderRadius: 8,
  color: 'var(--color-on-surface)',
  fontSize: '0.75rem',
  fontFamily: 'var(--font-family)'
}

export default function UmsatzCharts({ transaktionen }) {
  const monatsDaten = buildMonatlicheDaten(transaktionen)
  const kategorieDaten = buildKategorieDaten(transaktionen)

  if (monatsDaten.length === 0) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: kategorieDaten.length > 0 ? '1fr 340px' : '1fr', gap: '1.25rem', marginBottom: '0.5rem' }}>
      {/* Monatliche Übersicht */}
      <div style={{
        background: 'var(--color-surface-container)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem',
        border: '1px solid var(--color-outline-variant)'
      }}>
        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
          Monatliche Übersicht
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monatsDaten} barCategoryGap="30%">
            <XAxis
              dataKey="monat"
              tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `${v}€`}
              width={56}
            />
            <Tooltip
              formatter={(value, name) => [
                value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }),
                name === 'einnahmen' ? 'Einnahmen' : 'Ausgaben'
              ]}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="einnahmen" fill="#1E3A5F" radius={[4, 4, 0, 0]} name="einnahmen" />
            <Bar dataKey="ausgaben" fill="#F5A623" radius={[4, 4, 0, 0]} name="ausgaben" />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem' }}>
          {[{ color: '#1E3A5F', label: 'Einnahmen' }, { color: '#F5A623', label: 'Ausgaben' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Absetzbare Ausgaben nach Kategorie */}
      {kategorieDaten.length > 0 && (
        <div style={{
          background: 'var(--color-surface-container)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.25rem',
          border: '1px solid var(--color-outline-variant)'
        }}>
          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
            Absetzbare Ausgaben
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={kategorieDaten}
                dataKey="value"
                nameKey="label"
                cx="50%" cy="50%"
                innerRadius={42} outerRadius={64}
                paddingAngle={2}
              >
                {kategorieDaten.map((entry) => (
                  <Cell key={entry.name} fill={KATEGORIE_FARBEN[entry.name] ?? '#90a4ae'} />
                ))}
              </Pie>
              <Tooltip
                formatter={v => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.5rem' }}>
            {kategorieDaten.map(k => (
              <div key={k.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: KATEGORIE_FARBEN[k.name], flexShrink: 0 }} />
                  <span style={{ color: 'var(--color-on-surface-variant)' }}>{k.label}</span>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
                  {k.value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
