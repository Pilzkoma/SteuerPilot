import SwiftUI

struct Theme {
    struct Colors {
        static let primary = Color(hex: "#adc8f5")
        static let onPrimary = Color(hex: "#0d2d4f")
        static let primaryContainer = Color(hex: "#1e3a5f")
        static let onPrimaryContainer = Color(hex: "#d3e4ff")
        
        static let secondary = Color(hex: "#ffb955")
        static let onSecondary = Color(hex: "#432b00")
        static let secondaryContainer = Color(hex: "#5f3f00")
        static let onSecondaryContainer = Color(hex: "#ffddb3")
        
        static let background = Color(hex: "#111125")
        static let onBackground = Color(hex: "#e3e2f4")
        
        static let surface = Color(hex: "#111125")
        static let surfaceContainerLowest = Color(hex: "#0b0b18")
        static let surfaceContainerLow = Color(hex: "#171728")
        static let surfaceContainer = Color(hex: "#1c1c30")
        static let surfaceContainerHigh = Color(hex: "#222238")
        static let surfaceContainerHighest = Color(hex: "#2a2a42")
        
        static let onSurface = Color(hex: "#e3e2f4")
        static let onSurfaceVariant = Color(hex: "#9b99b5")
        
        static let error = Color(hex: "#ff8a80")
        static let success = Color(hex: "#a8c7a0")
        static let warning = Color(hex: "#ffb955")
        static let info = Color(hex: "#adc8f5")
    }
    
    struct Typography {
        static func displayLg() -> Font { .system(size: 56, weight: .heavy, design: .default) }
        static func headlineLg() -> Font { .system(size: 28, weight: .bold, design: .default) }
        static func bodyMd() -> Font { .system(size: 15, weight: .regular, design: .default) }
        static func labelMd() -> Font { .system(size: 13, weight: .semibold, design: .default) }
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
