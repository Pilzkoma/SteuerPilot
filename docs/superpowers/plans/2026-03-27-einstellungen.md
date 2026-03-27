# Einstellungen Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen Einstellungen-Screen bauen mit Passwort-Wechsel (SQLCipher rekey), Jetson-Verbindungskonfiguration (URL + Token + Test) und einem Sync-Platzhalter.

**Architecture:** Vier neue IPC-Handler in `electron/main.js`, neue `rekeyDb()`-Funktion in `electron/db.js`, neue Bridge-Methoden im Preload, ein neuer React-Screen mit drei Card-Sections. Navigation in AppShell + App.jsx wired.

**Tech Stack:** React, Framer Motion, Electron IPC, SQLCipher (via db.js), fetch (Node 18+ / Electron built-in)

---

## File Map

| Datei | Aktion | Zweck |
|---|---|---|
| `electron/db.js` | Erweitern | `rekeyDb(newPassword)` export |
| `electron/main.js` | Erweitern | 4 neue IPC-Handler |
| `electron/preload/index.js` | Erweitern | Bridge-Methoden für neue Handler |
| `src/screens/Einstellungen/EinstellungenScreen.jsx` | Neu | Settings-Screen mit 3 Sections |
| `src/components/AppShell/AppShell.jsx` | Erweitern | `einstellungen` in BOTTOM_ITEMS auf `available: true` |
| `src/App.jsx` | Erweitern | Import + Rendering des neuen Screens |

---

## Task 1: `rekeyDb` in db.js + IPC-Handler in main.js + Preload

**Files:**
- Modify: `electron/db.js`
- Modify: `electron/main.js`
- Modify: `electron/preload/index.js`

- [ ] **Schritt 1: `rekeyDb` zu `electron/db.js` hinzufügen**

Am Ende der Datei (nach `dbRun`) einfügen:

```js
/**
 * Ändert das Datenbankpasswort (SQLCipher PRAGMA rekey).
 * Setzt das neue Passwort für alle zukünftigen DB-Öffnungen.
 */
export async function rekeyDb(neuesPasswort) {
  if (!db) throw new Error('Datenbank nicht geöffnet.')
  if (!neuesPasswort || neuesPasswort.trim() === '') {
    throw new Error('Passwort darf nicht leer sein.')
  }
  return new Promise((resolve, reject) => {
    db.run(`PRAGMA rekey = '${neuesPasswort.replace(/'/g, "''")}'`, (err) => {
      if (err) return reject(err)
      resolve({ ok: true })
    })
  })
}
```

- [ ] **Schritt 2: Import in `electron/main.js` erweitern**

Die bestehende Import-Zeile am Anfang von `electron/main.js`:

```js
import { initDb, closeDb, dbGet, dbAll, dbRun } from './db.js'
```

Ersetzen durch:

```js
import { initDb, closeDb, dbGet, dbAll, dbRun, rekeyDb } from './db.js'
```

- [ ] **Schritt 3: 4 IPC-Handler in `electron/main.js` einfügen**

Direkt vor der Zeile `// ── App Lifecycle` einfügen:

```js
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
```

- [ ] **Schritt 4: Bridge-Methoden in `electron/preload/index.js` hinzufügen**

Am Ende des `contextBridge.exposeInMainWorld`-Objekts, direkt vor der schließenden `})`:

```js
  // ── Einstellungen ──────────────────────────────────────────────────────────
  einstellungen: {
    get:  ()                    => ipcRenderer.invoke('einstellungen:get'),
    set:  (schluessel, wert)    => ipcRenderer.invoke('einstellungen:set', { schluessel, wert }),
  },

  // ── Jetson ─────────────────────────────────────────────────────────────────
  jetson: {
    test: (url, token) => ipcRenderer.invoke('jetson:test', url, token),
  },
```

Außerdem in der bestehenden `db:`-Sektion nach `rekey`-Methode suchen — falls noch nicht vorhanden, ergänzen:

