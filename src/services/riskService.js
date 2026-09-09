const WEATHER_URL = import.meta.env.VITE_WEATHER_URL || 'https://api.open-meteo.com/v1/forecast';
const sensorUrl = import.meta.env.VITE_SENSOR_API_URL || '';
import { apiUrl } from './api';

export const riskFor = ({ rainfall, soil, slope }) => {
  if (rainfall > 110 && soil > 90 && slope > 40) return 'CRITICAL';
  if (rainfall > 80 && soil > 85 && slope > 35) return 'HIGH';
  if (rainfall > 45 || soil > 65 || slope > 32) return 'MEDIUM';
  return 'LOW';
};

export const scoreFor = (risk) => ({ LOW: 22, MEDIUM: 56, HIGH: 82, CRITICAL: 96 })[risk];

// 1. Fetch live reading and persist to SQLite backend
export async function getLocationReading(location, signal, isAutomatic = false) {
  try {
    const res = await fetch(apiUrl('/api/check-risk'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: location.id,
        locationName: location.name,
        lat: location.lat,
        lng: location.lng,
        slope: location.slope,
        demoSoil: location.demoSoil ?? location.demo_soil,
        state: location.state,
        isAutomatic
      }),
      signal
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Backend /api/check-risk error, falling back to local computation:', err.message);
  }

  // Fallback direct weather query
  const url = new URL(WEATHER_URL);
  url.searchParams.set('latitude', location.lat);
  url.searchParams.set('longitude', location.lng);
  url.searchParams.set('current', 'precipitation,temperature_2m,relative_humidity_2m');
  url.searchParams.set('hourly', 'precipitation');
  url.searchParams.set('past_days', '1');
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('timezone', 'auto');

  try {
    const response = await fetch(url.toString(), { signal });
    if (response.ok) {
      const data = await response.json();
      const rainfall = Number(data.current?.precipitation ?? 0);
      const temperature = data.current?.temperature_2m;
      const humidity = data.current?.relative_humidity_2m;
      const soil = location.demoSoil ?? location.demo_soil ?? 70;
      const reading = {
        rainfall,
        soil,
        slope: location.slope,
        temperature,
        humidity,
        condition: rainfall > 10 ? 'Torrential rain' : rainfall > 0 ? 'Light rain' : 'Conditions stable'
      };
      const risk = riskFor(reading);
      return {
        ...reading,
        risk,
        score: scoreFor(risk),
        source: 'IMD & Open-Meteo Gateway (Direct)',
        precautions:
          risk === 'CRITICAL' || risk === 'HIGH'
            ? [
                '🔴 IMMEDIATE EVACUATION: Evacuate slope-toe settlements within warning zone.',
                '⛔ CEASE TRAVEL: Fragile mountain corridors and bypasses closed.',
                '🌊 MONITOR STREAMS: Watch for sudden muddy surges or clogged debris.',
                '📞 EMERGENCY HOTLINE: Dial 112 or NDRF 1078 immediately.'
              ]
            : ['🟢 Normal monitoring active. No evacuation required.']
      };
    }
  } catch (e) {
    console.warn('Weather fallback query failed:', e.message);
  }

  // Pure offline fallback
  return {
    rainfall: 12,
    soil: location.demoSoil ?? location.demo_soil ?? 65,
    slope: location.slope,
    temperature: 21,
    humidity: 75,
    condition: 'Offline cached telemetry',
    risk: location.risk_level || 'LOW',
    score: location.last_score || 25,
    source: 'Offline Local Telemetry Cache',
    precautions: ['Maintain vigilance and clear stormwater pathways.']
  };
}

