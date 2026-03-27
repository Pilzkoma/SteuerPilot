import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, extname } from 'path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs'
import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDb, closeDb, dbGet, dbAll, dbRun, rekeyDb } from './db.js'
import Tesseract from 'tesseract.js'
import pdfParse from 'pdf-parse'
import { extrahiereAlles } from '../src/engine/ocrExtraction.js'

// ── OCR: Singleton Worker (lazy init, reused across calls) ────────────────────

let _ocrWorker = null
let _ocrWorkerPromise = null  // Prevents duplicate initialization

async function getOcrWorker() {
  if (_ocrWorker) return _ocrWorker
  if (_ocrWorkerPromise) return _ocrWorkerPromise

  _ocrWorkerPromise = Tesseract.createWorker('deu', 1, {
    cachePath: join(app.getPath('userData'), 'tessdata'),
    logger: () => {}
  }).then(w => {
    _ocrWorker = w
    _ocrWorkerPromise = null
    return w
  }).catch(err => {
    _ocrWorkerPromise = null
    throw err
  })

  return _ocrWorkerPromise
}

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#111125',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── IPC: Datenbank ────────────────────────────────────────────────────────────

ipcMain.handle('db:exists', () => {
  const dbPath = join(app.getPath('userData'), 'steuerpilot.db')
  return existsSync(dbPath)
})

ipcMain.handle('db:init', async (_event, password) => {
  return await initDb(password)
})

ipcMain.handle('db:close', async () => {
  return await closeDb()
})

ipcMain.handle('db:get', async (_event, sql, params) => {
  return await dbGet(sql, params)
})

ipcMain.handle('db:all', async (_event, sql, params) => {
  return await dbAll(sql, params)
})

ipcMain.handle('db:run', async (_event, sql, params) => {
  return await dbRun(sql, params)
})

// ── IPC: Belegverwaltung ──────────────────────────────────────────────────────

ipcMain.handle('belege:import-file', (_event, name, buffer, typ) => {
  const belegeDir = join(app.getPath('userData'), 'belege')
  if (!existsSync(belegeDir)) mkdirSync(belegeDir, { recursive: true })

  const ext = extname(name).toLowerCase() || '.bin'
  const dateiname = `${randomUUID()}${ext}`
  const dateipfad = join(belegeDir, dateiname)

  writeFileSync(dateipfad, Buffer.from(buffer))
  return { dateiname, dateipfad }
})

ipcMain.handle('belege:read-preview', (_event, dateipfad) => {
  if (!existsSync(dateipfad)) return null
  const data = readFileSync(dateipfad)
  const ext = extname(dateipfad).toLowerCase()
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf', '.gif': 'image/gif', '.webp': 'image/webp' }
  const mime = mimeMap[ext] ?? 'application/octet-stream'
  return `data:${mime};base64,${data.toString('base64')}`
})

ipcMain.handle('belege:delete-file', (_event, dateipfad) => {
  if (existsSync(dateipfad)) unlinkSync(dateipfad)
  return { success: true }
})

ipcMain.handle('belege:ocr', async (_event, dateipfad, dateityp) => {
  if (!existsSync(dateipfad)) return { fehler: 'Datei nicht gefunden.' }

  try {
    let roherText = ''

    if (dateityp === 'application/pdf') {
      const buffer = readFileSync(dateipfad)
      const result = await pdfParse(buffer)
      roherText = result.text ?? ''
      if (!roherText.trim()) return { fehler: 'PDF enthält keinen extrahierbaren Text (gescanntes PDF?).' }
    } else {
      const worker = await getOcrWorker()
      const { data } = await worker.recognize(dateipfad)
      roherText = data.text ?? ''
    }

    const { betrag, datum, haendler } = extrahiereAlles(roherText)
    return { betrag, datum, haendler, roherText }
  } catch (err) {
    return { fehler: err.message }
  }
})

// ── PDF Export ────────────────────────────────────────────────────────────────

ipcMain.handle('pdf:save', async (_event, buffer, defaultFilename) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultFilename,
    filters: [{ name: 'PDF-Dokument', extensions: ['pdf'] }],
    properties: ['createDirectory']
  })

  if (canceled || !filePath) return false

  writeFileSync(filePath, Buffer.from(buffer))
  return true
})

// ── CSV ──────────────────────────────────────────────────────────────────────

ipcMain.handle('csv:read-file', async (event, filePath) => {
  const buf = await fs.readFile(filePath)
  // Lese als latin1 (sicher für alle Byte-Werte, inkl. ISO-8859-1)
  const latin1Content = buf.toString('latin1')
  const firstLine = latin1Content.split('\n')[0]
  // N26 ist UTF-8 + Komma-getrennt — alle anderen deutschen Banken: latin1
  const isN26 = firstLine.includes('Betrag (EUR)') || (firstLine.includes('Transaktionstyp') && firstLine.includes('Empfänger'))
  const content = isN26 ? buf.toString('utf8') : latin1Content
  return { content }
})

