import { describe, it, expect } from 'vitest'
import {
  berechneFahrtkosten,
  berechneHomeofficePauschale,
  schaetzeRueckerstattung,
  getJahreswerte
} from './steuerberechnung.js'

describe('getJahreswerte', () => {
  it('gibt 2025-Werte zurück', () => {
    const werte = getJahreswerte(2025)
    expect(werte.grundfreibetrag).toBe(12096)
    expect(werte.arbeitnehmerPauschbetrag).toBe(1230)
  })

  it('gibt 2024-Werte zurück', () => {
    const werte = getJahreswerte(2024)
    expect(werte.grundfreibetrag).toBe(11604)
  })

  it('fällt auf 2025 zurück wenn Jahr unbekannt', () => {
    const werte = getJahreswerte(2099)
    expect(werte.grundfreibetrag).toBe(12096)
  })
})

describe('berechneFahrtkosten', () => {
  it('berechnet Entfernungspauschale bis 20km korrekt', () => {
    // 15km, 220 Arbeitstage: 15 × 0,30 × 220 = 990€
    expect(berechneFahrtkosten(15, 220, 2025)).toBe(990)
  })

  it('berechnet Entfernungspauschale ab 21km korrekt', () => {
    // 30km, 220 Tage: (20 × 0,30 + 10 × 0,38) × 220 = (6 + 3,80) × 220 = 2156€
    expect(berechneFahrtkosten(30, 220, 2025)).toBe(2156)
  })

  it('berechnet exakt 20km korrekt (Grenzfall)', () => {
    // 20km, 220 Tage: 20 × 0,30 × 220 = 1320€
    expect(berechneFahrtkosten(20, 220, 2025)).toBe(1320)
  })
})

describe('berechneHomeofficePauschale', () => {
  it('berechnet Homeoffice-Pauschale korrekt', () => {
    // 100 Tage × 6€ = 600€
    expect(berechneHomeofficePauschale(100, 2025)).toBe(600)
  })

  it('begrenzt auf 210 Tage maximal', () => {
    // 300 Tage → 210 × 6€ = 1260€
    expect(berechneHomeofficePauschale(300, 2025)).toBe(1260)
  })

  it('gibt Maximum bei exakt 210 Tagen', () => {
    expect(berechneHomeofficePauschale(210, 2025)).toBe(1260)
  })
})

describe('schaetzeRueckerstattung', () => {
  it('schätzt Rückerstattung für einfachen Fall', () => {
    const result = schaetzeRueckerstattung({
      bruttoJahreslohn: 40000,
      einbehalteneLoHSt: 7000,
      werbungskosten: 0,
      sonderausgaben: 0,
      jahr: 2025
    })
    // Arbeitnehmer-Pauschbetrag (1230) wird automatisch angesetzt
    expect(result.geschaetzteRueckerstattung).toBeTypeOf('number')
    expect(result.hinweis).toBeTruthy()
  })

  it('liefert positive Rückerstattung wenn mehr einbehalten wurde als geschuldet', () => {
    const result = schaetzeRueckerstattung({
      bruttoJahreslohn: 35000,
      einbehalteneLoHSt: 6500,
      werbungskosten: 4000,
      sonderausgaben: 2000,
      jahr: 2025
    })
    // zvE = 35000 - 4000 - 2000 - 12096 = 16904 → Steuer ~5164 → Rückerstattung ~1336
    expect(result.geschaetzteRueckerstattung).toBeGreaterThan(0)
  })

  it('gibt 0 Steuer zurück wenn zvE unter Grundfreibetrag', () => {
    const result = schaetzeRueckerstattung({
      bruttoJahreslohn: 13000,
      einbehalteneLoHSt: 0,
      werbungskosten: 2000,
      sonderausgaben: 0,
      jahr: 2025
    })
    // 13000 - 2000 (WK) - 12096 (Grundfreibetrag) = -1096 → zvE=0 → Steuer=0
    expect(result.geschaetzteRueckerstattung).toBe(0)
  })
})
