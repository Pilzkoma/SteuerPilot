import { describe, it, expect } from 'vitest'
import { berechneOptimierungshinweise } from './optimierung.js'

function emptyDaten() {
  return {
    lohn: { bruttogehalt: '', lohnsteuer: '', soli: '', kirchensteuer: '', honorar: '' },
    fahrtkosten: { km: '', arbeitstage: '', oeffentlich: false, oeffentlichKosten: '' },
    homeoffice: { tage: '' },
    arbeitsmittel: [],
    sonderausgaben: { krankenversicherung: '', altersvorsorge: '', spenden: '' },
    betriebsausgaben: [],
    gespeicherte_ids: { einnahmen: [], ausgaben: [] }
  }
}

describe('berechneOptimierungshinweise', () => {
  it('gibt leeres Array zurück wenn alle Felder ausgefüllt sind', () => {
    const daten = emptyDaten()
    daten.homeoffice.tage = '100'
    daten.arbeitsmittel = [{ betrag: '500', beschreibung: 'Laptop' }]
    daten.sonderausgaben.krankenversicherung = '2000'
    daten.sonderausgaben.altersvorsorge = '1000'
    daten.sonderausgaben.spenden = '200'
    daten.fahrtkosten.km = '20'
    daten.fahrtkosten.arbeitstage = '220'
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    expect(hinweise).toEqual([])
  })

  it('meldet homeoffice_fehlt wenn tage = 0', () => {
    const daten = emptyDaten()
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const ids = hinweise.map(h => h.id)
    expect(ids).toContain('homeoffice_fehlt')
  })

  it('meldet arbeitsmittel_fehlt wenn Array leer', () => {
    const daten = emptyDaten()
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const ids = hinweise.map(h => h.id)
    expect(ids).toContain('arbeitsmittel_fehlt')
  })

  it('meldet krankenversicherung_fehlt wenn Wert = 0', () => {
    const daten = emptyDaten()
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const ids = hinweise.map(h => h.id)
    expect(ids).toContain('krankenversicherung_fehlt')
  })

  it('meldet altersvorsorge_fehlt wenn Wert = 0', () => {
    const daten = emptyDaten()
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const ids = hinweise.map(h => h.id)
    expect(ids).toContain('altersvorsorge_fehlt')
  })

  it('meldet fahrtkosten_fehlt nur für Angestellte wenn km = 0', () => {
    const daten = emptyDaten()
    const angestellterHinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const freelancerHinweise = berechneOptimierungshinweise(daten, 'freelancer', 2025)
    expect(angestellterHinweise.map(h => h.id)).toContain('fahrtkosten_fehlt')
    expect(freelancerHinweise.map(h => h.id)).not.toContain('fahrtkosten_fehlt')
  })

  it('meldet werbungskosten_pauschbetrag wenn Werbungskosten > 0 aber < 1230', () => {
    const daten = emptyDaten()
    daten.homeoffice.tage = '10'     // 60 € — unter Pauschbetrag
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const ids = hinweise.map(h => h.id)
    expect(ids).toContain('werbungskosten_pauschbetrag')
  })

  it('meldet werbungskosten_pauschbetrag NICHT wenn Werbungskosten >= 1230', () => {
    const daten = emptyDaten()
    daten.fahrtkosten.km = '20'
    daten.fahrtkosten.arbeitstage = '220'  // 1320 € > Pauschbetrag
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const ids = hinweise.map(h => h.id)
    expect(ids).not.toContain('werbungskosten_pauschbetrag')
  })

  it('jeder Hinweis hat id, titel, beschreibung, prioritaet, wizardSchritt', () => {
    const daten = emptyDaten()
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    for (const h of hinweise) {
      expect(h).toHaveProperty('id')
      expect(h).toHaveProperty('titel')
      expect(h).toHaveProperty('beschreibung')
      expect(h).toHaveProperty('prioritaet')
      expect(h).toHaveProperty('wizardSchritt')
      expect(['hoch', 'mittel', 'niedrig']).toContain(h.prioritaet)
    }
  })

  it('sortiert nach Priorität: hoch → mittel → niedrig', () => {
    const daten = emptyDaten()
    const hinweise = berechneOptimierungshinweise(daten, 'angestellter', 2025)
    const reihenfolge = { hoch: 0, mittel: 1, niedrig: 2 }
    for (let i = 1; i < hinweise.length; i++) {
      expect(reihenfolge[hinweise[i].prioritaet]).toBeGreaterThanOrEqual(
        reihenfolge[hinweise[i - 1].prioritaet]
      )
    }
  })

  it('meldet werbungskosten_pauschbetrag NICHT für Freelancer', () => {
    const daten = emptyDaten()
    daten.homeoffice.tage = '10'  // 60 € — unter Pauschbetrag, aber Freelancer
    const hinweise = berechneOptimierungshinweise(daten, 'freelancer', 2025)
    const ids = hinweise.map(h => h.id)
    expect(ids).not.toContain('werbungskosten_pauschbetrag')
  })

  it('meldet selbstaendiger nie fahrtkosten_fehlt', () => {
    const daten = emptyDaten()
    const hinweise = berechneOptimierungshinweise(daten, 'selbstaendiger', 2025)
    expect(hinweise.map(h => h.id)).not.toContain('fahrtkosten_fehlt')
  })
})
