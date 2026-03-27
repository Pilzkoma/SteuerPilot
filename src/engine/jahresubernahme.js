/**
 * SteuerPilot Engine — Jahresübernahme
 *
 * Kein Electron. Kein Node. Pure JS — vollständig unit-testbar.
 * Bereitet Vorjahresdaten als Ausgangspunkt für ein neues Steuerjahr auf.
 */

/**
 * Bereitet Daten aus einem Quell-Steuerjahr für ein neues Jahr auf.
 *
 * @param {{ nutzer: object, wizardDraft: { daten: string }|null }} quellDaten
 * @returns {{ nutzerprofil: object, wizardDraft: { daten: string, schritt: number, abgeschlossen: number }|null }}
 */
export function bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft }) {
  const nutzerprofil = {
    vorname:       nutzer.vorname       ?? null,
    nachname:      nutzer.nachname      ?? null,
    steuer_id:     nutzer.steuer_id     ?? null,
    finanzamt:     nutzer.finanzamt     ?? null,
    steuernummer:  nutzer.steuernummer  ?? null,
    geburtsdatum:  nutzer.geburtsdatum  ?? null,
    iban:          nutzer.iban          ?? null,
    nutzertyp:     nutzer.nutzertyp     ?? 'angestellter'
  }

  if (!wizardDraft?.daten) {
    return { nutzerprofil, wizardDraft: null }
  }

  let parsed
  try {
    parsed = JSON.parse(wizardDraft.daten)
  } catch {
    return { nutzerprofil, wizardDraft: null }
  }

  // gespeicherte_ids gehören zum alten Jahr — im neuen Jahr zurücksetzen
  parsed.gespeicherte_ids = { einnahmen: [], ausgaben: [] }

  return {
    nutzerprofil,
    wizardDraft: {
      daten: JSON.stringify(parsed),
      schritt: 0,
      abgeschlossen: 0
    }
  }
}
