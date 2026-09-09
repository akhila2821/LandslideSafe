import { useEffect, useMemo, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiUrl } from '../services/api'

const REGION_COORDINATES = {
  ALL: { center: [26.2, 91.5], zoom: 6 },
  SIKKIM: { center: [27.3389, 88.6065], zoom: 9 },
  DARJEELING: { center: [27.041, 88.266], zoom: 10 },
  MIZORAM: { center: [23.73, 92.72], zoom: 9 },
  NAGALAND: { center: [25.67, 94.11], zoom: 9 },
  ARUNACHAL: { center: [27.25, 93.0], zoom: 8 },
}

const riskPalette = {
  LOW: { color: '#10b981', fill: '#10b981' },
  MEDIUM: { color: '#eab308', fill: '#eab308' },
  HIGH: { color: '#f97316', fill: '#f97316' },
  CRITICAL: { color: '#ef4444', fill: '#ef4444' },
}

function stationRisk(station) {
  if (station.risk_level) return String(station.risk_level).toUpperCase()
  const score = Number(station.last_score || 0)
  return score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'
}

function stationIcon(risk, selected) {
  const palette = riskPalette[risk] || riskPalette.LOW
  return L.divIcon({
    className: 'react-leaflet-station-icon',
    html: `<span class="react-station-dot ${risk.toLowerCase()} ${selected ? 'selected' : ''}" style="--station-color:${palette.color}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function MapFocus({ focusTarget }) {
  const map = useMap()
  useEffect(() => {
    if (focusTarget) map.flyTo(focusTarget.center, focusTarget.zoom, { duration: 1.1 })
  }, [focusTarget, map])
  return null
}

function SearchMarker({ result }) {
  if (!result) return null
  return <Marker position={[result.lat, result.lng]}><Popup><strong>{result.name}</strong><br />Selected search location</Popup></Marker>
}

export default function RiskMap({ stations = [], hazardZones = [], sensors = [], shelters = [], fieldReports = [], selectedStation = null, activeReading = null, satelliteData = null, onSelectStation = () => {}, onRiskSearch = () => {}, onTriggerAlarm = () => {} }) {
  const [layersVisibility, setLayersVisibility] = useState({ heatmap: true, hazardZones: true, stations: true, sensors: true, shelters: true, fieldReports: true })
  const [activeRegion, setActiveRegion] = useState('ALL')
  const [focusTarget, setFocusTarget] = useState(REGION_COORDINATES.ALL)
  const [search, setSearch] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searching, setSearching] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const displayedStations = useMemo(() => stations, [stations])

  const toggleLayer = (key) => setLayersVisibility((current) => ({ ...current, [key]: !current[key] }))
  const focusRegion = (key) => { setActiveRegion(key); setFocusTarget(REGION_COORDINATES[key]) }

  const handleSearch = async (event) => {
    event.preventDefault()
    if (!search.trim()) return
    setSearching(true)
    try {
      const response = await fetch(apiUrl(`/api/risk?location=${encodeURIComponent(search.trim())}`))
      const json = await response.json()
      if (!response.ok || !json.success || !json.data) throw new Error(json.error || 'Location risk is unavailable')
      const risk = json.data
      const parsed = { name: risk.location, lat: Number(risk.latitude), lng: Number(risk.longitude), state: risk.state || 'Northeast India' }
      const station = { id: `backend-${risk.location.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name: risk.location, state: risk.state || 'Northeast India', lat: parsed.lat, lng: parsed.lng, risk_level: risk.riskLevel, last_score: risk.riskScore, demo_soil: Number(String(risk.soilCondition).match(/[0-9.]+/)?.[0] || 0), slope: risk.slope, elevation: risk.elevation }
      setSearchResult(parsed)
      setSelectedItem({ type: 'station', data: station })
      setFocusTarget({ center: [parsed.lat, parsed.lng], zoom: 11 })
      onSelectStation(station)
      onRiskSearch(risk)
    } catch (error) {
      setSelectedItem({ type: 'search', data: { name: error.message } })
    } finally { setSearching(false) }
  }

  return <div className="risk-map-component">
    <div className="map-toolbar">
      <div className="toolbar-left"><span className="live-pulse-dot" /><strong className="toolbar-title">OPENSTREETMAP RISK RADAR</strong><span className="satellite-status-pill">🛰️ {satelliteData?.satellite || 'IMD + field telemetry'}</span></div>
      <form className="map-search-form" onSubmit={handleSearch}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search NER location" aria-label="Search map location" /><button type="button" onClick={handleSearch}>{searching ? '...' : 'Find'}</button></form>
      <div className="toolbar-layer-toggles"><button className={`hud-toggle-btn ${layersVisibility.heatmap ? 'active' : ''}`} onClick={() => toggleLayer('heatmap')}>🔥 Heatmap</button><button className={`hud-toggle-btn ${layersVisibility.hazardZones ? 'active' : ''}`} onClick={() => toggleLayer('hazardZones')}>🚨 Zones</button><button className={`hud-toggle-btn ${layersVisibility.sensors ? 'active' : ''}`} onClick={() => toggleLayer('sensors')}>📡 Sensors</button></div>
    </div>
    <div className="region-selector-bar"><span className="region-bar-label">REGIONAL RADAR FOCUS:</span><div className="region-buttons-scroll">{Object.entries(REGION_COORDINATES).map(([key]) => <button key={key} className={`region-chip ${activeRegion === key ? 'active' : ''}`} onClick={() => focusRegion(key)}>{key === 'ALL' ? 'Northeast India' : key === 'ARUNACHAL' ? 'Arunachal / Itanagar' : key === 'NAGALAND' ? 'Nagaland / Kohima' : key === 'DARJEELING' ? 'Darjeeling' : key}</button>)}</div></div>
    <div className="map-and-precautions-wrapper"><div className="map-viewport"><MapContainer center={REGION_COORDINATES.ALL.center} zoom={REGION_COORDINATES.ALL.zoom} minZoom={4} maxZoom={18} scrollWheelZoom className="leaflet-risk-map"><MapFocus focusTarget={focusTarget} /><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {layersVisibility.heatmap && displayedStations.map((station) => { const risk = stationRisk(station); const palette = riskPalette[risk]; return <Circle key={`heat-${station.id}`} center={[station.lat, station.lng]} radius={risk === 'CRITICAL' ? 35000 : risk === 'HIGH' ? 26000 : 18000} pathOptions={{ color: palette.color, fillColor: palette.fill, fillOpacity: risk === 'CRITICAL' ? .25 : .13, weight: 1 }} /> })}
      {layersVisibility.hazardZones && hazardZones.map((zone) => <Circle key={`zone-${zone.id}`} center={[zone.lat, zone.lng]} radius={zone.radius_meters || 12000} pathOptions={{ color: zone.hazard_level === 'CRITICAL' ? '#ef4444' : '#f97316', fillOpacity: .18, dashArray: '6 5' }} />)}
      {layersVisibility.stations && displayedStations.map((station) => { const risk = stationRisk(station); return <Marker key={`station-${station.id}`} position={[station.lat, station.lng]} icon={stationIcon(risk, selectedStation?.id === station.id)} eventHandlers={{ click: () => { onSelectStation(station); setSelectedItem({ type: 'station', data: station }) } }}><Tooltip direction="top" offset={[0, -10]}>{station.name} · {risk}</Tooltip><Popup><strong>{station.name}</strong><br />{station.state}<br /><PillText risk={risk} score={station.last_score || 25} soil={station.demo_soil || 0} /></Popup></Marker> })}
      {layersVisibility.sensors && sensors.map((sensor) => <CircleMarker key={`sensor-${sensor.id}`} center={[sensor.lat, sensor.lng]} radius={7} pathOptions={{ color: sensor.status === 'ALERT' ? '#ef4444' : '#06b6d4', fillColor: sensor.status === 'ALERT' ? '#ef4444' : '#06b6d4', fillOpacity: .85 }}><Tooltip>{sensor.name || 'IoT sensor'} · {sensor.status || 'ONLINE'}</Tooltip></CircleMarker>)}
      {layersVisibility.shelters && shelters.map((shelter) => <Marker key={`shelter-${shelter.id}`} position={[shelter.lat, shelter.lng]}><Tooltip>{shelter.name || 'Evacuation shelter'}</Tooltip></Marker>)}
      {layersVisibility.fieldReports && fieldReports.map((report) => <CircleMarker key={`report-${report.id}`} center={[report.lat, report.lng]} radius={8} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: .85 }}><Tooltip>{report.incident_type || 'Field report'} · {report.severity || 'MODERATE'}</Tooltip></CircleMarker>)}
      <SearchMarker result={searchResult} />
    </MapContainer></div><aside className="red-precautions-drawer">{selectedItem?.type === 'search' ? <><div className="drawer-header"><div><h3>Search result</h3><p>{selectedItem.data.name}</p></div></div></> : <><div className="drawer-header"><div><h3>{selectedStation?.name || 'NER monitoring map'}</h3><p>{selectedStation?.state || 'Northeast India'} · OpenStreetMap</p></div></div>{selectedStation ? <><div className="focused-badge-row"><span className={`hazard-pill ${stationRisk(selectedStation).toLowerCase()}`}>{stationRisk(selectedStation)}</span><span className="perimeter-tag">Risk station</span></div><div className="focused-metrics-grid"><div className="metric-chip"><small>Risk score</small><strong>{selectedStation.last_score || activeReading?.score || 25}/100</strong></div><div className="metric-chip"><small>Soil</small><strong>{selectedStation.demo_soil || activeReading?.soil || 0}%</strong></div><div className="metric-chip"><small>Slope</small><strong>{selectedStation.slope || 0}°</strong></div></div><p className="item-description-text">Hover any marker for a quick reading. Select a station to update the live dashboard.</p><div className="drawer-actions"><button className="test-siren-btn" onClick={onTriggerAlarm}>🔊 Test station siren</button></div></> : <p className="item-description-text">Select a colored station marker to inspect rainfall, soil saturation, slope and risk level.</p>}</>}</aside></div><div className="map-legend-bar"><span className="legend-item"><i className="legend-circle critical-circle" /> Critical</span><span className="legend-item"><i className="legend-circle high-circle" /> High</span><span className="legend-item"><i className="legend-circle" style={{ borderColor: '#eab308', background: 'rgba(234,179,8,.3)' }} /> Medium</span><span className="legend-item"><i className="legend-dot" /> Low</span><span className="legend-note">© OpenStreetMap contributors · no API key required</span></div>
  </div>
}

function PillText({ risk, score, soil }) { return <span>{risk} risk · {score}/100 · soil {soil}%</span> }