// ── Transaktionen ─────────────────────────────────────────────────────────────

ipcMain.handle('transaktionen:load', async (event, steuerjahrId) => {
  return dbAll(
    'SELECT * FROM transaktionen WHERE steuerjahr_id = ? ORDER BY datum DESC',
    [steuerjahrId]
  )
})

ipcMain.handle('transaktionen:save-batch', async (event, { transaktionen, steuerjahrId }) => {
  let inserted = 0
  let duplicates = 0
  for (const t of transaktionen) {
    const existing = await dbGet(
      'SELECT id FROM transaktionen WHERE steuerjahr_id = ? AND datum = ? AND betrag = ? AND empfaenger = ? LIMIT 1',
      [steuerjahrId, t.datum, t.betrag, t.empfaenger]
    )
    if (existing) {
      duplicates++
      continue
    }
    await dbRun(
      `INSERT INTO transaktionen (steuerjahr_id, datum, betrag, typ, empfaenger, verwendungszweck, kategorie, abzugsfaehig, bank)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [steuerjahrId, t.datum, t.betrag, t.typ, t.empfaenger, t.verwendungszweck, t.kategorie, t.abzugsfaehig, t.bank]
    )
    inserted++
  }
  return { inserted, duplicates }
})

ipcMain.handle('transaktionen:update', async (event, { id, kategorie, abzugsfaehig, notiz }) => {
  return dbRun(
    `UPDATE transaktionen SET kategorie = ?, abzugsfaehig = ?, notiz = ?, zuletzt_geaendert = datetime('now') WHERE id = ?`,
    [kategorie, abzugsfaehig, notiz ?? null, id]
  )
})

ipcMain.handle('transaktionen:delete', async (event, id) => {
  return dbRun('DELETE FROM transaktionen WHERE id = ?', [id])
})

// ── Jahresübernahme & Jahresvergleich ────────────────────────────────────────

ipcMain.handle('jahresubernahme:pruefen', async (_event, zielJahrId) => {
  // Gibt zurück: { sollAnbieten: bool, quellJahrId: number|null, quellJahr: number|null }
  const zielCount = await dbGet(
    `SELECT (SELECT COUNT(*) FROM einnahmen WHERE steuerjahr_id = ?) +
            (SELECT COUNT(*) FROM wizard_fortschritt WHERE steuerjahr_id = ?) as gesamt`,
    [zielJahrId, zielJahrId]
  )
  if ((zielCount?.gesamt ?? 0) > 0) {
    return { sollAnbieten: false, quellJahrId: null, quellJahr: null }
  }
  const zielRow = await dbGet('SELECT jahr FROM steuerjahre WHERE id = ?', [zielJahrId])
  const quellRow = await dbGet(
    `SELECT sj.id, sj.jahr FROM steuerjahre sj
     WHERE sj.jahr < ? AND (
       (SELECT COUNT(*) FROM einnahmen WHERE steuerjahr_id = sj.id) +
       (SELECT COUNT(*) FROM wizard_fortschritt WHERE steuerjahr_id = sj.id)
     ) > 0
     ORDER BY sj.jahr DESC LIMIT 1`,
    [zielRow?.jahr ?? 9999]
  )
  if (!quellRow) return { sollAnbieten: false, quellJahrId: null, quellJahr: null }
  return { sollAnbieten: true, quellJahrId: quellRow.id, quellJahr: quellRow.jahr }
})

ipcMain.handle('jahresubernahme:ausfuehren', async (_event, { zielJahrId, quellJahrId }) => {
  const nutzer = await dbGet('SELECT * FROM nutzer LIMIT 1', [])
  const wizardDraft = await dbGet(
    'SELECT daten FROM wizard_fortschritt WHERE steuerjahr_id = ? ORDER BY id DESC LIMIT 1',
    [quellJahrId]
  )
  if (!nutzer) return { success: false, fehler: 'Kein Nutzerprofil gefunden.' }

  // Nutzer-Stammdaten aktualisieren (bleiben jahresunabhängig in nutzer-Tabelle)
  await dbRun(
    `UPDATE nutzer SET vorname=?, nachname=?, steuer_id=?, finanzamt=?, steuernummer=?, geburtsdatum=?, iban=?, nutzertyp=?, zuletzt_geaendert=datetime('now') WHERE id=?`,
    [nutzer.vorname, nutzer.nachname, nutzer.steuer_id, nutzer.finanzamt,
     nutzer.steuernummer, nutzer.geburtsdatum, nutzer.iban, nutzer.nutzertyp, nutzer.id]
  )

  if (wizardDraft?.daten) {
    let parsed
    try { parsed = JSON.parse(wizardDraft.daten) } catch { parsed = null }
    if (parsed) {
      parsed.gespeicherte_ids = { einnahmen: [], ausgaben: [] }
      await dbRun(
        `INSERT OR REPLACE INTO wizard_fortschritt (steuerjahr_id, schritt, daten, abgeschlossen)
         VALUES (?, 0, ?, 0)`,
        [zielJahrId, JSON.stringify(parsed)]
      )
    }
  }
  return { success: true }
})

ipcMain.handle('steuerjahr:anlegen', async (_event, jahr) => {
  // Bekannte Grundfreibeträge; Fallback auf 2025-Werte
  const GRUNDFREIBETRAEGE = { 2024: 11604, 2025: 12096 }
  const grundfreibetrag = GRUNDFREIBETRAEGE[jahr] ?? 12096
  await dbRun(
    `INSERT OR IGNORE INTO steuerjahre (jahr, grundfreibetrag, arbeitnehmer_pauschbetrag, aktiv)
     VALUES (?, ?, 1230.00, 0)`,
    [jahr, grundfreibetrag]
  )
  return await dbGet('SELECT * FROM steuerjahre WHERE jahr = ?', [jahr])
})

ipcMain.handle('steuerjahr:loeschen', async (_event, jahrId) => {
  await dbRun('DELETE FROM transaktionen WHERE steuerjahr_id = ?', [jahrId])
  await dbRun('DELETE FROM belege WHERE steuerjahr_id = ?', [jahrId])
  await dbRun('DELETE FROM ausgaben WHERE steuerjahr_id = ?', [jahrId])
  await dbRun('DELETE FROM einnahmen WHERE steuerjahr_id = ?', [jahrId])
  await dbRun('DELETE FROM wizard_fortschritt WHERE steuerjahr_id = ?', [jahrId])
  await dbRun('DELETE FROM steuerjahre WHERE id = ?', [jahrId])
  return { success: true }
})

ipcMain.handle('vergleich:laden', async () => {
  const jahre = await dbAll('SELECT id, jahr FROM steuerjahre ORDER BY jahr ASC', [])
  const ergebnisse = await Promise.all(jahre.map(async j => {
    const einnahmen = await dbGet(
      'SELECT COALESCE(SUM(betrag), 0) as total FROM einnahmen WHERE steuerjahr_id = ?', [j.id]
    )
    const ausgaben = await dbGet(
      'SELECT COALESCE(SUM(betrag), 0) as total FROM ausgaben WHERE steuerjahr_id = ? AND abzugsfaehig = 1', [j.id]
    )
    const belege = await dbGet(
      'SELECT COUNT(*) as total FROM belege WHERE steuerjahr_id = ?', [j.id]
    )
    return {
      jahrId: j.id,
      jahr: j.jahr,
      einnahmen: einnahmen?.total ?? 0,
      ausgaben: ausgaben?.total ?? 0,
      belege: belege?.total ?? 0
    }
  }))
  return ergebnisse
})

// ── Einstellungen ─────────────────────────────────────────────────────────────

ipcMain.handle('einstellungen:get', async () => {
  const rows = await dbAll('SELECT schluessel, wert FROM einstellungen', [])
  return Object.fromEntries((rows ?? []).map(r => [r.schluessel, r.wert]))
})

ipcMain.handle('einstellungen:set', async (_event, { schluessel, wert }) => {
  await dbRun(
    `INSERT OR REPLACE INTO einstellungen (schluessel, wert, zuletzt_geaendert)
     VALUES (?, ?, datetime('now'))`,
    [schluessel, wert]
  )
  return { ok: true }
})

ipcMain.handle('db:rekey', async (_event, neuesPasswort) => {
  if (!neuesPasswort || neuesPasswort.trim() === '') {
    return { ok: false, fehler: 'Passwort darf nicht leer sein.' }
  }
  return await rekeyDb(neuesPasswort)
})

ipcMain.handle('jetson:test', async (_event, url, token) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/tags`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal
    })
    clearTimeout(timeout)
    if (res.status === 401) return { ok: false, fehler: 'Ungültiger Token (401).' }
    if (!res.ok) return { ok: false, fehler: `HTTP ${res.status}` }
    const data = await res.json()
    const modelle = (data.models ?? []).map(m => m.name).filter(Boolean)
    return { ok: true, modelle }
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') return { ok: false, fehler: 'Timeout — Jetson nicht erreichbar.' }
    return { ok: false, fehler: err.message ?? 'Verbindungsfehler.' }
  }
})

// ── App Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  electronApp.setAppUserModelId('de.steuerpilot.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (_ocrWorker) _ocrWorker.terminate().catch(() => {})
  closeDb()
  if (process.platform !== 'darwin') app.quit()
})
