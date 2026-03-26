import { motion, AnimatePresence } from 'framer-motion'
import { springGentle, colors } from '../../../theme/tokens.js'
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

function BetriebsausgabenListe({ items, onChange }) {
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
    <div>
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 36px',
              gap: '0.625rem',
              marginBottom: '0.375rem'
            }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Beschreibung</span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Betrag</span>
              <div />
            </div>
            <AnimatePresence>
              {items.map(item => (
                <motion.div
                  key={item.key}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={springGentle}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 36px',
                    gap: '0.625rem',
                    alignItems: 'center',
                    marginBottom: '0.625rem'
                  }}
                >
                  <Input
                    value={item.beschreibung}
                    onChange={v => updateItem(item.key, 'beschreibung', v)}
                    placeholder="z.B. Software-Abo, Büromaterial"
                  />
                  <Input
                    value={item.betrag}
                    onChange={v => updateItem(item.key, 'betrag', v)}
                    suffix="€"
                    placeholder="0"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeItem(item.key)}
                    style={{
                      width: 36, height: 40,
                      background: 'transparent',
                      border: '1px solid var(--color-outline-variant)',
                      borderRadius: '0.625rem',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--color-on-surface-variant)',
                      transition: 'border-color 0.15s, color 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.error; e.currentTarget.style.color = colors.error }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.outline_variant; e.currentTarget.style.color = colors.on_surface_variant }}
                  >
                    <IconTrash />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={addItem}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.625rem 1rem',
          background: 'transparent',
          border: '1.5px dashed var(--color-outline-variant)',
          borderRadius: '0.75rem',
          cursor: 'pointer',
          color: 'var(--color-on-surface-variant)',
          fontFamily: "'Manrope', sans-serif",
          fontSize: '0.875rem', fontWeight: 500,
          width: '100%', justifyContent: 'center',
          marginTop: items.length > 0 ? '0.25rem' : 0,
          transition: 'border-color 0.15s, color 0.15s'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.color = colors.primary }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = colors.outline_variant; e.currentTarget.style.color = colors.on_surface_variant }}
      >
        <IconPlus />
        Betriebsausgabe hinzufügen
      </motion.button>
    </div>
  )
}

