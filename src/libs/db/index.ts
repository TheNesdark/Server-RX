import Database from "better-sqlite3"
import path from "path";
import { fileURLToPath } from "url";

let db: Database.Database;

try {
    let dbPath: string;
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        // Ir hacia arriba desde src/libs/db hasta la raíz del proyecto
        dbPath = path.join(__dirname, '../../../', "studies.db");
    } catch (error) {
        // Fallback para entornos sin import.meta.url
        dbPath = path.join(process.cwd(), "studies.db");
    }
    db = new Database(dbPath);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS studies (
        id TEXT PRIMARY KEY,
        patient_name TEXT,
        patient_id TEXT,
        patient_sex TEXT,
        institution_name TEXT,
        study_date TEXT,
        description TEXT,
        json_completo TEXT
      )
    `);
} catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
}

export default db;