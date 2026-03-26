import { motion } from 'framer-motion'
import { springGentle, colors } from '../../../theme/tokens.js'
import {
  schaetzeRueckerstattung,
  berechneFahrtkosten,
  berechneHomeofficePauschale
} from '../../../engine/steuerberechnung.js'

function formatEuro(val) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val ?? 0)
}

function SummenZeile({ label, betrag, highlight, muted, elster }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '1rem',
      padding: '0.625rem 0',
      borderBottom: '1px solid var(--color-outline-variant)'
    }}>
      <div>
        <div style={{
          fontSize: '0.875rem',
          fontWeight: 500,
          color: muted ? 'var(--color-on-surface-variant)' : 'var(--color-on-surface)'
        }}>
          {label}
        </div>
        {elster && (
          <div style={{
            fontSize: '0.6875rem',
            color: colors.primary,
            opacity: 0.7,
            marginTop: '0.125rem'
          }}>
            {elster}
          </div>
        )}
      </div>
      <span style={{
        fontSize: '0.9375rem',
        fontWeight: 700,
        color: highlight ? colors.tertiary : muted ? 'var(--color-on-surface-variant)' : 'var(--color-on-surface)',
        flexShrink: 0
      }}>
        {formatEuro(betrag)}
      </span>
    </div>
  )
}

function Abschnitt({ titel, children, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle}
      style={{
        background: 'var(--color-surface-container)',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        marginBottom: '1rem'
      }}
    >
      <div style={{
        padding: '0.75rem 1.25rem',
        background: 'var(--color-surface-container-high)',
        borderBottom: '1px solid var(--color-outline-variant)'
      }}>
        <span style={{
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: color ?? 'var(--color-on-surface-variant)'
        }}>
          {titel}
        </span>
      </div>
      <div style={{ padding: '0 1.25rem' }}>
        {children}
      </div>
    </motion.div>
  )
}