export default function SchrittSonderausgaben({ daten, onChange, betriebsausgaben, onChangeBetriebsausgaben, nutzertyp }) {
  const istSelbstaendig = nutzertyp === 'selbstaendiger'
  const istFreelancer = nutzertyp === 'freelancer'
  const zeigtBetriebsausgaben = istSelbstaendig || istFreelancer

  const sonderausgabenSumme =
    (parseFloat(daten.krankenversicherung) || 0) +
    (parseFloat(daten.altersvorsorge) || 0) +
    (parseFloat(daten.spenden) || 0)

  const betriebsausgabenSumme = (betriebsausgaben ?? []).reduce(
    (sum, i) => sum + (parseFloat(i.betrag) || 0), 0
  )

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
          Sonderausgaben{zeigtBetriebsausgaben ? ' & Betriebsausgaben' : ''}
        </h2>
        <p style={{
          fontSize: '0.9375rem',
          color: 'var(--color-on-surface-variant)',
          margin: 0,
          lineHeight: 1.6
        }}>
          Sonderausgaben sind private Ausgaben die steuerlich absetzbar sind — hauptsächlich Versicherungen und Vorsorge.
          {zeigtBetriebsausgaben && ' Dazu kommen Betriebsausgaben aus deiner selbstständigen Tätigkeit.'}
        </p>
      </div>

      {/* ── Sonderausgaben ──────────────────────────────────────────────────── */}

      <div style={{
        marginBottom: '1.5rem',
        padding: '1.25rem',
        background: 'var(--color-surface-container)',
        borderRadius: '0.75rem'
      }}>
        <div style={{
          fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--color-on-surface-variant)',
          marginBottom: '1.25rem'
        }}>
          Sonderausgaben
        </div>

        <WizardField
          label="Krankenversicherungsbeiträge"
          erklarung="Deine eigenen Beiträge zur gesetzlichen oder privaten Krankenversicherung — nicht der Arbeitgeberanteil, nur was du selbst gezahlt hast. Bei GKV: Eigenanteil aus der Abrechnung. Bei PKV: alle Prämien für den Basisschutz."
          elster="Anlage Vorsorgeaufwand, Zeile 12"
          hinweis="Bei gesetzlicher KV: Eigenanteil ca. 7,3 % des Bruttogehalts. Bei privater KV: Beiträge aus deiner Jahresabrechnung. Nicht der Arbeitgeberanteil."
        >
          <Input
            value={daten.krankenversicherung}
            onChange={v => onChange({ krankenversicherung: v })}
            suffix="€"
            placeholder="z.B. 3600"
          />
        </WizardField>

        <WizardField
          label="Altersvorsorge / Rentenbeiträge"
          erklarung="Beiträge zur gesetzlichen Rentenversicherung (Pflichtbeiträge), Riester-Rente, Rürup-Rente oder berufsständischen Versorgungswerken. Bei Angestellten: nur der eigene Anteil (Arbeitgeber zahlt die Hälfte)."
          elster="Anlage Vorsorgeaufwand, Zeile 4"
        >
          <Input
            value={daten.altersvorsorge}
            onChange={v => onChange({ altersvorsorge: v })}
            suffix="€"
            placeholder="z.B. 4000"
          />
        </WizardField>

        <WizardField
          label="Spenden"
          erklarung="Geldspenden an gemeinnützige Organisationen, Kirchen oder politische Parteien. Du brauchst eine Spendenquittung (Zuwendungsbestätigung). Bis 300 € pro Spende reicht auch ein Kontoauszug."
          elster="Anlage Sonderausgaben, Zeile 5"
          hinweis="Wichtig: Nur Spenden mit Spendenquittung sind absetzbar. Sammelkörbe, Sachspenden ohne Quittung oder Spenden an Privatpersonen zählen nicht."
        >
          <Input
            value={daten.spenden}
            onChange={v => onChange({ spenden: v })}
            suffix="€"
            placeholder="0"
          />
        </WizardField>

        {sonderausgabenSumme > 0 && (
          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--color-outline-variant)', marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>Summe Sonderausgaben</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-tertiary)' }}>{formatEuro(sonderausgabenSumme)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Betriebsausgaben (Freelancer / Selbstständige) ───────────────────── */}

      <AnimatePresence>
        {zeigtBetriebsausgaben && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={springGentle}
            style={{
              padding: '1.25rem',
              background: 'var(--color-surface-container)',
              borderRadius: '0.75rem'
            }}
          >
            <div style={{
              fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--color-secondary)',
              marginBottom: '0.625rem'
            }}>
              Betriebsausgaben
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0 0 1.25rem', lineHeight: 1.55 }}>
              Ausgaben die direkt mit deiner selbstständigen Tätigkeit zusammenhängen: Software-Abos,
              Büromaterial, Berufsverbandsbeiträge, Fachliteratur, Geschäftsreisen, Telefon (Berufsanteil) usw.
              Alles was für deinen Betrieb notwendig war.
            </p>

            <WizardField
              label="Betriebsausgaben einzeln erfassen"
              erklarung="Trag jede Ausgabe separat ein. Das Finanzamt kann Einzelnachweise verlangen — heb alle Belege/Rechnungen auf. Privatanteile (z.B. bei gemischter Nutzung) müssen abgezogen werden."
              elster="Anlage EÜR, Zeile 21–51 (je nach Art der Ausgabe)"
              hinweis="Gemischt genutzte Gegenstände (z.B. Laptop 70 % beruflich) nur anteilig eintragen. Erstattungen von Kunden oder Förderungen müssen abgezogen werden."
            >
              <BetriebsausgabenListe
                items={betriebsausgaben ?? []}
                onChange={onChangeBetriebsausgaben}
              />
            </WizardField>

            {betriebsausgabenSumme > 0 && (
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--color-outline-variant)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>Summe Betriebsausgaben</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-tertiary)' }}>{formatEuro(betriebsausgabenSumme)}</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
