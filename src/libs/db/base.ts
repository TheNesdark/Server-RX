import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { DB_PATH } from "@/config";

let db: Database.Database;

try {
  const resolvedDbPath = DB_PATH === ":memory:"
    ? DB_PATH
    : (path.isAbsolute(DB_PATH) ? DB_PATH : path.resolve(process.cwd(), DB_PATH));

  if (resolvedDbPath !== ":memory:") {
    const dbDir = path.dirname(resolvedDbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  console.log("Conectando base de datos en:", resolvedDbPath);

  db = new Database(resolvedDbPath);
    
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

    db.exec(`
      CREATE TABLE IF NOT EXISTS study_comments (
        study_id TEXT PRIMARY KEY,
        comment TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
} catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
}

export default db;
