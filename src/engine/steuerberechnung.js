/**
 * SteuerPilot Engine — Steuerberechnungen
 *
 * Kein Electron. Kein Node. Pure JS — vollständig unit-testbar.
 * Werte basieren auf offiziellen Bundesfinanzministerium-Daten.
 */

// ── Bekannte Jahreswerte ───────────────────────────────────────────────────────

const JAHRESWERTE = {
  2024: {
    grundfreibetrag: 11604,
    arbeitnehmerPauschbetrag: 1230,
    homeofficeTagespauschale: 6,
    homeofficeMaxTage: 210,
    arbeitsmittelFreigrenze: 952,
    entfernungspauschaleKm1bis20: 0.30,
    entfernungspauschaleKmAb21: 0.38
  },
  2025: {
    grundfreibetrag: 12096,
    arbeitnehmerPauschbetrag: 1230,
    homeofficeTagespauschale: 6,
    homeofficeMaxTage: 210,
    arbeitsmittelFreigrenze: 952,
    entfernungspauschaleKm1bis20: 0.30,
    entfernungspauschaleKmAb21: 0.38
  }
}

export function getJahreswerte(jahr) {
  return JAHRESWERTE[jahr] ?? JAHRESWERTE[2025]
}

// ── Fahrtkosten ────────────────────────────────────────────────────────────────

/**
 * Berechnet die absetzbare Entfernungspauschale.
 * @param {number} kmEinfach - Einfache Entfernung in km
 * @param {number} arbeitstage - Arbeitstage pro Jahr
 * @param {number} jahr
 * @returns {number} Absetzbarer Betrag in €
 */
export function berechneFahrtkosten(kmEinfach, arbeitstage, jahr = 2025) {
  const werte = getJahreswerte(jahr)
  let pauschale = 0

  if (kmEinfach <= 20) {
    pauschale = kmEinfach * werte.entfernungspauschaleKm1bis20
  } else {
    pauschale =
      20 * werte.entfernungspauschaleKm1bis20 +
      (kmEinfach - 20) * werte.entfernungspauschaleKmAb21
  }

  return Math.round(pauschale * arbeitstage * 100) / 100
}

// ── Homeoffice-Pauschale ───────────────────────────────────────────────────────

/**
 * @param {number} tage - Homeoffice-Tage
 * @param {number} jahr
 * @returns {number} Absetzbarer Betrag in €
 */
export function berechneHomeofficePauschale(tage, jahr = 2025) {
  const werte = getJahreswerte(jahr)
  const genutzteTage = Math.min(tage, werte.homeofficeMaxTage)
  return genutzteTage * werte.homeofficeTagespauschale
}

// ── Rückerstattungsschätzung ──────────────────────────────────────────────────

/**
 * Vereinfachte Rückerstattungsschätzung für das Dashboard.
 * Nicht für offizielle Steuererklärungen — nur als Orientierung.
 *
 * @param {object} daten
 * @param {number} daten.bruttoJahreslohn
 * @param {number} daten.einbehalteneLoHSt - Vom Arbeitgeber einbehaltene Lohnsteuer
 * @param {number} daten.werbungskosten
 * @param {number} daten.sonderausgaben
 * @param {number} daten.jahr
 * @returns {object} { geschaetzteRueckerstattung, hinweis }
 */
export function schaetzeRueckerstattung({
  bruttoJahreslohn,
  einbehalteneLoHSt,
  werbungskosten = 0,
  sonderausgaben = 0,
  jahr = 2025
}) {
  const werte = getJahreswerte(jahr)

  // Werbungskosten: mindestens Arbeitnehmer-Pauschbetrag
  const effektiveWerbungskosten = Math.max(werbungskosten, werte.arbeitnehmerPauschbetrag)

  // Vereinfachtes zu versteuerndes Einkommen
  const zvE = Math.max(
    0,
    bruttoJahreslohn - effektiveWerbungskosten - sonderausgaben - werte.grundfreibetrag
  )

  // Vereinfachte Steuerformel (Grundtarif 2025, lineare Näherung)
  // Echte Berechnung nach §32a EStG — hier vereinfacht für Dashboard-Schätzung
  let geschaetzteJahressteuer = 0
  if (zvE <= 0) {
    geschaetzteJahressteuer = 0
  } else if (zvE <= 17005) {
    const y = (zvE - 0) / 10000
    geschaetzteJahressteuer = (979.18 * y + 1400) * y
  } else if (zvE <= 66760) {
    const y = (zvE - 17005) / 10000
    geschaetzteJahressteuer = (192.59 * y + 2397) * y + 1025.38
  } else if (zvE <= 277826) {
    geschaetzteJahressteuer = 0.42 * zvE - 10602
  } else {
    geschaetzteJahressteuer = 0.45 * zvE - 18936
  }

  const rueckerstattung = Math.round((einbehalteneLoHSt - geschaetzteJahressteuer) * 100) / 100

  return {
    geschaetzteRueckerstattung: rueckerstattung,
    hinweis: 'Dies ist eine vereinfachte Schätzung. Das tatsächliche Ergebnis hängt von deiner vollständigen Steuererklärung ab.'
  }
}
