import Database from "better-sqlite3"
import path from "path";

let db: Database.Database;

try {
    // Use absolute path for better reliability across environments
    const dbPath = path.join(process.cwd(), "studies.db");
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