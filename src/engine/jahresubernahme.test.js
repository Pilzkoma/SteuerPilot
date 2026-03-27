import { describe, it, expect } from 'vitest'
import { bereiteDatenFuerNeuesJahr } from './jahresubernahme.js'

const nutzer = {
  vorname: 'Max', nachname: 'Mustermann',
  steuer_id: '12345678901', finanzamt: 'Berlin Mitte',
  steuernummer: '111/222/33333', geburtsdatum: '1985-06-15',
  iban: 'DE89370400440532013000', nutzertyp: 'angestellter'
}

const wizardDaten = JSON.stringify({
  lohn: { bruttogehalt: '60000', lohnsteuer: '12000' },
  fahrtkosten: { km: '25', arbeitstage: '220' },
  homeoffice: { tage: '80' },
  arbeitsmittel: [],
  sonderausgaben: { krankenversicherung: '3000', altersvorsorge: '', spenden: '' },
  betriebsausgaben: [],
  gespeicherte_ids: { einnahmen: [1, 2], ausgaben: [5, 6] }
})

describe('bereiteDatenFuerNeuesJahr', () => {
  it('kopiert alle Nutzer-Stammdaten', () => {
    const result = bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft: { daten: wizardDaten } })
    expect(result.nutzerprofil).toEqual(nutzer)
  })

  it('kopiert Wizard-Daten als JSON-String', () => {
    const result = bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft: { daten: wizardDaten } })
    const parsed = JSON.parse(result.wizardDraft.daten)
    expect(parsed.fahrtkosten.km).toBe('25')
    expect(parsed.homeoffice.tage).toBe('80')
  })

  it('setzt schritt auf 0', () => {
    const result = bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft: { daten: wizardDaten } })
    expect(result.wizardDraft.schritt).toBe(0)
  })

  it('setzt abgeschlossen auf 0', () => {
    const result = bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft: { daten: wizardDaten } })
    expect(result.wizardDraft.abgeschlossen).toBe(0)
  })

  it('löscht gespeicherte_ids im Wizard-Draft', () => {
    const result = bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft: { daten: wizardDaten } })
    const parsed = JSON.parse(result.wizardDraft.daten)
    expect(parsed.gespeicherte_ids).toEqual({ einnahmen: [], ausgaben: [] })
  })

  it('funktioniert wenn kein wizardDraft vorhanden', () => {
    const result = bereiteDatenFuerNeuesJahr({ nutzer, wizardDraft: null })
    expect(result.nutzerprofil).toEqual(nutzer)
    expect(result.wizardDraft).toBeNull()
  })
})
