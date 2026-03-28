import SwiftUI

struct LoginView: View {
    @State private var password = ""
    @State private var isCreating = false
    @State private var confirmPassword = ""
    @State private var showError = false
    @State private var errorMessage = ""
    
    var body: some View {
        ZStack {
            Theme.Colors.background.ignoresSafeArea()
            
            VStack(spacing: 40) {
                // Brand Section
                VStack(spacing: 12) {
                    Text("SteuerPilot")
                        .font(Theme.Typography.displayLg())
                        .foregroundColor(Theme.Colors.primary)
                    
                    Text("Dein finanzieller Navigator.")
                        .font(Theme.Typography.bodyMd())
                        .foregroundColor(Theme.Colors.onSurfaceVariant)
                }
                .padding(.top, 60)
                
                // Form Section
                VStack(spacing: 24) {
                    Text(isCreating ? "Ersteinrichtung" : "Willkommen zurück")
                        .font(Theme.Typography.headlineLg())
                        .foregroundColor(Theme.Colors.onSurface)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Passwort")
                            .font(Theme.Typography.labelMd())
                            .foregroundColor(Theme.Colors.onSurfaceVariant)
                        
                        SecureField("", text: $password)
                            .padding()
                            .background(Theme.Colors.surfaceContainer)
                            .cornerRadius(12)
                            .foregroundColor(Theme.Colors.onSurface)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Theme.Colors.primary.opacity(0.3), lineWidth: 1)
                            )
                    }
                    
                    if isCreating {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Passwort bestätigen")
                                .font(Theme.Typography.labelMd())
                                .foregroundColor(Theme.Colors.onSurfaceVariant)
                            
                            SecureField("", text: $confirmPassword)
                                .padding()
                                .background(Theme.Colors.surfaceContainer)
                                .cornerRadius(12)
                                .foregroundColor(Theme.Colors.onSurface)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Theme.Colors.primary.opacity(0.3), lineWidth: 1)
                                )
                        }
                    }
                    
                    Button(action: handleAction) {
                        Text(isCreating ? "Konto erstellen" : "Anmelden")
                            .font(Theme.Typography.labelMd())
                            .foregroundColor(Theme.Colors.onSecondary)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Theme.Colors.secondary)
                            .cornerRadius(100)
                    }
                    .padding(.top, 12)
                }
                .padding(32)
                .background(Theme.Colors.surfaceContainerLow)
                .cornerRadius(24)
                .padding(.horizontal, 24)
                
                Spacer()
                
                if !isCreating {
                    Button("Noch kein Konto? Erstellen") {
                        withAnimation { isCreating = true }
                    }
                    .font(Theme.Typography.labelMd())
                    .foregroundColor(Theme.Colors.primary)
                }
            }
        }
    }
    
    private func handleAction() {
        // TODO: Database logic
    }
}

#Preview {
    LoginView()
}
