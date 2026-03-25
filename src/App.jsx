import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import LoginScreen from './screens/Login/LoginScreen.jsx'

// Screens werden hier nach und nach eingehängt.
// screen: 'login' | 'onboarding' | 'app'

function App() {
  const [screen, setScreen] = useState('login')

  return (
    <AnimatePresence mode="wait">
      {screen === 'login' && (
        <LoginScreen
          key="login"
          onUnlocked={() => setScreen('onboarding')}
        />
      )}

      {screen === 'onboarding' && (
        // Phase 2 — Platzhalter bis Onboarding gebaut ist
        <div key="onboarding" style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-background)',
          color: 'var(--color-on-surface-variant)',
          fontFamily: 'var(--font-family)',
          fontSize: '0.875rem'
        }}>
          Eingeloggt ✓ — Onboarding folgt in Phase 2
        </div>
      )}
    </AnimatePresence>
  )
}

export default App
