/**
 * OCR Extraction Engine
 * Pure JS — no Electron dependency, fully unit-testable.
 *
 * Extracts Betrag, Datum, and Haendler from raw OCR text.
 */

// ── Betrag ────────────────────────────────────────────────────────────────────

// Matches German decimal amounts: 12,99 / 1.234,56 / 12.99 / 1,234.56
const BETRAG_PATTERN = /(?:\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g

// Keywords that often precede the final total on a receipt
const TOTAL_KEYWORDS = [
  'gesamt', 'gesamtbetrag', 'total', 'summe', 'endbetrag', 'zu zahlen',
  'rechnungsbetrag', 'brutto', 'betrag', 'zahlung', 'bezahlt', 'bar',
  'ec-karte', 'kreditkarte', 'summe eur'
]

/**
 * Finds the most plausible total amount from OCR text.
 * Strategy: look for a total keyword on the same line, then fall back
 * to the largest plausible amount in the entire text.
 */
export function extrahiereBetrag(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // First pass: look for a line containing a total keyword + an amount
  for (const line of lines) {
    const lower = line.toLowerCase()
    const hasKeyword = TOTAL_KEYWORDS.some(kw => lower.includes(kw))
    if (!hasKeyword) continue

    const matches = line.match(BETRAG_PATTERN)
    if (!matches) continue

    const value = parseGermanDecimal(matches[matches.length - 1])
    if (value !== null && value > 0 && value < 100000) return value
  }

  // Second pass: collect all amounts in the text, return the largest plausible one
  const allMatches = text.match(BETRAG_PATTERN) ?? []
  const values = allMatches
    .map(parseGermanDecimal)
    .filter(v => v !== null && v > 0 && v < 100000)

  if (values.length === 0) return null

  // Receipts usually end with the total — pick the largest
  return Math.max(...values)
}

/**
 * Parses a German-format decimal string to a JS number.
 * Handles both 1.234,56 (DE) and 1,234.56 (EN) formats.
 */
function parseGermanDecimal(str) {
  if (!str) return null

  // Determine format: if last separator is ',' → DE format (1.234,56)
  const lastComma = str.lastIndexOf(',')
  const lastDot = str.lastIndexOf('.')

  let normalized
  if (lastComma > lastDot) {
    // DE: 1.234,56 → 1234.56
    normalized = str.replace(/\./g, '').replace(',', '.')
  } else {
    // EN: 1,234.56 → 1234.56
    normalized = str.replace(/,/g, '')
  }

  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}

// ── Datum ─────────────────────────────────────────────────────────────────────

// German date formats: DD.MM.YYYY, DD.MM.YY, DD/MM/YYYY, DD-MM-YYYY
const DATUM_PATTERN = /\b(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})\b/

/**
 * Extracts the first plausible date from OCR text.
 * Returns ISO string YYYY-MM-DD or null.
 */
export function extrahiereDatum(text) {
  const match = text.match(DATUM_PATTERN)
  if (!match) return null

  let [, day, month, year] = match
  const d = parseInt(day, 10)
  const m = parseInt(month, 10)
  let y = parseInt(year, 10)

  if (d < 1 || d > 31 || m < 1 || m > 12) return null
  if (y < 100) y += y > 50 ? 1900 : 2000

  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  // Sanity check: not in the future by more than 1 day, not before 1990
  const date = new Date(iso)
  if (isNaN(date.getTime())) return null
  if (date.getFullYear() < 1990) return null

  return iso
}

// ── Händler ───────────────────────────────────────────────────────────────────

// Lines to skip when looking for a business name
const SKIP_PATTERNS = [
  /^\d+$/,                          // only digits
  /^[+\-*\/=]+$/,                   // only operators
  /^ust\.?-?id/i,                   // VAT ID lines
  /^steuer-?nr/i,                   // tax number
  /^tel\.?/i,                       // phone
  /^fax/i,                          // fax
  /^http/i,                         // URL
  /^www\./i,                        // URL
  /^rechnung/i,                     // "Rechnung Nr."
  /^quittung/i,                     // "Quittung"
  /^kassenbon/i,                    // "Kassenbon"
  /^datum/i,                        // "Datum:"
  /^[a-z]{1,3}[\s\-]?\d{4,}/i,     // article numbers
]

/**
 * Extracts a plausible business name from the top lines of OCR text.
 * Returns a trimmed string or null.
 */
export function extrahiereHaendler(text) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length >= 3)

  const candidates = []
  for (const line of lines) {
    if (candidates.length >= 2) break
    if (SKIP_PATTERNS.some(p => p.test(line))) continue
    // Skip lines that are mostly digits or symbols
    const letterRatio = (line.match(/[a-zA-ZäöüÄÖÜß]/g) ?? []).length / line.length
    if (letterRatio < 0.4) continue
    candidates.push(line)
  }

  if (candidates.length === 0) return null
  return candidates.join(' — ')
}

// ── Vollständige Extraktion ───────────────────────────────────────────────────

/**
 * Run all extractors on a piece of OCR text.
 * @param {string} text
 * @returns {{ betrag: number|null, datum: string|null, haendler: string|null }}
 */
export function extrahiereAlles(text) {
  if (!text || typeof text !== 'string') {
    return { betrag: null, datum: null, haendler: null }
  }
  return {
    betrag: extrahiereBetrag(text),
    datum: extrahiereDatum(text),
    haendler: extrahiereHaendler(text),
  }
}
