import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import LoginScreen from './screens/Login/LoginScreen.jsx'
import OnboardingScreen from './screens/Onboarding/OnboardingScreen.jsx'

// Screens werden hier nach und nach eingehängt.
// screen: 'loading' | 'login' | 'onboarding' | 'app'

function App() {
  const [screen, setScreen] = useState('login')

  // Nach dem Login: prüfen ob Onboarding bereits abgeschlossen
  async function handleUnlocked() {
    try {
      const row = await window.steuerpilot.db.get(
        "SELECT wert FROM einstellungen WHERE schluessel = 'onboarding_abgeschlossen'",
        []
      )
      if (row?.wert === '1') {
        setScreen('app')
      } else {
        setScreen('onboarding')
      }
    } catch {
      setScreen('onboarding')
    }
  }

  return (
    <AnimatePresence mode="wait">
      {screen === 'login' && (
        <LoginScreen
          key="login"
          onUnlocked={handleUnlocked}
        />
      )}

      {screen === 'onboarding' && (
        <OnboardingScreen
          key="onboarding"
          onCompleted={() => setScreen('app')}
        />
      )}

      {screen === 'app' && (
        // Phase 3 — Dashboard folgt
        <div key="app" style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-background)',
          color: 'var(--color-on-surface-variant)',
          fontFamily: 'var(--font-family)',
          fontSize: '0.875rem'
        }}>
          Onboarding abgeschlossen ✓ — Dashboard folgt in Phase 3
        </div>
      )}
    </AnimatePresence>
  )
}

export default App
