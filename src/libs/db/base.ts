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
    db.pragma('foreign_keys = ON');

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
      CREATE TABLE IF NOT EXISTS series (
        id TEXT PRIMARY KEY,
        study_id TEXT,
        series_number TEXT,
        modality TEXT,
        json_completo TEXT,
        FOREIGN KEY (study_id) REFERENCES studies(id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS instances (
        id TEXT PRIMARY KEY,
        series_id TEXT,
        study_id TEXT,
        instance_number TEXT,
        json_completo TEXT,
        FOREIGN KEY (study_id) REFERENCES studies(id) ON DELETE CASCADE,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
      )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_series_study ON series(study_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_instances_series ON instances(series_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_instances_study ON instances(study_id)`);

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

    // Migraciones rápidas
    try { db.exec("ALTER TABLE series ADD COLUMN json_completo TEXT"); } catch(e) {}
    try { db.exec("ALTER TABLE instances ADD COLUMN json_completo TEXT"); } catch(e) {}
} catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
}

export default db;
