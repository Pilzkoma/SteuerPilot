/**
 * SteuerPilot CSV Parser Engine
 *
 * Kein Electron. Kein Node. Pure JS — vollständig unit-testbar.
 * Unterstützte Banken: Deutsche Bank, Sparkasse, ING, N26
 */

const BANK_CONFIG = {
  deutsche_bank: {
    separator: ';',
    datumIndex: 0,
    empfaengerIndex: 3,
    verwendungszweckIndex: null,
    betragIndex: 6
  },
  sparkasse: {
    separator: ';',
    datumIndex: 1,
    empfaengerIndex: 3,
    verwendungszweckIndex: null,
    betragIndex: 13
  },
  ing: {
    separator: ';',
    datumIndex: 0,
    empfaengerIndex: 2,
    verwendungszweckIndex: 4,
    betragIndex: 7
  },
  n26: {
    separator: ',',
    datumIndex: 0,
    empfaengerIndex: 1,
    verwendungszweckIndex: 4,
    betragIndex: 6
  }
}

/**
 * Erkennt die Bank anhand der Kopfzeile.
 * @param {string} firstLine - Erste Zeile der CSV-Datei
 * @returns {'deutsche_bank'|'sparkasse'|'ing'|'n26'|'unbekannt'}
 */
export function detectBank(firstLine) {
  if (firstLine.includes('Begünstigter / Auftraggeber')) return 'deutsche_bank'
  if (firstLine.includes('Auftragskonto') && firstLine.includes('Auftraggeber/Zahlungsempfänger')) return 'sparkasse'
  if (firstLine.includes('Auftraggeber/Empfänger') && firstLine.includes('Buchungstext')) return 'ing'
  if (firstLine.includes('Betrag (EUR)') || (firstLine.includes('Transaktionstyp') && firstLine.includes('Empfänger'))) return 'n26'
  return 'unbekannt'
}

/**
 * Parsed einen Geldbetrag aus einem CSV-Feld.
 * Deutsche Banken: "1.234,56" → Komma als Dezimaltrenner, Punkt als Tausender.
 * N26: "1234.56" → Punkt als Dezimaltrenner.
 * @param {string} raw
 * @param {string} bank
 * @returns {number}
 */
export function parseAmount(raw, bank) {
  if (!raw || raw.trim() === '' || raw.trim() === '""') return 0
  const cleaned = raw.replace(/"/g, '').trim()
  if (!cleaned || cleaned === '') return 0
  if (bank === 'n26') return parseFloat(cleaned)
  return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
}

/**
 * Konvertiert ein Datum aus CSV-Format zu ISO 8601 (YYYY-MM-DD).
 * Deutsche Banken: "26.11.2024" → "2024-11-26"
 * N26: "2024-11-26" → unveränderter Rückgabe
 * @param {string} raw
 * @param {string} bank
 * @returns {string}
 */
export function parseDate(raw, bank) {
  const cleaned = raw.replace(/"/g, '').trim()
  if (bank === 'n26') return cleaned
  const parts = cleaned.split('.')
  if (parts.length !== 3) return cleaned
  const [d, m, y] = parts
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/**
 * Splittet eine CSV-Zeile in Felder auf.
 * Respektiert Anführungszeichen — Separator innerhalb von Quotes wird ignoriert.
 * @param {string} line
 * @param {string} separator
 * @returns {string[]}
 */
export function parseCsvLine(line, separator) {
  const result = []
  let field = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuote = !inQuote
    } else if (ch === separator && !inQuote) {
      result.push(field)
      field = ''
    } else {
      field += ch
    }
  }
  result.push(field)
  return result
}

/**
 * Normalisiert CSV-Inhalt einer Bank zu einem Array von Transaktionen.
 * @param {string} content - Vollständiger CSV-Inhalt als String
 * @param {string} bank - Bank-Kennung (von detectBank())
 * @returns {Array<{datum: string, betrag: number, empfaenger: string, verwendungszweck: string}>}
 */
export function normalizeCsv(content, bank) {
  const config = BANK_CONFIG[bank] ?? BANK_CONFIG.deutsche_bank
  const { separator, datumIndex, empfaengerIndex, verwendungszweckIndex, betragIndex } = config

  const lines = content.split('\n')
  // Kopfzeile überspringen: erste Zeile die die Bank-Marker enthält
  const headerIdx = lines.findIndex(l => detectBank(l) === bank)
  const dataLines = lines.slice(headerIdx + 1).filter(l => l.trim() !== '')

  return dataLines.map(line => {
    const cols = parseCsvLine(line, separator)
    if (cols.length < betragIndex + 1) return null
    const betrag = parseAmount(cols[betragIndex], bank)
    if (betrag === 0 && !cols[empfaengerIndex]) return null
    return {
      datum: parseDate(cols[datumIndex] ?? '', bank),
      betrag,
      empfaenger: (cols[empfaengerIndex] ?? '').replace(/"/g, '').trim(),
      verwendungszweck: verwendungszweckIndex !== null
        ? (cols[verwendungszweckIndex] ?? '').replace(/"/g, '').trim()
        : ''
    }
  }).filter(t => t !== null)
}
