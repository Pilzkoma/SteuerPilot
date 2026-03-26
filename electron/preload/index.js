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
    deleteFile: (dateipfad) => ipcRenderer.invoke('belege:delete-file', dateipfad)
  }
})
