import { motion } from 'framer-motion'
import { springGentle } from '../../../theme/tokens.js'
import WizardField, { Input } from '../WizardField.jsx'

function formatEuro(val) {
  const n = parseFloat(String(val).replace(',', '.')) || 0
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

// ── Angestellten-Felder ───────────────────────────────────────────────────────

function AngestellterFelder({ daten, onChange }) {
  return (
    <>
      <WizardField
        label="Bruttogehalt"
        erklarung="Dein gesamtes Jahresgehalt vor Abzug von Steuern und Sozialversicherungsbeiträgen. Du findest diesen Betrag in Zeile 3 deiner Lohnsteuerbescheinigung, die du von deinem Arbeitgeber erhältst."
        elster="Anlage N, Zeile 6"
      >
        <Input
          value={daten.bruttogehalt}
          onChange={v => onChange({ bruttogehalt: v })}
          suffix="€"
          placeholder="z.B. 45000"
        />
      </WizardField>

      <WizardField
        label="Einbehaltene Lohnsteuer"
        erklarung="Die Lohnsteuer, die dein Arbeitgeber direkt ans Finanzamt überwiesen hat. Zu finden in Zeile 4 deiner Lohnsteuerbescheinigung. Diese Zahl ist wichtig für die Berechnung deiner Rückerstattung."
        elster="Anlage N, Zeile 38"
      >
        <Input
          value={daten.lohnsteuer}
          onChange={v => onChange({ lohnsteuer: v })}
          suffix="€"
          placeholder="z.B. 8500"
        />
      </WizardField>

      <WizardField
        label="Solidaritätszuschlag"
        erklarung="Seit 2021 zahlen die meisten Arbeitnehmer keinen Soli mehr. Falls du betroffen warst (hohes Einkommen oder Kirchensteuer-Abrechnung), findest du den Betrag in Zeile 5 deiner Lohnsteuerbescheinigung. Sonst einfach 0 lassen."
        elster="Anlage N, Zeile 40"
        hinweis="Seit 2021 entfällt der Soli für ~90 % der Steuerpflichtigen. Nur eintragen wenn auf deiner Lohnsteuerbescheinigung ein Betrag steht."
      >
        <Input
          value={daten.soli}
          onChange={v => onChange({ soli: v })}
          suffix="€"
          placeholder="0"
        />
      </WizardField>

      <WizardField
        label="Kirchensteuer"
        erklarung="Nur relevant wenn du Mitglied einer steuererhebenden Religionsgemeinschaft bist. Den Betrag findest du in Zeile 6 oder 7 deiner Lohnsteuerbescheinigung. Nicht Mitglied? Einfach 0 lassen."
        elster="Anlage N, Zeile 41"
      >
        <Input
          value={daten.kirchensteuer}
          onChange={v => onChange({ kirchensteuer: v })}
          suffix="€"
          placeholder="0"
        />
      </WizardField>

      {/* Live-Vorschau */}
      {(parseFloat(daten.bruttogehalt) > 0 || parseFloat(daten.lohnsteuer) > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springGentle}
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(173, 200, 245, 0.06)',
            border: '1px solid rgba(173, 200, 245, 0.15)',
            borderRadius: '0.75rem',
            marginTop: '0.5rem'
          }}
        >
          <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>
            Vorschau
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            {parseFloat(daten.bruttogehalt) > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Bruttolohn</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{formatEuro(daten.bruttogehalt)}</div>
              </div>
            )}
            {parseFloat(daten.lohnsteuer) > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Gezahlte Lohnsteuer</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>{formatEuro(daten.lohnsteuer)}</div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </>
  )
}

// ── Freelancer / Selbstständige ───────────────────────────────────────────────

function FreelancerFelder({ daten, onChange, nutzertyp }) {
  const istSelbstaendig = nutzertyp === 'selbstaendiger'
  return (
    <>
      <WizardField
        label="Honorareinnahmen gesamt"
        erklarung={
          istSelbstaendig
            ? 'Deine gesamten Betriebseinnahmen aus selbstständiger Tätigkeit im Steuerjahr — also alle Rechnungsbeträge die du vereinnahmt hast, ohne Umsatzsteuer (Netto). Bei Kleinunternehmern (§19 UStG) den Bruttobetrag eintragen.'
            : 'Deine gesamten Einnahmen aus freiberuflicher Tätigkeit — also alle Honorare und Rechnungsbeträge die du erhalten hast, ohne Umsatzsteuer (Netto). Bei Kleinunternehmern den Bruttobetrag eintragen.'
        }
        elster="Anlage EÜR, Zeile 14"
      >
        <Input
          value={daten.honorar}
          onChange={v => onChange({ honorar: v })}
          suffix="€"
          placeholder="z.B. 60000"
        />
      </WizardField>

      <WizardField
        label="Einbehaltene Lohnsteuer"
        erklarung="Hast du neben deiner selbstständigen Tätigkeit auch ein Anstellungsverhältnis gehabt? Dann trägst du hier die vom Arbeitgeber einbehaltene Lohnsteuer ein. Nur angestellte Nebentätigkeit. Rein selbstständig? 0 lassen."
        elster="Anlage N, Zeile 38"
        hinweis="Nur ausfüllen wenn du zusätzlich angestellt warst. Rein selbstständige Tätigkeit hat keine einbehaltene Lohnsteuer."
      >
        <Input
          value={daten.lohnsteuer}
          onChange={v => onChange({ lohnsteuer: v })}
          suffix="€"
          placeholder="0"
        />
      </WizardField>

      {parseFloat(daten.honorar) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springGentle}
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(173, 200, 245, 0.06)',
            border: '1px solid rgba(173, 200, 245, 0.15)',
            borderRadius: '0.75rem',
            marginTop: '0.5rem'
          }}
        >
          <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>
            Vorschau
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Honorareinnahmen</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{formatEuro(daten.honorar)}</div>
          </div>
        </motion.div>
      )}
    </>
  )
}

// ── SchrittLohn ───────────────────────────────────────────────────────────────

export default function SchrittLohn({ daten, onChange, nutzertyp }) {
  const istAngestellter = nutzertyp === 'angestellter'

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
          {istAngestellter ? 'Lohn & Gehalt' : 'Einnahmen'}
        </h2>
        <p style={{
          fontSize: '0.9375rem',
          color: 'var(--color-on-surface-variant)',
          margin: 0,
          lineHeight: 1.6
        }}>
          {istAngestellter
            ? 'Gib die Daten aus deiner Lohnsteuerbescheinigung ein. Du findest sie im Brief deines Arbeitgebers, meistens im Januar oder Februar des Folgejahres.'
            : 'Trag hier deine Einnahmen aus dem Steuerjahr ein. Die genauen Beträge findest du in deiner Buchführung oder auf deinen Rechnungen.'
          }
        </p>
      </div>

      {istAngestellter
        ? <AngestellterFelder daten={daten} onChange={onChange} />
        : <FreelancerFelder daten={daten} onChange={onChange} nutzertyp={nutzertyp} />
      }
    </motion.div>
  )
}
