import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { spring, springGentle } from '../../theme/tokens.js'
import UploadZone from './UploadZone.jsx'

// ── Kategorie-Konfiguration ───────────────────────────────────────────────────

const KATEGORIEN = [
  { id: 'arbeitsmittel',      label: 'Arbeitsmittel',       farbe: '#4f8ef7' },
  { id: 'fahrtkosten',        label: 'Fahrtkosten',         farbe: '#34c77b' },
  { id: 'homeoffice',         label: 'Homeoffice',          farbe: '#a78bfa' },
  { id: 'krankenversicherung',label: 'Krankenversicherung', farbe: '#f87171' },
  { id: 'altersvorsorge',     label: 'Altersvorsorge',      farbe: '#fbbf24' },
  { id: 'spende',             label: 'Spende',              farbe: '#34d399' },
  { id: 'betriebsausgaben',   label: 'Betriebsausgaben',    farbe: '#fb923c' },
  { id: 'sonstige',           label: 'Sonstige',            farbe: '#94a3b8' },
]

function kategorieById(id) {
  return KATEGORIEN.find(k => k.id === id) ?? KATEGORIEN[KATEGORIEN.length - 1]
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconPdf() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 15v-2h1.5a1 1 0 0 1 0 2H9zM13 13h1a2 2 0 0 1 0 4h-1v-4zM17 13h2M17 15h1.5M17 17h2"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function IconImage() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconEmpty() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

// ── Beleg-Vorschau (Bild oder PDF-Platzhalter) ────────────────────────────────

function BelegPreview({ dataUrl, dateityp, style }) {
  if (!dataUrl) {
    return (
      <div style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-surface-container)',
        color: 'var(--color-on-surface-variant)'
      }}>
        <IconImage />
      </div>
    )
  }

  if (dateityp === 'application/pdf' || dataUrl.startsWith('data:application/pdf')) {
    return (
      <div style={{
        ...style,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.375rem',
        background: 'var(--color-surface-container)',
        color: 'var(--color-primary)'
      }}>
        <IconPdf />
        <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>PDF</span>
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt="Beleg-Vorschau"
      style={{ ...style, objectFit: 'cover' }}
    />
  )
}

// ── Beleg-Karte in der Liste ──────────────────────────────────────────────────

function BelegKarte({ beleg, aktiv, onClick }) {
  const kat = kategorieById(beleg.kategorie)
  const betragText = beleg.betrag != null
    ? `${Number(beleg.betrag).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`
    : '—'

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={spring}
      style={{
        width: '100%',
        background: aktiv ? 'var(--color-surface-container-high)' : 'var(--color-surface-container)',
        border: aktiv
          ? '1px solid var(--color-outline-variant)'
          : '1px solid transparent',
        borderRadius: 'var(--radius-lg)',
        padding: '0.75rem',
        cursor: 'pointer',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        textAlign: 'left',
        fontFamily: 'var(--font-family)',
        transition: 'background 0.15s, border-color 0.15s'
      }}
      onMouseEnter={e => { if (!aktiv) e.currentTarget.style.background = 'var(--color-surface-container-high)' }}
      onMouseLeave={e => { if (!aktiv) e.currentTarget.style.background = 'var(--color-surface-container)' }}
    >
      {/* Thumbnail */}
      <BelegPreview
        dataUrl={beleg._previewUrl}
        dateityp={beleg.dateityp}
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-md)',
          flexShrink: 0,
          overflow: 'hidden'
        }}
      />

      {/* Metadaten */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--color-on-surface)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '0.25rem'
        }}>
          {beleg.beschreibung || beleg.dateiname}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.5625rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: kat.farbe,
            background: `${kat.farbe}18`,
            padding: '0.125rem 0.4rem',
            borderRadius: 'var(--radius-pill)',
            flexShrink: 0
          }}>
            {kat.label}
          </span>
          {beleg.betrag != null && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>
              {betragText}
            </span>
          )}
        </div>
      </div>

      {/* Datum */}
      {beleg.datum && (
        <span style={{
          fontSize: '0.6875rem',
          color: 'var(--color-on-surface-variant)',
          flexShrink: 0
        }}>
          {new Date(beleg.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </span>
      )}
    </motion.button>
  )
}

