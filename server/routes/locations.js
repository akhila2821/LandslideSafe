import { Router } from 'express'
import { db } from '../database.js'

const router = Router()

router.get('/', (_req, res) => {
  try {
    const locations = db.prepare(`
      SELECT id, name, state, district, lat, lng, elevation, slope,
             demo_soil, risk_level, last_score, last_rainfall, last_checked
      FROM locations
      ORDER BY state ASC, name ASC
    `).all()
    res.json({ success: true, data: locations, demoData: true })
  } catch (error) {
    console.error('GET /api/locations failed:', error.message)
    res.status(500).json({ success: false, error: 'Unable to load monitored locations.' })
  }
})

export default router
