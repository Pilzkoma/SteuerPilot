# SteuerPilot iOS Handover

## Status Quo
- **Desktop (Electron):** Feature-complete (Login, Onboarding, Dashboard, Wizard, Belege/OCR, Umsatz, Optimierung, Jahresvergleich, PDF-Export, Einstellungen).
- **Engine:** 60/60 Tests green (Pure JS).
- **Design:** "The Financial Architect" (Midnight Navy/Amber), documented in `Design/` and `src/theme/tokens.js`.

## Zielsetzung iOS App
- **Technologie:** SwiftUI (iOS 17+), SQLCipher (Verschlüsselung), Swift (Native Engine).
- **Verzeichnis:** `/ios-app/`
- **Features:** 1:1 Parität zum Desktop, offline-fähig, WLAN-Sync mit Desktop.

## Architektur-Plan
1. **Data Layer:** `DatabaseManager.swift` mit SQLCipher (analog zu `electron/db.js`).
2. **Engine Layer:** Portierung von `src/engine/*.js` nach `SteuerEngine.swift`.
3. **Theme Layer:** `Theme.swift` mit Design-Tokens (Farben, Fonts, Spacing) aus `src/theme/tokens.js`.
4. **Views:**
    - `LoginView.swift`
    - `OnboardingView.swift`
    - `DashboardView.swift`
    - `WizardView.swift`
    - `BelegeView.swift`
    - `UmsatzView.swift`
    - `SettingsView.swift`
5. **Sync Layer:** Bonjour-basierter Sync (Peer-to-Peer).

## Nächste Schritte
1. Xcode-Projekt-Skelett in `/ios-app/` anlegen.
2. Swift-Paketabhängigkeiten (SQLCipher) definieren.
3. `Theme.swift` erstellen, um das Design-System abzubilden.
4. `LoginView` & `DatabaseManager` implementieren.