```js
    rekey:  (neuesPasswort) => ipcRenderer.invoke('db:rekey', neuesPasswort),
```

- [ ] **Schritt 5: App starten und Console auf Fehler prüfen**

```bash
npm run dev
```

Erwartet: App startet ohne Fehler in der Konsole.

- [ ] **Schritt 6: Commit**

```bash
git add electron/db.js electron/main.js electron/preload/index.js
git commit -m "feat: add Einstellungen IPC handlers (rekey, einstellungen get/set, jetson test)"
```

---

## Task 2: EinstellungenScreen

**Files:**
- Create: `src/screens/Einstellungen/EinstellungenScreen.jsx`

- [ ] **Schritt 1: Screen-Datei anlegen**

```jsx
// src/screens/Einstellungen/EinstellungenScreen.jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { springGentle } from '../../theme/tokens.js'

// ── Shared Card-Wrapper ───────────────────────────────────────────────────────

function SettingsCard({ titel, beschreibung, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle}
      style={{
        background: 'var(--color-surface-container)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        marginBottom: '1rem'
      }}
    >
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{
          fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--color-secondary)',
          marginBottom: '0.25rem'
        }}>
          {titel}
        </div>
        {beschreibung && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
            {beschreibung}
          </div>
        )}
      </div>
      {children}
    </motion.div>
  )
}

// ── Shared Input ──────────────────────────────────────────────────────────────

function SettingsInput({ label, value, onChange, type = 'text', placeholder, showToggle, show, onToggle }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{
        display: 'block', fontSize: '0.75rem', fontWeight: 600,
        color: 'var(--color-on-surface-variant)', marginBottom: '0.375rem'
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={showToggle ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            background: 'var(--color-surface-container-high)',
            border: '1px solid var(--color-outline-variant)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.625rem 0.875rem',
            paddingRight: showToggle ? '2.5rem' : '0.875rem',
            fontFamily: 'var(--font-family)',
            fontSize: '0.875rem',
            color: 'var(--color-on-surface)',
            outline: 'none',
            boxSizing: 'border-box'
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-outline-variant)' }}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            style={{
              position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--color-on-surface-variant)', padding: '0.125rem',
              display: 'flex', alignItems: 'center'
            }}
          >
            {show ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ type, message }) {
  // type: 'success' | 'error'
  const isSuccess = type === 'success'
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={springGentle}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
        background: isSuccess ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
        color: isSuccess ? '#22c55e' : '#ef4444',
        borderRadius: 'var(--radius-pill)',
        padding: '0.25rem 0.75rem',
        fontSize: '0.75rem', fontWeight: 600,
        marginTop: '0.75rem'
      }}
    >
      <span>{isSuccess ? '✓' : '✕'}</span>
      {message}
    </motion.div>
  )
}

// ── Section: Passwort ─────────────────────────────────────────────────────────

function PasswortSection() {
  const [passwort, setPasswort] = useState('')
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState(null) // null | 'success' | 'error'
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRekey() {
    if (!passwort.trim()) {
      setStatus('error')
      setMsg('Bitte ein neues Passwort eingeben.')
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const result = await window.steuerpilot.db.rekey(passwort)
      if (result?.ok) {
        setStatus('success')
        setMsg('Passwort wurde geändert.')
        setPasswort('')
        setTimeout(() => setStatus(null), 3000)
      } else {
        setStatus('error')
        setMsg(result?.fehler ?? 'Fehler beim Ändern des Passworts.')
      }
    } catch (err) {
      setStatus('error')
      setMsg(err.message ?? 'Unbekannter Fehler.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SettingsCard
      titel="Passwort ändern"
      beschreibung="Das Passwort verschlüsselt deine Steuerdaten. Merke es gut — es gibt keine Wiederherstellung."
    >
      <SettingsInput
        label="Neues Passwort"
        value={passwort}
        onChange={setPasswort}
        placeholder="Neues Passwort eingeben"
        showToggle
        show={show}
        onToggle={() => setShow(v => !v)}
      />
      <button
        onClick={handleRekey}
        disabled={loading}
        style={{
          background: 'var(--color-primary)',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          padding: '0.625rem 1.25rem',
          cursor: loading ? 'default' : 'pointer',
          fontFamily: 'var(--font-family)',
          color: 'white', fontSize: '0.875rem', fontWeight: 600,
          opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s'
        }}
      >
        {loading ? 'Wird geändert…' : 'Passwort ändern'}
      </button>
      <AnimatePresence>
        {status && <StatusBadge type={status} message={msg} />}
      </AnimatePresence>
    </SettingsCard>
  )
}

// ── Section: Jetson ───────────────────────────────────────────────────────────

function JetsonSection() {
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'success' | 'error'
  const [testStatus, setTestStatus] = useState(null) // null | 'testing' | { ok, modelle, fehler }
  const [savePending, setSavePending] = useState(false)

  useEffect(() => {
    async function laden() {
      try {
        const einst = await window.steuerpilot.einstellungen.get()
        if (einst.jetson_url) setUrl(einst.jetson_url)
        if (einst.jetson_token) setToken(einst.jetson_token)
      } catch (err) {
        console.error('Jetson-Einstellungen laden:', err)
      }
    }
    laden()
  }, [])

  async function handleSpeichern() {
    setSavePending(true)
    setSaveStatus(null)
    try {
      await window.steuerpilot.einstellungen.set('jetson_url', url)
      await window.steuerpilot.einstellungen.set('jetson_token', token)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (err) {
      setSaveStatus('error')
    } finally {
      setSavePending(false)
    }
  }

  async function handleTest() {
    setTestStatus('testing')
    try {
      const result = await window.steuerpilot.jetson.test(url, token)
      setTestStatus(result)
    } catch (err) {
      setTestStatus({ ok: false, fehler: err.message ?? 'Verbindungsfehler.' })
    }
  }

  const testBadgeType = testStatus && testStatus !== 'testing'
    ? (testStatus.ok ? 'success' : 'error')
    : null

  const testBadgeMsg = testStatus && testStatus !== 'testing'
    ? (testStatus.ok
        ? `Verbunden — ${testStatus.modelle?.length ? testStatus.modelle.join(', ') : 'keine Modelle gefunden'}`
        : testStatus.fehler)
    : null

  return (
    <SettingsCard
      titel="Jetson-Verbindung"
      beschreibung="Dein Heimserver für OCR und KI-Analyse. Wird für automatische Belegerfassung verwendet."
    >
      <SettingsInput
        label="URL"
        value={url}
        onChange={setUrl}
        placeholder="http://192.168.1.100:11434"
        type="text"
      />
      <SettingsInput
        label="Token"
        value={token}
        onChange={setToken}
        placeholder="Bearer-Token (optional)"
        showToggle
        show={showToken}
        onToggle={() => setShowToken(v => !v)}
      />
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={handleSpeichern}
          disabled={savePending}
          style={{
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            padding: '0.625rem 1.25rem',
            cursor: savePending ? 'default' : 'pointer',
            fontFamily: 'var(--font-family)',
            color: 'white', fontSize: '0.875rem', fontWeight: 600,
            opacity: savePending ? 0.6 : 1, transition: 'opacity 0.15s'
          }}
        >
          {savePending ? 'Wird gespeichert…' : 'Speichern'}
        </button>
        <button
          onClick={handleTest}
          disabled={testStatus === 'testing' || !url.trim()}
          style={{
            background: 'var(--color-surface-container-high)',
            border: '1px solid var(--color-outline-variant)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.625rem 1.25rem',
            cursor: (testStatus === 'testing' || !url.trim()) ? 'default' : 'pointer',
            fontFamily: 'var(--font-family)',
            color: 'var(--color-on-surface)', fontSize: '0.875rem', fontWeight: 500,
            opacity: (!url.trim()) ? 0.5 : 1, transition: 'opacity 0.15s'
          }}
        >
          {testStatus === 'testing' ? 'Teste…' : 'Verbindung testen'}
        </button>
      </div>
      <AnimatePresence>
        {saveStatus && <StatusBadge type={saveStatus} message={saveStatus === 'success' ? 'Gespeichert.' : 'Fehler beim Speichern.'} />}
      </AnimatePresence>
      <AnimatePresence>
        {testBadgeType && <StatusBadge type={testBadgeType} message={testBadgeMsg} />}
      </AnimatePresence>
    </SettingsCard>
  )
}

// ── Section: Sync (Platzhalter) ───────────────────────────────────────────────

function SyncSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springGentle, delay: 0.1 }}
      style={{
        background: 'var(--color-surface-container)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        marginBottom: '1rem',
        display: 'flex', alignItems: 'center', gap: '1.25rem'
      }}
    >
      <div style={{
        width: 44, height: 44, flexShrink: 0,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface-container-high)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-outline)'
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M1 20v-6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '0.875rem', fontWeight: 600,
          color: 'var(--color-on-surface)', marginBottom: '0.25rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          iOS-Synchronisation
          <span style={{
            fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--color-outline)',
            background: 'var(--color-surface-container-high)',
            padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-pill)'
          }}>Bald</span>
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
          Wird mit der iOS-App aktiviert. Beide Geräte synchronisieren automatisch im selben WLAN.
        </div>
      </div>
    </motion.div>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EinstellungenScreen() {
  return (
    <div style={{ padding: '2.5rem', maxWidth: 680, margin: '0 auto' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springGentle, delay: 0.05 }}
        style={{ marginBottom: '2rem' }}
      >
        <div style={{
          fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--color-secondary)', marginBottom: '0.375rem'
        }}>
          Einstellungen
        </div>
        <h1 style={{
          fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em',
          color: 'var(--color-on-surface)', lineHeight: 1.15
        }}>
          App konfigurieren
        </h1>
      </motion.div>

      <PasswortSection />
      <JetsonSection />
      <SyncSection />
    </div>
  )
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/screens/Einstellungen/EinstellungenScreen.jsx
git commit -m "feat: add EinstellungenScreen with password, Jetson, and sync sections"
```