// ── Detail-Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ beleg, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    kategorie: beleg.kategorie ?? 'sonstige',
    betrag: beleg.betrag != null ? String(beleg.betrag) : '',
    datum: beleg.datum ?? '',
    beschreibung: beleg.beschreibung ?? ''
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    await onSave(beleg, form)
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    await onDelete(beleg)
    setDeleting(false)
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--color-surface-container)',
    color: 'var(--color-on-surface)',
    border: '1px solid var(--color-outline-variant)',
    borderRadius: 'var(--radius-md)',
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-family)',
    outline: 'none',
    boxSizing: 'border-box'
  }

  const labelStyle = {
    fontSize: '0.625rem',
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--color-on-surface-variant)',
    display: 'block',
    marginBottom: '0.375rem'
  }

  return (
    <motion.div
      key={beleg.id ?? beleg._tempId}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={springGentle}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        overflowY: 'auto'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{
          fontSize: '0.875rem',
          fontWeight: 700,
          color: 'var(--color-on-surface)',
          letterSpacing: '-0.01em'
        }}>
          {beleg.id ? 'Beleg bearbeiten' : 'Neuer Beleg'}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-on-surface-variant)', padding: '0.25rem',
            display: 'flex', borderRadius: 'var(--radius-sm)'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-on-surface)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-on-surface-variant)'}
        >
          <IconClose />
        </button>
      </div>

      {/* Vorschau */}
      <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', flexShrink: 0 }}>
        <BelegPreview
          dataUrl={beleg._previewUrl}
          dateityp={beleg.dateityp}
          style={{ width: '100%', height: 180, borderRadius: 'var(--radius-lg)' }}
        />
      </div>

      {/* Dateiname */}
      <p style={{
        fontSize: '0.6875rem',
        color: 'var(--color-on-surface-variant)',
        marginTop: '-0.5rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {beleg.dateiname}
      </p>

      {/* Felder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Kategorie */}
        <div>
          <label style={labelStyle}>Kategorie</label>
          <select
            value={form.kategorie}
            onChange={e => update('kategorie', e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {KATEGORIEN.map(k => (
              <option key={k.id} value={k.id}>{k.label}</option>
            ))}
          </select>
        </div>

        {/* Betrag */}
        <div>
          <label style={labelStyle}>Betrag (€)</label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={form.betrag}
              onChange={e => update('betrag', e.target.value)}
              style={{ ...inputStyle, paddingRight: '2rem' }}
              onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'}
            />
            <span style={{
              position: 'absolute', right: '0.75rem', top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)',
              pointerEvents: 'none'
            }}>€</span>
          </div>
        </div>

        {/* Datum */}
        <div>
          <label style={labelStyle}>Datum</label>
          <input
            type="date"
            value={form.datum}
            onChange={e => update('datum', e.target.value)}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'}
          />
        </div>

        {/* Beschreibung */}
        <div>
          <label style={labelStyle}>Beschreibung <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          <input
            type="text"
            placeholder="z.B. Laptop-Maus, Fahrtkosten März…"
            value={form.beschreibung}
            onChange={e => update('beschreibung', e.target.value)}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'}
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: 'auto' }}>
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          style={{
            padding: '0.875rem',
            background: 'var(--color-secondary)',
            color: 'var(--color-on-secondary)',
            border: 'none',
            borderRadius: 'var(--radius-pill)',
            fontFamily: 'var(--font-family)',
            fontWeight: 700,
            fontSize: '0.8125rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? 'Wird gespeichert…' : (
            <>
              <IconCheck />
              {beleg.id ? 'Änderungen speichern' : 'Beleg speichern'}
            </>
          )}
        </motion.button>

        {beleg.id && (
          <motion.button
            onClick={handleDelete}
            disabled={deleting}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            style={{
              padding: '0.75rem',
              background: confirmDelete ? 'rgba(239,68,68,0.12)' : 'transparent',
              color: confirmDelete ? 'var(--color-error)' : 'var(--color-on-surface-variant)',
              border: `1px solid ${confirmDelete ? 'rgba(239,68,68,0.3)' : 'var(--color-outline-variant)'}`,
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--font-family)',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: deleting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'background 0.2s, color 0.2s, border-color 0.2s'
            }}
          >
            <IconTrash />
            {confirmDelete ? 'Wirklich löschen?' : 'Beleg löschen'}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

// ── Leerer Zustand ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      color: 'var(--color-on-surface-variant)',
      padding: '2rem'
    }}>
      <IconEmpty />
      <p style={{ fontSize: '0.875rem', fontWeight: 500, textAlign: 'center' }}>
        Noch keine Belege gespeichert.
      </p>
      <p style={{ fontSize: '0.75rem', opacity: 0.6, textAlign: 'center', maxWidth: 220 }}>
        Lade eine Datei hoch um zu beginnen.
      </p>
    </div>
  )
}

