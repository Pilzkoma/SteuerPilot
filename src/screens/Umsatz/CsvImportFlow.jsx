import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { spring } from '../../theme/tokens.js'
import { detectBank, normalizeCsv } from '../../engine/csvParser.js'
import { kategorisiereTransaktion } from '../../engine/kategorisierung.js'

const BANK_LABELS = {
  deutsche_bank: 'Deutsche Bank',
  sparkasse: 'Sparkasse',
  ing: 'ING',
  n26: 'N26',
  unbekannt: 'Unbekannte Bank'
}

const KATEGORIEN = [
  { value: 'fahrtkosten', label: 'Fahrtkosten' },
  { value: 'homeoffice', label: 'Homeoffice' },
  { value: 'arbeitsmittel', label: 'Arbeitsmittel' },
  { value: 'krankenversicherung', label: 'Krankenversicherung' },
  { value: 'altersvorsorge', label: 'Altersvorsorge' },
  { value: 'spende', label: 'Spende' },
  { value: 'sonstige', label: 'Sonstige' }
]

function typVonBetrag(betrag) {
  return betrag >= 0 ? 'einnahme' : 'ausgabe'
}

export default function CsvImportFlow({ activeJahr, onComplete, onClose }) {
  const [step, setStep] = useState('upload') // 'upload' | 'preview' | 'importing'
  const [dragOver, setDragOver] = useState(false)
  const [bank, setBank] = useState(null)
  const [transaktionen, setTransaktionen] = useState([])
  const [error, setError] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const inputRef = useRef(null)

  async function processFile(file) {
    setError(null)
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Nur CSV-Dateien werden unterstützt.')
      return
    }
    try {
      const { content } = await window.steuerpilot.csv.readFile(file.path)
      const firstLine = content.split('\n')[0]
      const erkannteBank = detectBank(firstLine)
      setBank(erkannteBank)
      const roh = normalizeCsv(content, erkannteBank)
      const annotiert = roh.map(t => {
        const { kategorie, abzugsfaehig } = kategorisiereTransaktion({
          empfaenger: t.empfaenger,
          verwendungszweck: t.verwendungszweck
        })
        return {
          ...t,
          typ: typVonBetrag(t.betrag),
          betrag: Math.abs(t.betrag),
          kategorie,
          abzugsfaehig,
          bank: erkannteBank
        }
      })
      setTransaktionen(annotiert)
      setStep('preview')
    } catch (err) {
      setError(`Fehler beim Lesen der Datei: ${err.message}`)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    processFile(file)
  }

  function handleFileInput(e) {
    processFile(e.target.files[0])
  }

  function updateKategorie(idx, kategorie) {
    setTransaktionen(prev => prev.map((t, i) => i === idx
      ? { ...t, kategorie, abzugsfaehig: ['fahrtkosten','homeoffice','arbeitsmittel','krankenversicherung','altersvorsorge','spende'].includes(kategorie) ? 1 : 0 }
      : t
    ))
  }

  async function handleImport() {
    setStep('importing')
    try {
      const result = await window.steuerpilot.transaktionen.saveBatch({
        transaktionen,
        steuerjahrId: activeJahr.id
      })
      setImportResult(result)
      setTimeout(() => onComplete(result), 1500)
    } catch (err) {
      setError(`Import fehlgeschlagen: ${err.message}`)
      setStep('preview')
    }
  }

  const absetzbareAusgaben = transaktionen
    .filter(t => t.typ === 'ausgabe' && t.abzugsfaehig === 1)
    .reduce((sum, t) => sum + t.betrag, 0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(4px)'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={spring}
        style={{
          background: 'var(--color-surface-container-low)',
          borderRadius: 'var(--radius-xl)',
          width: step === 'preview' ? 860 : 520,
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          border: '1px solid var(--color-outline-variant)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-outline-variant)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-on-surface)' }}>
              {step === 'upload' ? 'CSV importieren' : step === 'preview' ? 'Vorschau & Kategorien' : 'Wird importiert…'}
            </div>
            {bank && step === 'preview' && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.125rem' }}>
                Bank erkannt: <strong style={{ color: 'var(--color-secondary)' }}>{BANK_LABELS[bank]}</strong>
                {' · '}{transaktionen.length} Transaktionen
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', padding: '0.25rem', display: 'flex' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {step === 'upload' && (
            <div>
              {/* Drag & Drop Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--color-secondary)' : 'var(--color-outline-variant)'}`,
                  borderRadius: 'var(--radius-xl)',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'rgba(245,166,35,0.06)' : 'var(--color-surface-container)',
                  transition: 'all 0.15s ease',
                  transform: dragOver ? 'scale(1.01)' : 'scale(1)'
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ color: dragOver ? 'var(--color-secondary)' : 'var(--color-outline)', marginBottom: '1rem' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div style={{ fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.375rem' }}>
                  CSV hier ablegen oder klicken
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                  Deutsche Bank · Sparkasse · ING · N26
                </div>
              </div>
              <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileInput} />
              {error && (
                <div style={{
                  marginTop: '1rem', padding: '0.75rem 1rem',
                  background: 'rgba(244,67,54,0.1)',
                  border: '1px solid rgba(244,67,54,0.3)',
                  borderRadius: 'var(--radius-lg)',
                  color: '#f44336', fontSize: '0.8125rem'
                }}>
                  {error}
                </div>
              )}
              <div style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                <strong>Hinweis:</strong> Dein Kontoauszug verlässt nie dieses Gerät. Alle Daten werden lokal verarbeitet und verschlüsselt gespeichert.
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div>
              {/* Summary bar */}
              <div style={{
                display: 'flex', gap: '1rem', marginBottom: '1.25rem',
                padding: '0.875rem 1rem',
                background: 'var(--color-surface-container)',
                borderRadius: 'var(--radius-lg)'
              }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-secondary)' }}>
                    {absetzbareAusgaben.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>Absetzbar erkannt</div>
                </div>
                <div style={{ width: 1, background: 'var(--color-outline-variant)' }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
                    {transaktionen.filter(t => t.abzugsfaehig === 1).length}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>Absetzbare Transaktionen</div>
                </div>
                <div style={{ width: 1, background: 'var(--color-outline-variant)' }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
                    {transaktionen.filter(t => t.kategorie === 'sonstige').length}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>Nicht kategorisiert</div>
                </div>
              </div>

              {/* Preview Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-container-high)' }}>
                      {['Datum', 'Empfänger', 'Betrag', 'Kategorie'].map(col => (
                        <th key={col} style={{
                          padding: '0.625rem 0.75rem', textAlign: 'left',
                          fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.06em',
                          textTransform: 'uppercase', color: 'var(--color-on-surface-variant)',
                          borderBottom: '1px solid var(--color-outline-variant)'
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transaktionen.slice(0, 50).map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                          {t.datum}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-on-surface)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.empfaenger || '—'}
                        </td>
                        <td style={{
                          padding: '0.5rem 0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
                          color: t.typ === 'einnahme' ? '#4caf50' : 'var(--color-on-surface)'
                        }}>
                          {t.typ === 'einnahme' ? '+' : '-'}
                          {t.betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <select
                            value={t.kategorie}
                            onChange={e => updateKategorie(idx, e.target.value)}
                            style={{
                              background: 'var(--color-surface-container-high)',
                              border: '1px solid var(--color-outline-variant)',
                              borderRadius: 'var(--radius-md)',
                              color: 'var(--color-on-surface)',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              fontFamily: 'var(--font-family)',
                              cursor: 'pointer'
                            }}
                          >
                            {KATEGORIEN.map(k => (
                              <option key={k.value} value={k.value}>{k.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transaktionen.length > 50 && (
                  <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                    + {transaktionen.length - 50} weitere Transaktionen (werden alle importiert)
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              {importResult ? (
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>
                    {importResult.inserted} Transaktionen importiert
                  </div>
                  {importResult.duplicates > 0 && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                      {importResult.duplicates} Duplikate übersprungen
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--color-on-surface-variant)' }}>Importiere…</div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {step === 'preview' && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--color-outline-variant)',
            display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
            flexShrink: 0
          }}>
            <button
              onClick={() => setStep('upload')}
              style={{
                background: 'var(--color-surface-container)',
                color: 'var(--color-on-surface-variant)',
                border: 'none', borderRadius: 'var(--radius-lg)',
                padding: '0.625rem 1rem',
                fontSize: '0.8125rem', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-family)'
              }}
            >
              Zurück
            </button>
            <button
              onClick={handleImport}
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
                border: 'none', borderRadius: 'var(--radius-lg)',
                padding: '0.625rem 1.25rem',
                fontSize: '0.8125rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-family)'
              }}
            >
              {transaktionen.length} Transaktionen importieren
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
