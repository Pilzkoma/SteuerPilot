import { describe, it, expect } from 'vitest'
import { detectBank, parseAmount, parseDate, parseCsvLine, normalizeCsv } from './csvParser.js'

describe('detectBank', () => {
  it('erkennt Deutsche Bank', () => {
    const header = '"Buchungstag";"Wertstellung";"Auftragsart";"Begünstigter / Auftraggeber";"Kontonummer";"BIC";"Betrag"'
    expect(detectBank(header)).toBe('deutsche_bank')
  })

  it('erkennt Sparkasse', () => {
    const header = '"Auftragskonto";"Buchungstag";"Valutadatum";"Auftraggeber/Zahlungsempfänger";"Empfänger/Zahlungspflichtiger"'
    expect(detectBank(header)).toBe('sparkasse')
  })

  it('erkennt ING', () => {
    const header = 'Buchung;Valuta;Auftraggeber/Empfänger;Buchungstext;Verwendungszweck;Saldo;Währung;Betrag'
    expect(detectBank(header)).toBe('ing')
  })

  it('erkennt N26', () => {
    const header = '"Datum","Empfänger","Kontonummer","Transaktionstyp","Verwendungszweck","Kategorie","Betrag (EUR)"'
    expect(detectBank(header)).toBe('n26')
  })

  it('gibt unbekannt zurück für unbekannte Formate', () => {
    expect(detectBank('Datum;Betrag;Name')).toBe('unbekannt')
  })
})

describe('parseAmount', () => {
  it('parsed deutschen Betrag (Komma als Dezimaltrenner)', () => {
    expect(parseAmount('"-89,50"', 'deutsche_bank')).toBe(-89.5)
  })

  it('parsed deutschen Betrag ohne Anführungszeichen', () => {
    expect(parseAmount('-89,50', 'sparkasse')).toBe(-89.5)
  })

  it('parsed deutschen Betrag mit Tausenderpunkt', () => {
    expect(parseAmount('"1.234,56"', 'ing')).toBe(1234.56)
  })

  it('parsed N26-Betrag (Punkt als Dezimaltrenner)', () => {
    expect(parseAmount('"-89.50"', 'n26')).toBe(-89.5)
  })

  it('gibt 0 zurück für leere Felder', () => {
    expect(parseAmount('', 'deutsche_bank')).toBe(0)
    expect(parseAmount('""', 'sparkasse')).toBe(0)
  })
})

describe('parseDate', () => {
  it('konvertiert deutsches Datum (DD.MM.YYYY) zu ISO', () => {
    expect(parseDate('"26.11.2024"', 'deutsche_bank')).toBe('2024-11-26')
  })

  it('behält ISO-Datum (N26) unverändert', () => {
    expect(parseDate('"2024-11-26"', 'n26')).toBe('2024-11-26')
  })

  it('füllt einstellige Tage und Monate mit führender Null auf', () => {
    expect(parseDate('7.1.2025', 'sparkasse')).toBe('2025-01-07')
  })
})

describe('parseCsvLine', () => {
  it('splittet Semikolon-getrennte Felder', () => {
    expect(parseCsvLine('a;b;c', ';')).toEqual(['a', 'b', 'c'])
  })

  it('splittet Komma-getrennte Felder', () => {
    expect(parseCsvLine('a,b,c', ',')).toEqual(['a', 'b', 'c'])
  })

  it('behandelt gequotete Felder korrekt', () => {
    expect(parseCsvLine('"Muster GmbH";"89,50";"Lastschrift"', ';')).toEqual([
      'Muster GmbH', '89,50', 'Lastschrift'
    ])
  })

  it('behandelt Semikolon innerhalb von Anführungszeichen', () => {
    expect(parseCsvLine('"Name; mit Semikolon";"100,00"', ';')).toEqual([
      'Name; mit Semikolon', '100,00'
    ])
  })
})

describe('normalizeCsv', () => {
  it('normalisiert Deutsche Bank CSV zu Transaktionen', () => {
    const content = [
      '"Buchungstag";"Wertstellung";"Auftragsart";"Begünstigter / Auftraggeber";"Kontonummer";"BIC";"Betrag";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz"',
      '"26.11.2024";"26.11.2024";"Lastschrift";"REWE Markt GmbH";"DE27200400600959050300";"COBADEFFXXX";"-89,50";"";"";"";'
    ].join('\n')
    const result = normalizeCsv(content, 'deutsche_bank')
    expect(result).toHaveLength(1)
    expect(result[0].datum).toBe('2024-11-26')
    expect(result[0].betrag).toBe(-89.5)
    expect(result[0].empfaenger).toBe('REWE Markt GmbH')
  })

  it('ignoriert leere Zeilen', () => {
    const content = [
      '"Buchungstag";"Wertstellung";"Auftragsart";"Begünstigter / Auftraggeber";"Kontonummer";"BIC";"Betrag";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz"',
      '',
      '"26.11.2024";"26.11.2024";"Lastschrift";"REWE Markt GmbH";"DE27200400600959050300";"COBADEFFXXX";"-89,50";"";"";"";',
      ''
    ].join('\n')
    const result = normalizeCsv(content, 'deutsche_bank')
    expect(result).toHaveLength(1)
  })

  it('normalisiert N26 CSV (Komma-Separator, ISO-Datum)', () => {
    const content = [
      '"Datum","Empfänger","Kontonummer","Transaktionstyp","Verwendungszweck","Kategorie","Betrag (EUR)","Betrag (Fremdwährung)","Fremdwährung","Wechselkurs"',
      '"2024-11-26","REWE Markt GmbH","DE27200400600959050300","Outgoing Transfer","REWE Einkauf","Groceries","-89.50","","",""'
    ].join('\n')
    const result = normalizeCsv(content, 'n26')
    expect(result).toHaveLength(1)
    expect(result[0].datum).toBe('2024-11-26')
    expect(result[0].betrag).toBe(-89.5)
    expect(result[0].empfaenger).toBe('REWE Markt GmbH')
    expect(result[0].verwendungszweck).toBe('REWE Einkauf')
  })
})
