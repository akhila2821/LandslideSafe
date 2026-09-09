# LandslideSafe

LandslideSafe is a React + Vite disaster-risk dashboard for Northeast India. The current project keeps the existing Leaflet + OpenStreetMap interface and adds a Node.js/Express + SQLite backend.

## Start the complete application

Install dependencies once:

```powershell
npm install
```

Run frontend and backend together:

```powershell
npm run dev:full
```

Or run them separately:

```powershell
npm run server
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5000`

SQLite is created automatically at `server/landslidesafe.db`. Seed the demo locations again with:

```powershell
npm run seed
```

## API

- `GET /api/health`
- `GET /api/locations`
- `GET /api/risk?location=Gangtok`
- `POST /api/risk`
- Existing dashboard endpoints: `/api/check-risk`, `/api/predict`, `/api/sensors`, `/api/hazard-zones`, `/api/shelters`, `/api/field-reports`, `/api/alerts` and `/api/satellite`

Example risk calculation:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/risk -ContentType 'application/json' -Body '{"location":"Gangtok","latitude":27.3389,"longitude":88.6065,"rainfall":120,"slope":46,"soilCondition":93,"elevation":1650,"historicalRisk":70}'
```

The rule engine is intentionally transparent, not fake AI. It combines rainfall, slope, elevation, soil condition and historical risk. Values seeded in SQLite are marked as demo data until a real sensor or IMD ingestion source is configured. The UI continues to use Open-Meteo as a fallback weather source and the existing sensor endpoint when `VITE_SENSOR_API_URL` is configured.

## Architecture

React/Leaflet calls Express through the Vite `/api` proxy. Express validates requests, calculates the rule-based result, persists readings and risk results in SQLite, and serves the existing GIS, alert and field-report workflows. Offline field reports continue to queue in browser storage and sync through the existing `/api/sync` endpoint.
