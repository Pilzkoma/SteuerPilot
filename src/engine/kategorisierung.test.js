import { describe, it, expect } from 'vitest'
import { kategorisiereTransaktion } from './kategorisierung.js'

describe('kategorisiereTransaktion', () => {
  it('erkennt Fahrtkosten (Deutsche Bahn)', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'DB FERNVERKEHR AG', verwendungszweck: '' })
    expect(result.kategorie).toBe('fahrtkosten')
    expect(result.abzugsfaehig).toBe(1)
  })

  it('erkennt Fahrtkosten (Flixbus)', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'FlixBus GmbH', verwendungszweck: 'Ticket München' })
    expect(result.kategorie).toBe('fahrtkosten')
    expect(result.abzugsfaehig).toBe(1)
  })

  it('erkennt Arbeitsmittel (Amazon)', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'Amazon Payments', verwendungszweck: 'Bestellung' })
    expect(result.kategorie).toBe('arbeitsmittel')
    expect(result.abzugsfaehig).toBe(1)
  })

  it('erkennt Krankenversicherung (TK)', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'Techniker Krankenkasse', verwendungszweck: 'Beitrag' })
    expect(result.kategorie).toBe('krankenversicherung')
    expect(result.abzugsfaehig).toBe(1)
  })

  it('erkennt Altersvorsorge', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'Deutsche Rentenversicherung Bund', verwendungszweck: '' })
    expect(result.kategorie).toBe('altersvorsorge')
    expect(result.abzugsfaehig).toBe(1)
  })

  it('erkennt Spende', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'UNICEF Deutschland', verwendungszweck: 'Spende' })
    expect(result.kategorie).toBe('spende')
    expect(result.abzugsfaehig).toBe(1)
  })

  it('kategorisiert PayPal als sonstige (Ungeklärt)', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'PayPal (Europe) S.a.r.l.', verwendungszweck: '' })
    expect(result.kategorie).toBe('sonstige')
    expect(result.abzugsfaehig).toBe(0)
  })

  it('kategorisiert unbekannte Transaktionen als sonstige', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'Irgendein Laden GmbH', verwendungszweck: 'Kauf' })
    expect(result.kategorie).toBe('sonstige')
    expect(result.abzugsfaehig).toBe(0)
  })

  it('sucht auch im Verwendungszweck', () => {
    const result = kategorisiereTransaktion({ empfaenger: 'Mustermann Bank', verwendungszweck: 'Fahrkarte Deutsche Bahn München Berlin' })
    expect(result.kategorie).toBe('fahrtkosten')
  })

  it('gibt sonstige zurück für leere Eingabe', () => {
    const result = kategorisiereTransaktion({ empfaenger: '', verwendungszweck: '' })
    expect(result.kategorie).toBe('sonstige')
    expect(result.abzugsfaehig).toBe(0)
  })
})
