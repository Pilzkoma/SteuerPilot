import { contextBridge, ipcRenderer } from 'electron'

/**
 * SteuerPilot Bridge — einziger Kommunikationsweg zwischen Renderer und Main.
 * Kein direktes ipcRenderer im Renderer. Kein remote module.
 */
contextBridge.exposeInMainWorld('steuerpilot', {
  // ── Datenbank ──────────────────────────────────────────────────────────────
  db: {
    exists: () => ipcRenderer.invoke('db:exists'),
    init: (password) => ipcRenderer.invoke('db:init', password),
    close: () => ipcRenderer.invoke('db:close'),
    get: (sql, params) => ipcRenderer.invoke('db:get', sql, params),
    all: (sql, params) => ipcRenderer.invoke('db:all', sql, params),
    run: (sql, params) => ipcRenderer.invoke('db:run', sql, params)
  },

  // ── Belegverwaltung ────────────────────────────────────────────────────────
  belege: {
    importFile: (name, buffer, typ) => ipcRenderer.invoke('belege:import-file', name, buffer, typ),
    readPreview: (dateipfad) => ipcRenderer.invoke('belege:read-preview', dateipfad),
    deleteFile: (dateipfad) => ipcRenderer.invoke('belege:delete-file', dateipfad),
    ocr: (dateipfad, dateityp) => ipcRenderer.invoke('belege:ocr', dateipfad, dateityp)
  },

  // ── PDF Export ─────────────────────────────────────────────────────────────
  pdf: {
    save: (buffer, filename) => ipcRenderer.invoke('pdf:save', buffer, filename)
  },

  // ── CSV ────────────────────────────────────────────────────────────────────
  csv: {
    readFile: (filePath) => ipcRenderer.invoke('csv:read-file', filePath)
  },

  // ── Transaktionen ──────────────────────────────────────────────────────────
  transaktionen: {
    load:      (steuerjahrId) => ipcRenderer.invoke('transaktionen:load', steuerjahrId),
    saveBatch: (payload)      => ipcRenderer.invoke('transaktionen:save-batch', payload),
    update:    (payload)      => ipcRenderer.invoke('transaktionen:update', payload),
    delete:    (id)           => ipcRenderer.invoke('transaktionen:delete', id)
  }
})
