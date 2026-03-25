import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'

// Screens werden hier eingehängt sobald sie gebaut sind
// Phase 0: Platzhalter — zeigt dass das Fundament steht

function App() {
  const [screen, setScreen] = useState('login') // 'login' | 'onboarding' | 'app'

  return (
    <AnimatePresence mode="wait">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-background)',
        color: 'var(--color-on-surface-variant)',
        fontFamily: 'var(--font-family)',
        fontSize: '0.875rem'
      }}>
        SteuerPilot — Fundament steht ✓
      </div>
    </AnimatePresence>
  )
}

export default App
