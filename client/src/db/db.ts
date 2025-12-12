import Database from "better-sqlite3"

const db = new Database("./studies.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS estudios (
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

export default db;