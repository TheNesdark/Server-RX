import Database from "better-sqlite3";
import { DB_PATH } from "@/config";

let db: Database.Database;

try {
    console.log("Conectando base de datos en:", DB_PATH);
    
    db = new Database(DB_PATH);
    
    // Configuración recomendada para mejor rendimiento en SQLite
    db.pragma('journal_mode = WAL');

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