export default function SchrittZusammenfassung({ alleDaten, nutzertyp, activeJahr, isSaving }) {
  const { lohn, fahrtkosten, homeoffice, arbeitsmittel, sonderausgaben, betriebsausgaben } = alleDaten
  const jahr = activeJahr?.jahr ?? 2025
  const istAngestellter = nutzertyp === 'angestellter'
  const istFreelancer = nutzertyp === 'freelancer' || nutzertyp === 'selbstaendiger'

  // ── Einnahmen ───────────────────────────────────────────────────────────────
  const bruttogehalt = parseFloat(lohn.bruttogehalt) || 0
  const einbehalteneLoHSt = parseFloat(lohn.lohnsteuer) || 0
  const honorar = parseFloat(lohn.honorar) || 0
  const haupteinnahme = istAngestellter ? bruttogehalt : honorar

  // ── Werbungskosten ──────────────────────────────────────────────────────────
  const kmEinfach = parseFloat(fahrtkosten.km) || 0
  const arbeitstage = parseInt(fahrtkosten.arbeitstage) || 0
  const fahrtkostenBetrag = !fahrtkosten.oeffentlich && kmEinfach > 0 && arbeitstage > 0
    ? berechneFahrtkosten(kmEinfach, arbeitstage, jahr)
    : fahrtkosten.oeffentlich
      ? parseFloat(fahrtkosten.oeffentlichKosten) || 0
      : 0

  const homeofficeTage = parseInt(homeoffice.tage) || 0
  const homeofficeBerechnet = homeofficeTage > 0 ? berechneHomeofficePauschale(homeofficeTage, jahr) : 0

  const arbeitsmittelSumme = (arbeitsmittel ?? []).reduce(
    (s, i) => s + (parseFloat(i.betrag) || 0), 0
  )

  const gesamtWerbungskosten = fahrtkostenBetrag + homeofficeBerechnet + arbeitsmittelSumme

  // ── Sonderausgaben ──────────────────────────────────────────────────────────
  const kranken = parseFloat(sonderausgaben.krankenversicherung) || 0
  const alters = parseFloat(sonderausgaben.altersvorsorge) || 0
  const spenden = parseFloat(sonderausgaben.spenden) || 0
  const sonderausgabenGesamt = kranken + alters + spenden

  // ── Betriebsausgaben ────────────────────────────────────────────────────────
  const betriebsausgabenSumme = (betriebsausgaben ?? []).reduce(
    (s, i) => s + (parseFloat(i.betrag) || 0), 0
  )

  // ── Schätzung ───────────────────────────────────────────────────────────────
  let schätzung = null
  const hatGenugDaten = (bruttogehalt > 0 || honorar > 0) && einbehalteneLoHSt > 0

  if (hatGenugDaten) {
    try {
      schätzung = schaetzeRueckerstattung({
        bruttoJahreslohn: haupteinnahme,
        einbehalteneLoHSt: einbehalteneLoHSt,
        werbungskosten: gesamtWerbungskosten,
        sonderausgaben: sonderausgabenGesamt,
        jahr
      })
    } catch {}
  }

  const istRueckerstattung = (schätzung?.geschaetzteRueckerstattung ?? 0) > 0
  const schätzungBetrag = schätzung ? Math.abs(schätzung.geschaetzteRueckerstattung) : null

  const hatEingaben = haupteinnahme > 0

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
          Zusammenfassung
        </h2>
        <p style={{
          fontSize: '0.9375rem',
          color: 'var(--color-on-surface-variant)',
          margin: 0,
          lineHeight: 1.6
        }}>
          Hier siehst du alles was du eingegeben hast auf einen Blick.
          Prüfe die Zahlen und speichere dann deine Steuerdaten.
        </p>
      </div>

      {/* ── Einnahmen ────────────────────────────────────────────────────────── */}
      {hatEingaben && (
        <Abschnitt titel="Einnahmen" color="var(--color-on-surface-variant)">
          {istAngestellter ? (
            <>
              {bruttogehalt > 0 && <SummenZeile label="Bruttogehalt" betrag={bruttogehalt} elster="Anlage N, Zeile 6" />}
              {einbehalteneLoHSt > 0 && <SummenZeile label="Einbehaltene Lohnsteuer" betrag={einbehalteneLoHSt} elster="Anlage N, Zeile 38" />}
              {parseFloat(lohn.soli) > 0 && <SummenZeile label="Solidaritätszuschlag" betrag={parseFloat(lohn.soli)} muted elster="Anlage N, Zeile 40" />}
              {parseFloat(lohn.kirchensteuer) > 0 && <SummenZeile label="Kirchensteuer" betrag={parseFloat(lohn.kirchensteuer)} muted elster="Anlage N, Zeile 41" />}
            </>
          ) : (
            <>
              {honorar > 0 && <SummenZeile label="Honorareinnahmen" betrag={honorar} elster="Anlage EÜR, Zeile 14" />}
              {einbehalteneLoHSt > 0 && <SummenZeile label="Einbehaltene Lohnsteuer (Nebentätigkeit)" betrag={einbehalteneLoHSt} elster="Anlage N, Zeile 38" />}
            </>
          )}
        </Abschnitt>
      )}

      {/* ── Werbungskosten ───────────────────────────────────────────────────── */}
      {gesamtWerbungskosten > 0 && (
        <Abschnitt titel="Werbungskosten" color="var(--color-tertiary)">
          {fahrtkostenBetrag > 0 && (
            <SummenZeile
              label={fahrtkosten.oeffentlich ? 'Fahrtkosten ÖPNV' : `Fahrtkosten (${kmEinfach} km × ${arbeitstage} Tage)`}
              betrag={fahrtkostenBetrag}
              highlight
              elster="Anlage N, Zeile 31–33"
            />
          )}
          {homeofficeBerechnet > 0 && (
            <SummenZeile
              label={`Homeoffice-Pauschale (${homeofficeTage} Tage)`}
              betrag={homeofficeBerechnet}
              highlight
              elster="Anlage N, Zeile 44"
            />
          )}
          {arbeitsmittelSumme > 0 && (
            <SummenZeile
              label={`Arbeitsmittel (${(arbeitsmittel ?? []).filter(i => parseFloat(i.betrag) > 0).length} Posten)`}
              betrag={arbeitsmittelSumme}
              highlight
              elster="Anlage N, Zeile 44"
            />
          )}
          <div style={{ padding: '0.75rem 0 0.375rem', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>Gesamt Werbungskosten</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-tertiary)' }}>{formatEuro(gesamtWerbungskosten)}</span>
          </div>
        </Abschnitt>
      )}

      {/* ── Sonderausgaben ───────────────────────────────────────────────────── */}
      {sonderausgabenGesamt > 0 && (
        <Abschnitt titel="Sonderausgaben" color="var(--color-primary)">
          {kranken > 0 && <SummenZeile label="Krankenversicherung" betrag={kranken} elster="Anlage Vorsorgeaufwand, Zeile 12" />}
          {alters > 0 && <SummenZeile label="Altersvorsorge / Rentenbeiträge" betrag={alters} elster="Anlage Vorsorgeaufwand, Zeile 4" />}
          {spenden > 0 && <SummenZeile label="Spenden" betrag={spenden} elster="Anlage Sonderausgaben, Zeile 5" />}
          <div style={{ padding: '0.75rem 0 0.375rem', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>Gesamt Sonderausgaben</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: colors.primary }}>{formatEuro(sonderausgabenGesamt)}</span>
          </div>
        </Abschnitt>
      )}

      {/* ── Betriebsausgaben ─────────────────────────────────────────────────── */}
      {betriebsausgabenSumme > 0 && (
        <Abschnitt titel="Betriebsausgaben" color="var(--color-secondary)">
          {(betriebsausgaben ?? []).filter(i => parseFloat(i.betrag) > 0).map(item => (
            <SummenZeile
              key={item.key}
              label={item.beschreibung || 'Betriebsausgabe'}
              betrag={parseFloat(item.betrag)}
              elster="Anlage EÜR"
            />
          ))}
          <div style={{ padding: '0.75rem 0 0.375rem', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>Gesamt Betriebsausgaben</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: colors.secondary }}>{formatEuro(betriebsausgabenSumme)}</span>
          </div>
        </Abschnitt>
      )}

      {/* ── Schätzung ────────────────────────────────────────────────────────── */}
      {schätzungBetrag !== null && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.1 }}
          style={{
            padding: '1.25rem',
            background: istRueckerstattung
              ? 'linear-gradient(135deg, rgba(168,199,160,0.12) 0%, rgba(168,199,160,0.05) 100%)'
              : 'linear-gradient(135deg, rgba(255,138,128,0.1) 0%, rgba(255,138,128,0.04) 100%)',
            border: istRueckerstattung
              ? '1px solid rgba(168,199,160,0.25)'
              : '1px solid rgba(255,138,128,0.2)',
            borderRadius: '0.75rem',
            marginBottom: '1rem'
          }}
        >
          <div style={{
            fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: istRueckerstattung ? colors.tertiary : colors.error,
            marginBottom: '0.625rem'
          }}>
            Geschätzte {istRueckerstattung ? 'Rückerstattung' : 'Nachzahlung'}
          </div>
          <div style={{
            fontSize: '2rem', fontWeight: 800,
            color: istRueckerstattung ? colors.tertiary : colors.error,
            letterSpacing: '-0.03em',
            marginBottom: '0.5rem'
          }}>
            {formatEuro(schätzungBetrag)}
          </div>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--color-on-surface-variant)',
            margin: 0,
            lineHeight: 1.55
          }}>
            {schätzung.hinweis}
          </p>
        </motion.div>
      )}

      {/* Kein Schätzung möglich */}
      {!hatGenugDaten && hatEingaben && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'var(--color-surface-container)',
          borderRadius: '0.75rem',
          marginBottom: '1rem'
        }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.55 }}>
            Für eine Schätzung wird die einbehaltene Lohnsteuer benötigt.
            Trag sie in Schritt 1 ein um eine Rückerstattungsschätzung zu sehen.
          </p>
        </div>
      )}

      {!hatEingaben && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'var(--color-surface-container)',
          borderRadius: '0.75rem',
          marginBottom: '1rem'
        }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.55 }}>
            Du hast noch keine Daten eingegeben. Geh zurück und fülle mindestens deine Einnahmen aus.
          </p>
        </div>
      )}

      {isSaving && (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
          Daten werden gespeichert…
        </div>
      )}
    </motion.div>
  )
}
