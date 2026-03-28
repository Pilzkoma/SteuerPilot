import Foundation

class SteuerEngine {
    static let shared = SteuerEngine()
    
    // Portierung der Logik aus src/engine/steuerberechnung.js
    func berechneSteuer(bruttoLohn: Double, werbungskosten: Double) -> Double {
        let grundfreibetrag = 12096.0 // 2025
        let steuerpflichtigesEinkommen = max(0, bruttoLohn - werbungskosten - grundfreibetrag)
        
        // Stark vereinfachte Steuerschätzung (analog zur Engine)
        if steuerpflichtigesEinkommen > 0 {
            return steuerpflichtigesEinkommen * 0.15 // Beispielhafter Satz
        }
        return 0
    }
}
