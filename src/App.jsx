import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import LoginScreen from './screens/Login/LoginScreen.jsx'
import OnboardingScreen from './screens/Onboarding/OnboardingScreen.jsx'
import AppShell from './components/AppShell/AppShell.jsx'
import DashboardScreen from './screens/Dashboard/DashboardScreen.jsx'
import WizardScreen from './screens/Wizard/WizardScreen.jsx'
import BelegeScreen from './screens/Belege/BelegeScreen.jsx'
import UmsatzScreen from './screens/Umsatz/UmsatzScreen.jsx'

// Screens: 'login' | 'onboarding' | 'app'

function App() {
  const [screen, setScreen] = useState('login')
  const [activeNav, setActiveNav] = useState('dashboard')

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
        <AppShell
          key="app"
          activeScreen={activeNav}
          onNavigate={setActiveNav}
        >
          {({ nutzer, activeJahr }) => (
            <>
              {activeNav === 'dashboard' && (
                <DashboardScreen nutzer={nutzer} activeJahr={activeJahr} />
              )}
              {activeNav === 'wizard' && (
                <WizardScreen
                  nutzer={nutzer}
                  activeJahr={activeJahr}
                  onNavigateDashboard={() => setActiveNav('dashboard')}
                />
              )}
              {activeNav === 'belege' && (
                <BelegeScreen activeJahr={activeJahr} />
              )}
              {activeNav === 'umsatz' && (
                <UmsatzScreen activeJahr={activeJahr} />
              )}
            </>
          )}
        </AppShell>
      )}
    </AnimatePresence>
  )
}

export default App
