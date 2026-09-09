import { db, initDb } from './db.js'

// Reuse the existing SQLite connection so the dashboard and new API routes share one database.
initDb(false)
db.exec(`
  CREATE TABLE IF NOT EXISTS risk_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    rainfall REAL NOT NULL,
    slope REAL NOT NULL,
    elevation REAL,
    soil_condition TEXT NOT NULL,
    historical_risk REAL NOT NULL,
    risk_level TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    recommendation TEXT NOT NULL,
    is_demo_data INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

export { db }
export default db
