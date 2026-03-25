import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDb, closeDb, dbGet, dbAll, dbRun } from './db.js'

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
  closeDb()
  if (process.platform !== 'darwin') app.quit()
})