---

## Task 3: Navigation wiring

**Files:**
- Modify: `src/components/AppShell/AppShell.jsx`
- Modify: `src/App.jsx`

- [ ] **Schritt 1: `einstellungen` in BOTTOM_ITEMS auf `available: true` setzen**

In `AppShell.jsx`, die `BOTTOM_ITEMS`-Zeile:

```js
const BOTTOM_ITEMS = [
  { id: 'einstellungen', label: 'Einstellungen', icon: <IconSettings />, available: false },
]
```

Ersetzen durch:

```js
const BOTTOM_ITEMS = [
  { id: 'einstellungen', label: 'Einstellungen', icon: <IconSettings />, available: true },
]
```

- [ ] **Schritt 2: Import in `App.jsx` ergänzen**

```js
import EinstellungenScreen from './screens/Einstellungen/EinstellungenScreen.jsx'
```

- [ ] **Schritt 3: Screen in `App.jsx` einbinden**

Nach dem `jahresvergleich`-Block:

```jsx
{activeNav === 'einstellungen' && (
  <EinstellungenScreen />
)}
```

- [ ] **Schritt 4: App vollständig testen**

```bash
npm run dev
```

Prüfen:
- "Einstellungen" erscheint in der Sidebar (unten, ohne "Bald"-Badge)
- Screen öffnet sich korrekt
- Passwort-Section: Neues Passwort eingeben → "Passwort wurde geändert" erscheint, verschwindet nach 3s
- Passwort-Änderung persistiert: App neu starten, altes Passwort schlägt fehl, neues funktioniert
- Jetson-Section: URL + Token eingeben → Speichern → App neu starten → Werte sind vorgeladen
- Jetson-Test mit ungültiger URL: rote Badge "Timeout — Jetson nicht erreichbar"
- Sync-Section: Platzhalter mit "Bald"-Badge sichtbar, kein Button

