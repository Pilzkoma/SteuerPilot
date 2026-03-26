import { app } from 'electron'
import { join } from 'path'

let db = null

/**
 * Öffnet die SQLCipher-Datenbank mit dem Nutzerpasswort.
 * Das Passwort lebt nur im RAM — wird nie auf Disk gespeichert.
 */
export async function initDb(password) {
  if (!password || password.trim() === '') {
    throw new Error('Passwort darf nicht leer sein.')
  }

  // Lazy-load SQLCipher — nur im Main Process
  const Database = (await import('@journeyapps/sqlcipher')).default

  const dbPath = join(app.getPath('userData'), 'steuerpilot.db')

  return new Promise((resolve, reject) => {
    const instance = new Database.Database(dbPath, (err) => {
      if (err) return reject(err)

      // SQLCipher: Passwort setzen — MUSS als erstes pragma ausgeführt werden
      instance.run(`PRAGMA key = '${password.replace(/'/g, "''")}'`, (err) => {
        if (err) return reject(new Error('Falsches Passwort oder beschädigte Datenbank.'))

        // Verbindung testen
        instance.get('SELECT count(*) FROM sqlite_master', (err) => {
          if (err) {
            instance.close()
            return reject(new Error('Falsches Passwort.'))
          }

          db = instance
          applyPragmas(db)
            .then(() => createSchema(db))
            .then(() => resolve({ success: true }))
            .catch(reject)
        })
      })
    })
  })
}

async function applyPragmas(database) {
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      database.run('PRAGMA journal_mode = WAL')
      database.run('PRAGMA foreign_keys = ON')
      database.run('PRAGMA synchronous = NORMAL', (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  })
}

/**
 * Datenbankschema — JEDE Datentabelle hat steuerjahr_id.
 * Mehrjahresfähigkeit ist nicht verhandelbar.
 */
async function createSchema(database) {
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // ── Steuerjahre ─────────────────────────────────────────────────────────
      database.run(`
        CREATE TABLE IF NOT EXISTS steuerjahre (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          jahr                INTEGER NOT NULL UNIQUE,
          grundfreibetrag     REAL,
          arbeitnehmer_pauschbetrag REAL,
          aktiv               INTEGER NOT NULL DEFAULT 0,
          erstellt_am         TEXT NOT NULL DEFAULT (datetime('now')),
          zuletzt_geaendert   TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)

      // ── Nutzerprofil ─────────────────────────────────────────────────────────
      database.run(`
        CREATE TABLE IF NOT EXISTS nutzer (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          vorname             TEXT,
          nachname            TEXT,
          steuer_id           TEXT,
          finanzamt           TEXT,
          steuernummer        TEXT,
          geburtsdatum        TEXT,
          iban                TEXT,
          nutzertyp           TEXT NOT NULL DEFAULT 'angestellter',
          erstellt_am         TEXT NOT NULL DEFAULT (datetime('now')),
          zuletzt_geaendert   TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)

      // ── Einkommensquellen ────────────────────────────────────────────────────
      database.run(`
        CREATE TABLE IF NOT EXISTS einnahmen (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          steuerjahr_id       INTEGER NOT NULL REFERENCES steuerjahre(id),
          beschreibung        TEXT,
          betrag              REAL NOT NULL,
          kategorie           TEXT NOT NULL DEFAULT 'sonstige',
          datum               TEXT,
          arbeitgeber         TEXT,
          erstellt_am         TEXT NOT NULL DEFAULT (datetime('now')),
          zuletzt_geaendert   TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)

      // ── Werbungskosten / Ausgaben ────────────────────────────────────────────
      database.run(`
        CREATE TABLE IF NOT EXISTS ausgaben (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          steuerjahr_id       INTEGER NOT NULL REFERENCES steuerjahre(id),
          beschreibung        TEXT,
          betrag              REAL NOT NULL,
          kategorie           TEXT NOT NULL DEFAULT 'sonstige',
          datum               TEXT,
          abzugsfaehig        INTEGER NOT NULL DEFAULT 1,
          notiz               TEXT,
          erstellt_am         TEXT NOT NULL DEFAULT (datetime('now')),
          zuletzt_geaendert   TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)

      // ── Belege ───────────────────────────────────────────────────────────────
      database.run(`
        CREATE TABLE IF NOT EXISTS belege (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          steuerjahr_id       INTEGER NOT NULL REFERENCES steuerjahre(id),
          ausgabe_id          INTEGER REFERENCES ausgaben(id),
          dateiname           TEXT NOT NULL,
          dateipfad           TEXT NOT NULL,
          dateityp            TEXT,
          ocr_text            TEXT,
          ocr_betrag          REAL,
          ocr_datum           TEXT,
          ocr_haendler        TEXT,
          ocr_status          TEXT NOT NULL DEFAULT 'ausstehend',
          erstellt_am         TEXT NOT NULL DEFAULT (datetime('now')),
          zuletzt_geaendert   TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)

      // ── Wizard-Fortschritt ────────────────────────────────────────────────────
      database.run(`
        CREATE TABLE IF NOT EXISTS wizard_fortschritt (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          steuerjahr_id       INTEGER NOT NULL REFERENCES steuerjahre(id),
          schritt             INTEGER NOT NULL DEFAULT 0,
          daten               TEXT,
          abgeschlossen       INTEGER NOT NULL DEFAULT 0,
          erstellt_am         TEXT NOT NULL DEFAULT (datetime('now')),
          zuletzt_geaendert   TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)

      // ── Transaktionen (Bank-Importe, OCR-Extrakte) ─────────────────────────────
      database.run(`
        CREATE TABLE IF NOT EXISTS transaktionen (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          steuerjahr_id     INTEGER NOT NULL REFERENCES steuerjahre(id),
          datum             TEXT NOT NULL,
          betrag            REAL NOT NULL,
          typ               TEXT NOT NULL DEFAULT 'ausgabe',
          empfaenger        TEXT,
          verwendungszweck  TEXT,
          kategorie         TEXT NOT NULL DEFAULT 'sonstige',
          abzugsfaehig      INTEGER NOT NULL DEFAULT 0,
          notiz             TEXT,
          bank              TEXT,
          erstellt_am       TEXT NOT NULL DEFAULT (datetime('now')),
          zuletzt_geaendert TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)

      // ── Einstellungen ────────────────────────────────────────────────────────
      database.run(`
        CREATE TABLE IF NOT EXISTS einstellungen (
          schluessel          TEXT PRIMARY KEY,
          wert                TEXT,
          zuletzt_geaendert   TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)

      // ── Standarddaten: Steuerjahre mit bekannten Werten ─────────────────────
      database.run(`
        INSERT OR IGNORE INTO steuerjahre (jahr, grundfreibetrag, arbeitnehmer_pauschbetrag, aktiv)
        VALUES
          (2024, 11604.00, 1230.00, 0),
          (2025, 12096.00, 1230.00, 1)
      `, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  })
}

export async function closeDb() {
  if (!db) return
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) console.error('Fehler beim Schließen der DB:', err)
      db = null
      resolve()
    })
  })
}

export async function dbGet(sql, params = []) {
  if (!db) throw new Error('Datenbank nicht geöffnet.')
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err)
      resolve(row)
    })
  })
}

export async function dbAll(sql, params = []) {
  if (!db) throw new Error('Datenbank nicht geöffnet.')
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })
}

export async function dbRun(sql, params = []) {
  if (!db) throw new Error('Datenbank nicht geöffnet.')
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err)
      resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}