// ── Haupt-Screen ──────────────────────────────────────────────────────────────

export default function BelegeScreen({ activeJahr }) {
  const [belege, setBelege] = useState([])
  const [ausgewaehlt, setAusgewaehlt] = useState(null)   // { ...beleg, _previewUrl, _tempId? }
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  const jahrId = activeJahr?.id ?? null

  useEffect(() => {
    if (jahrId) loadBelege()
  }, [jahrId])

  async function loadBelege() {
    setLoading(true)
    try {
      const rows = await window.steuerpilot.db.all(`
        SELECT b.*, a.betrag, a.datum, a.beschreibung, a.kategorie
        FROM belege b
        LEFT JOIN ausgaben a ON b.ausgabe_id = a.id
        WHERE b.steuerjahr_id = ?
        ORDER BY b.erstellt_am DESC
      `, [jahrId])

      // Vorschau-URLs für alle Belege laden
      const mitPreviews = await Promise.all((rows ?? []).map(async b => {
        const previewUrl = await window.steuerpilot.belege.readPreview(b.dateipfad)
        return { ...b, _previewUrl: previewUrl }
      }))

      setBelege(mitPreviews)
    } catch (err) {
      console.error('Belege laden fehlgeschlagen:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilesAdded = useCallback(async (files) => {
    if (!jahrId || uploading) return
    setUploading(true)

    try {
      for (const file of files) {
        const buffer = await file.arrayBuffer()
        const { dateiname, dateipfad } = await window.steuerpilot.belege.importFile(
          file.name, buffer, file.type
        )
        const previewUrl = await window.steuerpilot.belege.readPreview(dateipfad)

        const neuerBeleg = {
          id: null,
          _tempId: `temp-${Date.now()}-${Math.random()}`,
          steuerjahr_id: jahrId,
          dateiname,
          dateipfad,
          dateityp: file.type || null,
          ocr_status: 'manuell',
          betrag: null,
          datum: '',
          beschreibung: '',
          kategorie: 'sonstige',
          _previewUrl: previewUrl
        }

        // Nur einen auswählen — den letzten hochgeladenen
        setAusgewaehlt(neuerBeleg)
      }
    } catch (err) {
      console.error('Datei-Import fehlgeschlagen:', err)
    } finally {
      setUploading(false)
    }
  }, [jahrId, uploading])

  async function handleSave(beleg, form) {
    const db = window.steuerpilot.db
    const betrag = form.betrag ? parseFloat(form.betrag) : null
    const datum = form.datum || null
    const beschreibung = form.beschreibung || null
    const kategorie = form.kategorie

    try {
      if (beleg.id) {
        // Update bestehenden Beleg + verknüpfte Ausgabe
        if (beleg.ausgabe_id) {
          await db.run(
            `UPDATE ausgaben SET betrag = ?, datum = ?, beschreibung = ?, kategorie = ?,
             zuletzt_geaendert = datetime('now') WHERE id = ?`,
            [betrag ?? 0, datum, beschreibung, kategorie, beleg.ausgabe_id]
          )
        }
        await db.run(
          `UPDATE belege SET zuletzt_geaendert = datetime('now') WHERE id = ?`,
          [beleg.id]
        )
        await loadBelege()
        // Aktuelle Auswahl aktualisieren
        setAusgewaehlt(prev => prev ? {
          ...prev, betrag, datum, beschreibung, kategorie
        } : null)
      } else {
        // Neuen Beleg: zuerst ausgabe anlegen
        await db.run(
          `INSERT INTO ausgaben (steuerjahr_id, betrag, datum, beschreibung, kategorie, abzugsfaehig)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [jahrId, betrag ?? 0, datum, beschreibung, kategorie]
        )
        const ausgabeRow = await db.get('SELECT last_insert_rowid() as id', [])
        const ausgabeId = ausgabeRow.id

        await db.run(
          `INSERT INTO belege (steuerjahr_id, ausgabe_id, dateiname, dateipfad, dateityp, ocr_status)
           VALUES (?, ?, ?, ?, ?, 'manuell')`,
          [jahrId, ausgabeId, beleg.dateiname, beleg.dateipfad, beleg.dateityp]
        )
        const belegRow = await db.get('SELECT last_insert_rowid() as id', [])

        await loadBelege()
        // Auf gespeicherten Beleg wechseln
        const gespeichert = await db.get(`
          SELECT b.*, a.betrag, a.datum, a.beschreibung, a.kategorie
          FROM belege b LEFT JOIN ausgaben a ON b.ausgabe_id = a.id
          WHERE b.id = ?
        `, [belegRow.id])
        const previewUrl = await window.steuerpilot.belege.readPreview(gespeichert.dateipfad)
        setAusgewaehlt({ ...gespeichert, _previewUrl: previewUrl })
      }
    } catch (err) {
      console.error('Beleg speichern fehlgeschlagen:', err)
    }
  }

  async function handleDelete(beleg) {
    try {
      if (beleg.id) {
        await window.steuerpilot.db.run('DELETE FROM belege WHERE id = ?', [beleg.id])
        if (beleg.ausgabe_id) {
          await window.steuerpilot.db.run('DELETE FROM ausgaben WHERE id = ?', [beleg.ausgabe_id])
        }
      }
      await window.steuerpilot.belege.deleteFile(beleg.dateipfad)
      setAusgewaehlt(null)
      await loadBelege()
    } catch (err) {
      console.error('Beleg löschen fehlgeschlagen:', err)
    }
  }

  const gesamtBetrag = belege.reduce((s, b) => s + (Number(b.betrag) || 0), 0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={springGentle}
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-family)',
        overflow: 'hidden'
      }}
    >
      {/* Page Header */}
      <div style={{
        padding: '1.75rem 2rem 1.25rem',
        borderBottom: '1px solid var(--color-surface-container)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontSize: '1.375rem',
              fontWeight: 800,
              color: 'var(--color-on-surface)',
              letterSpacing: '-0.02em',
              marginBottom: '0.25rem'
            }}>Belege</h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
              {activeJahr?.jahr ?? '—'} · {belege.length} {belege.length === 1 ? 'Beleg' : 'Belege'}
              {belege.length > 0 && (
                <span style={{ color: 'var(--color-secondary)', fontWeight: 600 }}>
                  {' '}· {gesamtBetrag.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € gesamt
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Linke Spalte: Upload + Liste */}
        <div style={{
          width: ausgewaehlt ? '55%' : '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: ausgewaehlt ? '1px solid var(--color-surface-container)' : 'none',
          transition: 'width 0.3s',
          overflow: 'hidden'
        }}>
          {/* Upload-Zone */}
          <div style={{ padding: '1.25rem 1.5rem', flexShrink: 0 }}>
            <UploadZone onFilesAdded={handleFilesAdded} disabled={uploading || !jahrId} />
            {uploading && (
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--color-secondary)',
                marginTop: '0.5rem',
                textAlign: 'center'
              }}>
                Datei wird verarbeitet…
              </p>
            )}
          </div>

          {/* Beleg-Liste */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>
                Laden…
              </div>
            ) : belege.length === 0 ? (
              <EmptyState />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <AnimatePresence initial={false}>
                  {belege.map(b => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={springGentle}
                    >
                      <BelegKarte
                        beleg={b}
                        aktiv={ausgewaehlt?.id === b.id}
                        onClick={() => setAusgewaehlt(b)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Rechte Spalte: Detail-Panel */}
        <AnimatePresence>
          {ausgewaehlt && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '45%' }}
              exit={{ opacity: 0, width: 0 }}
              transition={springGentle}
              style={{
                flexShrink: 0,
                overflow: 'hidden',
                background: 'var(--color-surface-container-lowest)'
              }}
            >
              <div style={{ width: '100%', height: '100%', padding: '1.5rem', boxSizing: 'border-box', overflowY: 'auto' }}>
                <DetailPanel
                  beleg={ausgewaehlt}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onClose={() => setAusgewaehlt(null)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
