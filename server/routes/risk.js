import { Router } from 'express'
import { db } from '../database.js'

const router = Router()
const VALID_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// Transparent demo rules. Replace input values with calibrated sensor/IMD values in production.
export function calculateRuleRisk({ rainfall, slope, elevation, soilCondition, historicalRisk }) {
  const soil = number(soilCondition, 50)
  const history = number(historicalRisk, 30)
  const rainScore = Math.min(100, rainfall * 0.55)
  const slopeScore = Math.min(100, Math.max(0, (slope - 15) * 2.2))
  const elevationScore = Math.min(100, Math.max(0, (elevation - 500) / 25))
  const score = Math.round(Math.min(100, rainScore * 0.42 + slopeScore * 0.28 + soil * 0.2 + history * 0.1 + elevationScore * 0.05))
  const riskLevel = score >= 85 || (rainfall > 80 && soil > 85 && slope > 35) ? 'CRITICAL' : score >= 65 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW'
  const recommendation = riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
    ? 'Avoid travel through high-risk slopes during heavy rainfall.'
    : riskLevel === 'MEDIUM'
      ? 'Stay alert, monitor rainfall and avoid exposed slope edges.'
      : 'Continue normal monitoring and keep drainage pathways clear.'
  return { riskLevel, riskScore: score, recommendation }
}

function normalizeLocation(location) {
  return String(location || '').trim().toLowerCase()
}

function locationFromDatabase(name) {
  return db.prepare(`SELECT * FROM locations WHERE lower(name) = ? OR lower(id) = ? LIMIT 1`).get(normalizeLocation(name), normalizeLocation(name))
}

function output(row) {
  return {
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    riskLevel: row.risk_level,
    riskScore: row.risk_score,
    rainfall: row.rainfall,
    slope: row.slope,
    elevation: row.elevation,
    soilCondition: row.soil_condition,
    historicalRisk: row.historical_risk,
    recommendation: row.recommendation,
    demoData: Boolean(row.is_demo_data),
    createdAt: row.created_at,
  }
}

router.get('/', (req, res) => {
  try {
    const requested = req.query.location
    if (!requested) return res.status(400).json({ success: false, error: 'location query parameter is required.' })
    const row = db.prepare(`SELECT * FROM risk_results WHERE lower(location) = ? ORDER BY id DESC LIMIT 1`).get(normalizeLocation(requested))
    if (row) return res.json({ success: true, data: output(row) })

    // Seeded locations have a current demo risk even before the first live reading.
    const seeded = locationFromDatabase(requested)
    if (!seeded) return res.status(404).json({ success: false, error: `Unknown monitored location: ${requested}.` })
    const seededRisk = {
      location: seeded.name,
      latitude: seeded.lat,
      longitude: seeded.lng,
      riskLevel: seeded.risk_level || 'LOW',
      riskScore: seeded.last_score || 20,
      rainfall: seeded.last_rainfall || 0,
      slope: seeded.slope,
      elevation: seeded.elevation,
      soilCondition: `DEMO DATA: ${seeded.demo_soil}% saturation`,
      historicalRisk: Math.min(100, (seeded.historical_events || 0) * 5),
      recommendation: seeded.risk_level === 'HIGH' || seeded.risk_level === 'CRITICAL'
        ? 'Avoid travel through high-risk slopes during heavy rainfall.'
        : 'Continue normal monitoring and keep drainage pathways clear.',
      demoData: true,
    }
    res.json({ success: true, data: seededRisk })
  } catch (error) {
    console.error('GET /api/risk failed:', error.message)
    res.status(500).json({ success: false, error: 'Unable to load risk information.' })
  }
})

router.post('/', (req, res) => {
  try {
    const body = req.body || {}
    if (!body.location || String(body.location).trim().length < 2) return res.status(400).json({ success: false, error: 'A valid location is required.' })
    const location = locationFromDatabase(body.location)
    const rainfall = number(body.rainfall)
    const slope = number(body.slope, location?.slope)
    const elevation = number(body.elevation, location?.elevation || 1500)
    const soilCondition = number(body.soilCondition ?? body.soilMoisture, location?.demo_soil || 50)
    const historicalRisk = number(body.historicalRisk, location?.historical_events ? Math.min(100, location.historical_events * 5) : 30)
    if (rainfall < 0 || rainfall > 1000 || slope < 0 || slope > 90 || soilCondition < 0 || soilCondition > 100) return res.status(400).json({ success: false, error: 'rainfall, slope and soil condition values are outside valid ranges.' })
    const calculated = calculateRuleRisk({ rainfall, slope, elevation, soilCondition, historicalRisk })
    const record = { location: location?.name || String(body.location).trim(), latitude: number(body.latitude, location?.lat), longitude: number(body.longitude, location?.lng), rainfall, slope, elevation, soilCondition: `DEMO DATA: ${soilCondition}% saturation`, historicalRisk, ...calculated }
    db.prepare(`INSERT INTO risk_results (location, latitude, longitude, rainfall, slope, elevation, soil_condition, historical_risk, risk_level, risk_score, recommendation, is_demo_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(record.location, record.latitude, record.longitude, record.rainfall, record.slope, record.elevation, record.soilCondition, record.historicalRisk, record.riskLevel, record.riskScore, record.recommendation)
    db.prepare(`UPDATE locations SET risk_level = ?, last_score = ?, last_rainfall = ?, last_checked = datetime('now') WHERE lower(name) = ? OR lower(id) = ?`).run(record.riskLevel, record.riskScore, record.rainfall, normalizeLocation(body.location), normalizeLocation(body.location))
    res.status(201).json({ success: true, data: record })
  } catch (error) {
    console.error('POST /api/risk failed:', error.message)
    res.status(500).json({ success: false, error: 'Unable to calculate and store risk result.' })
  }
})

export default router
