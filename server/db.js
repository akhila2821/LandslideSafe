import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'landslidesafe.db');

export const db = new DatabaseSync(dbPath);

export function initDb(dropExisting = false) {
  if (dropExisting) {
    db.exec(`
      DROP TABLE IF EXISTS locations;
      DROP TABLE IF EXISTS hazard_zones;
      DROP TABLE IF EXISTS readings;
      DROP TABLE IF EXISTS alerts;
      DROP TABLE IF EXISTS field_reports;
      DROP TABLE IF EXISTS subscribers;
      DROP TABLE IF EXISTS sensors;
      DROP TABLE IF EXISTS shelters;
      DROP TABLE IF EXISTS ai_predictions;
      DROP TABLE IF EXISTS user_settings;
    `);
  }

  // Initialize comprehensive schema for LandslideSafe
  db.exec(`
  CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    district TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    elevation REAL DEFAULT 1500,
    slope REAL NOT NULL,
    demo_soil REAL NOT NULL,
    lithology TEXT DEFAULT 'Weathered Phyllite & Schist',
    vegetation_index REAL DEFAULT 0.65,
    population_at_risk INTEGER DEFAULT 15000,
    historical_events INTEGER DEFAULT 3,
    risk_level TEXT DEFAULT 'LOW',
    last_score INTEGER DEFAULT 20,
    last_rainfall REAL DEFAULT 0,
    last_checked TEXT,
    is_hazard_hotspot INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS hazard_zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    radius_meters REAL NOT NULL,
    hazard_level TEXT NOT NULL,
    slope REAL NOT NULL,
    soil_saturation REAL NOT NULL,
    rainfall_threshold REAL NOT NULL,
    danger_description TEXT NOT NULL,
    precautions_json TEXT NOT NULL,
    evacuation_route TEXT,
    emergency_contact TEXT,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id TEXT NOT NULL,
    location_name TEXT NOT NULL,
    rainfall REAL NOT NULL,
    soil REAL NOT NULL,
    slope REAL NOT NULL,
    pore_pressure REAL DEFAULT 24.5,
    slope_tilt REAL DEFAULT 0.05,
    temperature REAL,
    humidity REAL,
    risk TEXT NOT NULL,
    score INTEGER NOT NULL,
    source TEXT NOT NULL,
    condition TEXT NOT NULL,
    checked_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id TEXT NOT NULL,
    location_name TEXT NOT NULL,
    risk TEXT NOT NULL,
    message TEXT NOT NULL,
    sms_dispatched_count INTEGER DEFAULT 0,
    channels TEXT DEFAULT 'SIREN,SMS,APP',
    automatic INTEGER DEFAULT 0,
    checked_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS field_reports (
    id TEXT PRIMARY KEY,
    reporter_name TEXT NOT NULL,
    reporter_phone TEXT,
    reporter_role TEXT DEFAULT 'Citizen',
    location_name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    status TEXT DEFAULT 'PENDING',
    verified_by TEXT,
    is_offline_synced INTEGER DEFAULT 0,
    reported_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    role TEXT DEFAULT 'Resident',
    preferred_channel TEXT DEFAULT 'SMS',
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sensors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location_id TEXT NOT NULL,
    location_name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    sensor_type TEXT NOT NULL,
    current_value REAL NOT NULL,
    unit TEXT NOT NULL,
    battery_level INTEGER DEFAULT 95,
    signal_strength INTEGER DEFAULT 88,
    status TEXT DEFAULT 'ONLINE',
    last_telemetry TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shelters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    elevation REAL NOT NULL,
    capacity INTEGER NOT NULL,
    supplies_status TEXT DEFAULT 'ADEQUATE',
    contact_person TEXT,
    contact_phone TEXT,
    facilities TEXT
  );

  CREATE TABLE IF NOT EXISTS ai_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id TEXT NOT NULL,
    location_name TEXT NOT NULL,
    probability REAL NOT NULL,
    factor_of_safety REAL NOT NULL,
    risk_level TEXT NOT NULL,
    peak_danger_window TEXT,
    primary_driver TEXT,
    confidence_score REAL,
    features_json TEXT,
    forecast_curve_json TEXT,
    calculated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `);
}

// Ensure tables exist on import
initDb(false);

export default db;
