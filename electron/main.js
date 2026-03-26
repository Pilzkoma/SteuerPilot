import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, extname } from 'path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs'
import { randomUUID } from 'crypto'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDb, closeDb, dbGet, dbAll, dbRun } from './db.js'
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
