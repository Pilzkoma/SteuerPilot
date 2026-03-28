import Foundation
// import SQLite3 // Hier wird SQLCipher über das Swift Package eingebunden

class DatabaseManager {
    static let shared = DatabaseManager()
    private var db: OpaquePointer?
    
    private init() {
        // Initialisierung erfolgt beim ersten Zugriff
    }
    
    func openDatabase(password: String) -> Bool {
        let fileURL = try! FileManager.default
            .url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
            .appendingPathComponent("steuerpilot.db")
        
        // sqlite3_open_v2(fileURL.path, &db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, nil)
        // PRAGMA key = 'password'
        
        print("Database opening attempt at: \(fileURL.path)")
        return true
    }
    
    func setupSchema() {
        let schema = """
        CREATE TABLE IF NOT EXISTS nutzer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vorname TEXT,
            nachname TEXT,
            steuer_id TEXT,
            finanzamt TEXT,
            nutzertyp TEXT
        );
        -- Weitere Tabellen aus electron/db.js portieren
        """
        // sqlite3_exec(db, schema, nil, nil, nil)
    }
}