// 2. Fetch AI/ML Geotechnical Risk Prediction & 48h Trajectory
export async function fetchAiPrediction(params) {
  try {
    const res = await fetch(apiUrl('/api/predict'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.warn('Backend /api/predict unreachable, computing client surrogate:', err.message);
  }

  // Client surrogate for AI calculation if offline
  const slope = params.slope || 35;
  const soil = params.soilSaturation || 70;
  const rain = params.rainfall || 20;
  const fos = Math.max(0.6, Number((2.8 - (slope / 45) * 1.2 - (soil / 100) * 0.9 - (rain / 100) * 0.7).toFixed(2)));
  const score = Math.round(Math.min(98, (slope * 0.7 + soil * 0.4 + rain * 0.6)));
  const risk = score > 80 ? 'CRITICAL' : score > 60 ? 'HIGH' : score > 35 ? 'MEDIUM' : 'LOW';

  return {
    score,
    riskLevel: risk,
    factorOfSafety: fos,
    failureProbability: Math.round(100 / (1 + Math.exp(3.0 * (fos - 1.15)))),
    peakDangerWindow: risk === 'CRITICAL' ? '+12h to +20h Peak Monsoon Window' : 'Conditions stable',
    primaryDriver: rain > 60 ? 'Rainfall Saturation Index' : 'Topographic Slope Gradient',
    confidenceScore: 0.91,
    forecastCurve: [
      { label: '+0h', probability: score, projectedRainfall: rain, status: risk },
      { label: '+6h', probability: Math.min(99, score + 6), projectedRainfall: rain + 8, status: risk },
      { label: '+12h', probability: Math.min(99, score + 14), projectedRainfall: rain + 18, status: 'CRITICAL' },
      { label: '+18h', probability: Math.min(99, score + 12), projectedRainfall: rain + 15, status: 'CRITICAL' },
      { label: '+24h', probability: Math.min(99, score + 5), projectedRainfall: rain + 5, status: risk },
      { label: '+36h', probability: Math.max(10, score - 8), projectedRainfall: Math.max(0, rain - 10), status: 'MEDIUM' },
      { label: '+48h', probability: Math.max(10, score - 15), projectedRainfall: Math.max(0, rain - 15), status: 'LOW' }
    ],
    explainability: [
      { factor: 'Rainfall Saturation Index', percentage: 38, impact: 'HIGH' },
      { factor: 'Topographic Slope Gradient (>35°)', percentage: 28, impact: 'HIGH' },
      { factor: 'Pore-Water Pressure', percentage: 20, impact: 'MODERATE' },
      { factor: 'Geological Shear Weakness', percentage: 14, impact: 'MODERATE' }
    ],
    mitigations: [
      '🚨 Evacuate slope-toe settlements to designated highland shelters.',
      '🚧 Enforce traffic halt on vulnerable mountain road bypasses.',
      '🌱 Bio-engineering: Plant deep-root vetiver grass along contour terraces.'
    ]
  };
}

// 3. Fetch all Monitored Stations
export async function fetchStations() {
  try {
    const res = await fetch(apiUrl('/api/locations'));
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        localStorage.setItem('landslidesafe_cached_stations', JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Could not fetch locations from backend, checking cache:', err.message);
  }
  const cached = localStorage.getItem('landslidesafe_cached_stations');
  return cached ? JSON.parse(cached) : [];
}

export async function fetchApiHealth() {
  const response = await fetch(apiUrl('/api/health'));
  const json = await response.json();
  if (!response.ok || json.status !== 'ok') throw new Error(json.error || 'Backend API is unavailable.');
  return json;
}

// Search the backend first so the existing location workflow uses persisted risk data.
export async function fetchRiskByLocation(location) {
  const response = await fetch(apiUrl(`/api/risk?location=${encodeURIComponent(location)}`));
  const json = await response.json();
  if (!response.ok || !json.success) throw new Error(json.error || 'Location risk is unavailable.');
  return json.data;
}

// 4. Fetch Hazard Zones
export async function fetchHazardZones() {
  try {
    const res = await fetch(apiUrl('/api/hazard-zones'));
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        localStorage.setItem('landslidesafe_cached_hazards', JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Could not fetch hazard zones from backend, checking cache:', err.message);
  }
  const cached = localStorage.getItem('landslidesafe_cached_hazards');
  return cached ? JSON.parse(cached) : [];
}

// 5. Fetch IoT Geotechnical Sensors
export async function fetchSensors() {
  try {
    const res = await fetch(apiUrl('/api/sensors'));
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.warn('Could not fetch sensors from backend:', err.message);
  }
  return [];
}

// 6. Fetch Highland Evacuation Shelters
export async function fetchShelters() {
  try {
    const res = await fetch(apiUrl('/api/shelters'));
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        localStorage.setItem('landslidesafe_cached_shelters', JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Could not fetch shelters from backend:', err.message);
  }
  const cached = localStorage.getItem('landslidesafe_cached_shelters');
  return cached ? JSON.parse(cached) : [];
}

// 7. Fetch Satellite Feeds
export async function fetchSatelliteData() {
  try {
    const res = await fetch(apiUrl('/api/satellite'));
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.warn('Could not fetch satellite feed:', err.message);
  }
  return {
    source: 'INSAT-3D Rapid Scan (Offline Simulation)',
    cloudTopTemperature: -62.5,
    precipitableWaterVapor: '58.0 mm',
    radarSweepStatus: 'LOCAL_STANDBY'
  };
}

// 8. Crowdsourced Field Reporting with Offline Queue
export async function fetchFieldReports(status = 'ALL') {
  try {
    const url = status && status !== 'ALL' ? `/api/field-reports?status=${status}` : '/api/field-reports';
    const res = await fetch(apiUrl(url));
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.warn('Could not fetch field reports from backend:', err.message);
  }
  // Return offline pending reports if backend unavailable
  return OfflineSyncManager.getPendingReports();
}

export async function submitFieldReport(reportData) {
  // If browser is online, attempt direct backend submit
  if (navigator.onLine) {
    try {
      const res = await fetch(apiUrl('/api/field-reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return { ...json.data, offlineQueued: false };
        }
      }
    } catch (err) {
      console.warn('Direct report submit failed, falling back to offline queue:', err.message);
    }
  }

  // Queue into local offline storage
  const queued = OfflineSyncManager.queueReport(reportData);
  return { ...queued, offlineQueued: true };
}

export async function verifyFieldReport(id, status, verifiedBy, triggerSiren = false) {
  try {
    const res = await fetch(apiUrl(`/api/field-reports/${id}/verify`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, verifiedBy, triggerSiren })
    });
    if (res.ok) {
      const json = await res.json();
      return json;
    }
  } catch (err) {
    console.error('Error verifying field report:', err);
    throw err;
  }
}

// 9. Automated Early Warning Siren & SMS Dispatch
export async function broadcastEmergencyAlert(alertPayload) {
  try {
    const res = await fetch(apiUrl('/api/alerts/broadcast'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertPayload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Error broadcasting emergency alert:', err);
    throw err;
  }
}

export async function fetchAlerts() {
  try {
    const res = await fetch(apiUrl('/api/alerts'));
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.warn('Could not fetch alerts from backend:', err.message);
  }
  return [];
}

// 10. SMS Subscribers Portal
export async function fetchSubscribers() {
  try {
    const res = await fetch(apiUrl('/api/subscribers'));
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {
    console.warn('Could not fetch subscribers:', err.message);
  }
  return [];
}

export async function subscribeSmsAlerts(subData) {
  try {
    const res = await fetch(apiUrl('/api/subscribers'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subData)
    });
    return await res.json();
  } catch (err) {
    console.error('Error registering subscriber:', err);
    throw err;
  }
}

// 11. Monitored location settings
export async function persistMonitoredLocation(location) {
  try {
    await fetch(apiUrl('/api/monitor'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location })
    });
  } catch (err) {
    console.warn('Could not persist monitored location to backend:', err.message);
  }
}

// ==========================================
// OFFLINE SYNC MANAGER (For remote regions)
// ==========================================
const QUEUE_KEY = 'landslidesafe_offline_queue';

export const OfflineSyncManager = {
  getPendingReports() {
    try {
      const item = localStorage.getItem(QUEUE_KEY);
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  },

  queueReport(reportData) {
    const pending = this.getPendingReports();
    const queuedItem = {
      ...reportData,
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'PENDING (Offline)',
      is_offline_synced: 0,
      reported_at: new Date().toISOString()
    };
    pending.unshift(queuedItem);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(pending));
    return queuedItem;
  },

  async syncWithBackend() {
    const pending = this.getPendingReports();
    if (!pending.length) return { synced: 0 };

    try {
      const res = await fetch(apiUrl('/api/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports: pending })
      });

      if (res.ok) {
        const json = await res.json();
        localStorage.removeItem(QUEUE_KEY);
        return { synced: pending.length, serverResponse: json };
      }
    } catch (err) {
      console.warn('Offline sync attempt failed (still offline):', err.message);
    }
    return { synced: 0 };
  }
};