- [ ] **Schritt 5: Tests ausführen**

```bash
npm test
```

Erwartet: Alle 60 bestehenden Tests grün (keine neuen Engine-Tests nötig)

- [ ] **Schritt 6: Commit**

```bash
git add src/components/AppShell/AppShell.jsx src/App.jsx
git commit -m "feat: wire EinstellungenScreen into navigation"
```

---

## Task 4: Logbuch + CLAUDE.md

**Files:**
- Modify: `docs/LOGBUCH.md`
- Modify: `CLAUDE.md`

- [ ] **Schritt 1: Logbucheintrag schreiben**

In `docs/LOGBUCH.md` oben einfügen (nach der ersten `---`-Zeile):

```markdown
## 2026-03-27 — Phase 11: Einstellungen

### Was wurde gebaut

**EinstellungenScreen (`src/screens/Einstellungen/EinstellungenScreen.jsx`):**
- Passwort-Sektion: SQLCipher `PRAGMA rekey` — Passwort ändern ohne App-Neustart, Erfolgs-Badge verschwindet nach 3s
- Jetson-Sektion: URL + Token konfigurieren, getrennte "Speichern"- und "Verbindung testen"-Buttons
  - Test ruft `/api/tags` (Ollama-kompatibel) auf, zeigt verbundene Modelle bei Erfolg
  - Timeout nach 5s, spezifische Fehlermeldungen (401, Timeout, Netzwerkfehler)
  - Beim Screen-Load: gespeicherte Werte aus `einstellungen`-Tabelle vorgeladen
- Sync-Sektion: Platzhalter mit "Bald"-Badge — wird mit iOS-App aktiviert

**Neue IPC-Handler (`electron/main.js`):**
- `einstellungen:get` — alle Schlüssel als Key-Value-Map
- `einstellungen:set` — einzelnen Schlüssel schreiben (INSERT OR REPLACE)
- `db:rekey` — SQLCipher PRAGMA rekey mit Fehlerbehandlung
- `jetson:test` — HTTP-Test gegen Ollama `/api/tags`, 5s Timeout

**`rekeyDb()` in `electron/db.js`:** Neue Export-Funktion für Passwort-Wechsel.

### Entscheidungen

- Speichern und Testen sind getrennte Aktionen — Nutzer kann testen ohne zu speichern (und umgekehrt)
- `PRAGMA rekey` lässt sich nicht mit Bound Parameters aufrufen — einfaches Escaping (`replace(/'/g, "''")`) wie beim initialen `PRAGMA key`
- Token-Feld masked per default (type=password), toggle-Icon zum Einblenden

### Offene Punkte

- Sync-Sektion wird mit der iOS-App implementiert
```

- [ ] **Schritt 2: CLAUDE.md Nächste Schritte aktualisieren**

In `CLAUDE.md` unter "Nächste Schritte" `Einstellungen` als erledigt markieren und iOS als nächsten Schritt hervorheben:

```markdown
## Nächste Schritte (Reihenfolge)

1. **iOS App** — NUR nach expliziter Rückfrage beim User

### Bereits erledigt
- ✅ Einstellungen (Phase 11): Passwort ändern, Jetson-Verbindung, Sync-Platzhalter
- ✅ Jahresübernahme & Vergleich Tasks 1–9: Engine, IPC-Handler, JahrSelector UI, Auto-Jahresanlage, JahresübernahmeModal, Wizard-Button, JahresvergleichWidget, JahresvergleichScreen, Navigation
[... restliche erledigte Punkte unverändert ...]
```

- [ ] **Schritt 3: Commit**

```bash
git add docs/LOGBUCH.md CLAUDE.md
git commit -m "docs: update Logbuch and CLAUDE.md for Einstellungen phase"
```
