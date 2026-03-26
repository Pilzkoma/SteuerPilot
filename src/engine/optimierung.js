/**
 * SteuerPilot Engine — Optimierungshinweise
 *
 * Kein Electron. Kein Node. Pure JS — vollständig unit-testbar.
 * Analysiert eingegebene Steuerdaten und gibt Hinweise auf nicht ausgeschöpfte Abzüge.
 */

import { getJahreswerte, berechneFahrtkosten, berechneHomeofficePauschale } from './steuerberechnung.js'

const PRIORITAET_ORDER = { hoch: 0, mittel: 1, niedrig: 2 }
const euroFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

/**
 * Berechnet Optimierungshinweise basierend auf eingegebenen Steuerdaten.
 *
 * @param {object} daten - Wizard-Daten: { lohn, fahrtkosten, homeoffice, arbeitsmittel, sonderausgaben, betriebsausgaben }
 * @param {'angestellter'|'freelancer'|'selbstaendiger'} nutzertyp
 * @param {number} jahr
 * @returns {Array<{id: string, titel: string, beschreibung: string, potenzial: number|null, prioritaet: string, wizardSchritt: string}>}
 */
export function berechneOptimierungshinweise(daten, nutzertyp, jahr = 2025) {
  const { lohn, fahrtkosten, homeoffice, arbeitsmittel, sonderausgaben } = daten
  const werte = getJahreswerte(jahr)
  const istAngestellter = nutzertyp === 'angestellter'
  const hinweise = []

  // ── Homeoffice ───────────────────────────────────────────────────────────────
  const homeofficeTage = parseInt(homeoffice?.tage) || 0
  if (homeofficeTage === 0) {
    hinweise.push({
      id: 'homeoffice_fehlt',
      titel: 'Homeoffice-Pauschale nicht eingetragen',
      beschreibung: `Für jeden Tag im Homeoffice kannst du ${werte.homeofficeTagespauschale} € absetzen — bis zu ${werte.homeofficeMaxTage * werte.homeofficeTagespauschale} € im Jahr. Auch einzelne Tage zählen.`,
      potenzial: werte.homeofficeMaxTage * werte.homeofficeTagespauschale,
      prioritaet: 'hoch',
      wizardSchritt: 'homeoffice'
    })
  }

  // ── Fahrtkosten (nur Angestellte) ────────────────────────────────────────────
  const kmEinfach = parseFloat(fahrtkosten?.km) || 0
  const arbeitstage = parseInt(fahrtkosten?.arbeitstage) || 0
  const oeffentlichKosten = parseFloat(fahrtkosten?.oeffentlichKosten) || 0

  if (istAngestellter) {
    const hatFahrtkosten = (kmEinfach > 0 && arbeitstage > 0) || oeffentlichKosten > 0
    if (!hatFahrtkosten) {
      hinweise.push({
        id: 'fahrtkosten_fehlt',
        titel: 'Fahrtkosten nicht eingetragen',
        beschreibung: 'Für jeden Arbeitstag kannst du die Entfernung zur Arbeit absetzen — egal ob du mit dem Auto oder dem ÖPNV fährst.',
        potenzial: null,
        prioritaet: 'hoch',
        wizardSchritt: 'fahrtkosten'
      })
    }
  }

  // ── Krankenversicherung ──────────────────────────────────────────────────────
  const kranken = parseFloat(sonderausgaben?.krankenversicherung) || 0
  if (kranken === 0) {
    hinweise.push({
      id: 'krankenversicherung_fehlt',
      titel: 'Krankenversicherungsbeiträge nicht eingetragen',
      beschreibung: 'Deine Beiträge zur Kranken- und Pflegeversicherung sind als Sonderausgaben absetzbar. Schau auf deine Jahresmeldung von der Krankenkasse.',
      potenzial: null,
      prioritaet: 'hoch',
      wizardSchritt: 'sonderausgaben'
    })
  }

  // ── Arbeitsmittel ────────────────────────────────────────────────────────────
  const arbeitsmittelListe = arbeitsmittel ?? []
  // TODO: betriebsausgaben hints for freelancer/selbstaendiger (not yet in spec)
  const hatArbeitsmittel = arbeitsmittelListe.some(i => parseFloat(i.betrag) > 0)
  if (!hatArbeitsmittel) {
    hinweise.push({
      id: 'arbeitsmittel_fehlt',
      titel: 'Arbeitsmittel nicht eingetragen',
      beschreibung: `Beruflich genutzte Geräte, Software, Büromaterial und Fachliteratur sind absetzbar. Einzelposten unter ${werte.arbeitsmittelFreigrenze} € brauchen keine Belege.`,
      potenzial: null,
      prioritaet: 'mittel',
      wizardSchritt: 'arbeitsmittel'
    })
  }

  // ── Altersvorsorge ───────────────────────────────────────────────────────────
  const alters = parseFloat(sonderausgaben?.altersvorsorge) || 0
  if (alters === 0) {
    hinweise.push({
      id: 'altersvorsorge_fehlt',
      titel: 'Altersvorsorge nicht eingetragen',
      beschreibung: 'Beiträge zur gesetzlichen Rentenversicherung, Riester- oder Rürup-Rente sind als Sonderausgaben absetzbar.',
      potenzial: null,
      prioritaet: 'mittel',
      wizardSchritt: 'sonderausgaben'
    })
  }

  // ── Spenden ──────────────────────────────────────────────────────────────────
  const spenden = parseFloat(sonderausgaben?.spenden) || 0
  if (spenden === 0) {
    hinweise.push({
      id: 'spenden_fehlt',
      titel: 'Keine Spenden eingetragen',
      beschreibung: 'Spenden an gemeinnützige Organisationen sind bis zu 20 % deines Einkommens absetzbar. Spendenquittungen aufbewahren.',
      potenzial: null,
      prioritaet: 'niedrig',
      wizardSchritt: 'sonderausgaben'
    })
  }

  // ── Werbungskosten unter Pauschbetrag (nur Angestellte) ──────────────────────
  if (istAngestellter) {
    const fahrtkostenBetrag = !fahrtkosten?.oeffentlich && kmEinfach > 0 && arbeitstage > 0
      ? berechneFahrtkosten(kmEinfach, arbeitstage, jahr)
      : fahrtkosten?.oeffentlich
        ? oeffentlichKosten
        : 0
    const homeofficeBerechnet = homeofficeTage > 0 ? berechneHomeofficePauschale(homeofficeTage, jahr) : 0
    const arbeitsmittelSumme = arbeitsmittelListe.reduce((s, i) => s + (parseFloat(i.betrag) || 0), 0)
    const gesamtWerbungskosten = fahrtkostenBetrag + homeofficeBerechnet + arbeitsmittelSumme

    if (gesamtWerbungskosten > 0 && gesamtWerbungskosten < werte.arbeitnehmerPauschbetrag) {
      const differenz = Math.round((werte.arbeitnehmerPauschbetrag - gesamtWerbungskosten) * 100) / 100
      hinweise.push({
        id: 'werbungskosten_pauschbetrag',
        titel: `Noch ${euroFormat.format(differenz)} bis zum Pauschbetrag`,
        beschreibung: `Der Arbeitnehmer-Pauschbetrag (${werte.arbeitnehmerPauschbetrag} €) wird automatisch angerechnet. Deine eingetragenen Werbungskosten liegen darunter — lohnt sich noch mehr einzutragen?`,
        potenzial: differenz,
        prioritaet: 'niedrig',
        wizardSchritt: 'arbeitsmittel'
      })
    }
  }

  // ── Sortierung: hoch → mittel → niedrig ──────────────────────────────────────
  return hinweise.sort((a, b) => PRIORITAET_ORDER[a.prioritaet] - PRIORITAET_ORDER[b.prioritaet])
}
