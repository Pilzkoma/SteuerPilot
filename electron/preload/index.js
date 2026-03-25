import { contextBridge, ipcRenderer } from 'electron'

/**
 * SteuerPilot Bridge — einziger Kommunikationsweg zwischen Renderer und Main.
 * Kein direktes ipcRenderer im Renderer. Kein remote module.
 */
contextBridge.exposeInMainWorld('steuerpilot', {
  // ── Datenbank ──────────────────────────────────────────────────────────────
  db: {
    init: (password) => ipcRenderer.invoke('db:init', password),
    close: () => ipcRenderer.invoke('db:close'),
    get: (sql, params) => ipcRenderer.invoke('db:get', sql, params),
    all: (sql, params) => ipcRenderer.invoke('db:all', sql, params),
    run: (sql, params) => ipcRenderer.invoke('db:run', sql, params)
  }
})
