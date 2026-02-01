import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

let db: Database.Database;

try {
    let dbPath;

    const isCompiled = !import.meta.url.includes('src'); 

    if (isCompiled) {
        // Si es el .exe, ponemos la DB justo al lado del archivo ejecutable
        const exeDir = path.dirname(process.execPath);
        dbPath = path.join(exeDir, "studies.db");
    } else {
        // Si es desarrollo, usamos la ruta relativa tradicional
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        // Ajusta los ../ según qué tan profundo esté este archivo en src/
        dbPath = path.join(__dirname, "../../", "studies.db"); 
    }

    console.log("Conectando base de datos en:", dbPath);
    
    db = new Database(dbPath);
    
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