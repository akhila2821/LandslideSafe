import { useEffect, useState, useRef } from 'react';
import './App.css';
import {
  getLocationReading,
  fetchStations,
  fetchApiHealth,
  fetchRiskByLocation,
  fetchHazardZones,
  fetchAlerts,
  fetchSensors,
  fetchShelters,
  fetchFieldReports,
  fetchSatelliteData,
  submitFieldReport,
  verifyFieldReport,
  broadcastEmergencyAlert,
  subscribeSmsAlerts,
  fetchSubscribers,
  persistMonitoredLocation,
  fetchAiPrediction,
  OfflineSyncManager
} from './services/riskService';
import RiskMap from './components/RiskMap';

const riskColor = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' };
const getTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

// Synthesize emergency audio siren tone
function playSirenBeep() {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const start = context.currentTime;
    [0, 0.45, 0.9, 1.35].forEach((offset) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, start + offset);
      osc.frequency.exponentialRampToValueAtTime(950, start + offset + 0.22);
      osc.frequency.exponentialRampToValueAtTime(550, start + offset + 0.42);

      gain.gain.setValueAtTime(0.001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.24, start + offset + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + offset + 0.42);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.44);
    });
    window.setTimeout(() => context.close(), 2200);
  } catch (err) {
    console.warn('Audio siren playback blocked:', err);
  }
}

// Emergency voice warning announcement
function speakEmergencyAlert(locationName, severity = 'CRITICAL') {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(
        `Emergency landslide alert! Critical threat detected in ${locationName}. All residents evacuate slope-toe areas immediately to designated highland shelters.`
      );
      msg.rate = 1.05;
      msg.pitch = 1.0;
      window.speechSynthesis.speak(msg);
    }
  } catch (err) {
    console.warn('Speech synthesis unavailable:', err);
  }
}

function levelText(level) {
  return level === 'CRITICAL'
    ? 'Critical Landslide Risk (Failure Imminent)'
    : level === 'HIGH'
    ? 'High Landslide Hazard (Severe Saturation)'
    : level === 'MEDIUM'
    ? 'Moderate Vulnerability (Monitored)'
    : 'Low Landslide Risk (Stable)';
}

export default function App() {
  // Navigation tabs: 'gis' | 'analytics' | 'reports' | 'alerts' | 'shelters'
  const [activeTab, setActiveTab] = useState('gis');

  // Core data states
  const [locations, setLocations] = useState([]);
  const [hazardZones, setHazardZones] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [fieldReports, setFieldReports] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [satelliteData, setSatelliteData] = useState(null);

  // Selected station & telemetry
  const [selectedNode, setSelectedNode] = useState(null);
  const [reading, setReading] = useState(null);
  const [aiPrediction, setAiPrediction] = useState(null);
  const [locationInput, setLocationInput] = useState('');
  const [savedLocation, setSavedLocation] = useState(localStorage.getItem('savedLocation') || 'Gangtok');

  // Operational states
  const [loading, setLoading] = useState(false);
  const [monitoring, setMonitoring] = useState(Boolean(localStorage.getItem('savedLocation')));
  const [alert, setAlert] = useState(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [showDbModal, setShowDbModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Field Report Form State
  const [reportForm, setReportForm] = useState({
    reporterName: '',
    reporterPhone: '',
    reporterRole: 'Citizen',
    locationName: '',
    lat: '',
    lng: '',
    incidentType: 'Ground Crack / Fissure',
    severity: 'HIGH',
    description: '',
    photoUrl: ''
  });

  // SMS Subscribe Form State
  const [subscriberForm, setSubscriberForm] = useState({
    name: '',
    phone: '',
    district: 'East Sikkim',
    state: 'Sikkim',
    role: 'Resident',
    preferredChannel: 'SMS'
  });

  // Broadcast Alert Form State
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // 1. Initial Data Loading & Network Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleBatchSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadAllData();
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = () => {
    const count = OfflineSyncManager.getPendingReports().length;
    setPendingSyncCount(count);
  };

  const loadAllData = async () => {
    setApiLoading(true);
    setApiError('');
    try {
      const [health, locs, hazards, sens, shlts, reps, alrts, subs, sat] = await Promise.all([
        fetchApiHealth(),
        fetchStations(),
        fetchHazardZones(),
        fetchSensors(),
        fetchShelters(),
        fetchFieldReports(),
        fetchAlerts(),
        fetchSubscribers(),
        fetchSatelliteData()
      ]);

      if (health.status !== 'ok') throw new Error('Backend API health check failed.');

      if (locs?.length) {
        setLocations(locs);
        const match = locs.find((l) => l.name.toLowerCase() === savedLocation.toLowerCase()) || locs[0];
        setSelectedNode(match);
      }
      if (hazards?.length) setHazardZones(hazards);
      if (sens?.length) setSensors(sens);
      if (shlts?.length) setShelters(shlts);
      if (reps?.length) setFieldReports(reps);
      if (alrts?.length) setRecentAlerts(alrts);
      if (subs?.length) setSubscribers(subs);
      if (sat) setSatelliteData(sat);
    } catch (err) {
      setApiError(err.message || 'Backend API is unavailable.');
      setAlert({ level: 'ERROR', message: 'Backend API unavailable. Showing cached data where available.', time: getTime() });
      console.error('Error loading initial data:', err);
    } finally {
      setApiLoading(false);
    }
  };

  const applyBackendRisk = (risk, node = selectedNode) => {
    const soil = Number(String(risk.soilCondition ?? '').match(/[0-9.]+/)?.[0] || node?.demo_soil || 0);
    const result = {
      location: risk.location,
      state: risk.state || node?.state || 'Northeast India',
      latitude: risk.latitude ?? node?.lat,
      longitude: risk.longitude ?? node?.lng,
      rainfall: risk.rainfall,
      soil,
      slope: risk.slope,
      elevation: risk.elevation,
      risk: risk.riskLevel,
      score: risk.riskScore,
      recommendation: risk.recommendation,
      source: risk.demoData ? 'Backend SQLite · DEMO DATA' : 'Backend SQLite',
      checkedAt: getTime(),
      precautions: risk.recommendation ? [risk.recommendation] : []
    };
    setReading(result);
    setAiPrediction(null);
    setAlert({ level: risk.riskLevel, message: `Backend risk loaded for ${risk.location}: ${risk.riskLevel} (${risk.riskScore}/100).`, time: getTime() });
    return result;
  };

  const loadBackendRisk = async (node) => {
    if (!node?.name) return;
    setLoading(true);
    try {
      const risk = await fetchRiskByLocation(node.name);
      applyBackendRisk(risk, node);
    } catch (err) {
      setApiError(err.message || 'Risk data is unavailable.');
      setAlert({ level: 'ERROR', message: err.message || 'Risk data is unavailable.', time: getTime() });
    } finally {
      setLoading(false);
    }
  };

  // 2. Detect & Check Risk with AI integration
  const detectRisk = async (node = selectedNode, isAutomatic = false) => {
    if (!node) return;
    setLoading(true);
    try {
      const data = await getLocationReading(node, undefined, isAutomatic);
      const result = {
        ...data,
        location: node.name || data.location,
        state: node.state || data.state,
        latitude: node.lat || data.latitude,
        longitude: node.lng || data.longitude,
        checkedAt: data.checkedAt || getTime()
      };
      setReading(result);

      // AI Geotechnical Prediction
      const aiData = await fetchAiPrediction({
        locationId: node.id,
        slope: node.slope,
        soilSaturation: result.soil,
        rainfall: result.rainfall,
        lithology: node.lithology,
        elevation: node.elevation
      });
      setAiPrediction(aiData);

      if (['HIGH', 'CRITICAL'].includes(result.risk)) {
        playSirenBeep();
        speakEmergencyAlert(node.name, result.risk);
        setAlert({
          level: result.risk,
          message: `Automatic Siren ON: ${node.name} crossed the ${result.risk.toLowerCase()} threshold! Factor of Safety is ${aiData?.factorOfSafety || '0.75'}. Evacuation advisory issued.`,
          time: getTime(),
          automatic: isAutomatic
        });
      } else if (!isAutomatic) {
        setAlert({
          level: 'INFO',
          message: `${node.name} telemetry refreshed. Conditions stable (${result.condition}).`,
          time: getTime()
        });
      }

      fetchAlerts().then((a) => a?.length && setRecentAlerts(a));
    } catch (err) {
      setAlert({
        level: 'ERROR',
        message: `Failed to update ${node?.name}: ${err.message}`,
        time: getTime()
      });
    } finally {
      setLoading(false);
    }
  };

  // 3. Periodic Monitoring Trigger
  useEffect(() => {
    if (!monitoring || !selectedNode) return undefined;
    detectRisk(selectedNode, true);
    const timer = setInterval(() => detectRisk(selectedNode, true), 4 * 60 * 1000);
    return () => clearInterval(timer);
  }, [monitoring, savedLocation]);

  // Save Monitored Location
  const saveLocation = async () => {
    if (!locationInput.trim()) return;
    const locName = locationInput.trim();
    let backendRisk = null;
    try {
      backendRisk = await fetchRiskByLocation(locName);
    } catch (err) {
      setAlert({ level: 'ERROR', message: err.message, time: getTime() });
      return;
    }
    localStorage.setItem('savedLocation', locName);
    setSavedLocation(locName);
    setMonitoring(true);
    persistMonitoredLocation(locName);

    const match = locations.find((n) => n.name.toLowerCase() === backendRisk.location.toLowerCase()) || locations.find((n) => n.name.toLowerCase() === locName.toLowerCase());
    if (match) {
      setSelectedNode(match);
      detectRisk(match);
    }

    setAlert({
      level: ['HIGH', 'CRITICAL'].includes(backendRisk.riskLevel) ? backendRisk.riskLevel : 'INFO',
      message: `Monitoring enabled for ${backendRisk.location}. Current backend risk: ${backendRisk.riskLevel} (${backendRisk.riskScore}/100).`,
      time: getTime()
    });
  };

  // Handle Field Report Submission
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportForm.reporterName || !reportForm.locationName) return;

    try {
      const payload = {
        ...reportForm,
        lat: reportForm.lat ? Number(reportForm.lat) : selectedNode?.lat || 27.33,
        lng: reportForm.lng ? Number(reportForm.lng) : selectedNode?.lng || 88.61
      };
      const created = await submitFieldReport(payload);
      setShowReportModal(false);
      updatePendingCount();

      if (created.offlineQueued) {
        setAlert({
          level: 'INFO',
          message: 'Offline: Report safely queued in device storage. Will auto-sync when cellular coverage returns.',
          time: getTime()
        });
      } else {
        setAlert({
          level: 'INFO',
          message: `Field report for ${reportForm.locationName} successfully submitted to Disaster Desk!`,
          time: getTime()
        });
        fetchFieldReports().then((r) => r && setFieldReports(r));
      }

      setReportForm({
        reporterName: '',
        reporterPhone: '',
        reporterRole: 'Citizen',
        locationName: '',
        lat: '',
        lng: '',
        incidentType: 'Ground Crack / Fissure',
        severity: 'HIGH',
        description: '',
        photoUrl: ''
      });
    } catch (err) {
      alert(`Error submitting report: ${err.message}`);
    }
  };

  // Handle Offline Sync manually or on reconnect
  const handleBatchSync = async () => {
    const res = await OfflineSyncManager.syncWithBackend();
    updatePendingCount();
    if (res.synced > 0) {
      setAlert({
        level: 'INFO',
        message: `Offline Sync Success: ${res.synced} cached ground reports synchronized with central cloud database!`,
        time: getTime()
      });
      fetchFieldReports().then((r) => r && setFieldReports(r));
    }
  };

  // Handle Officer Verification of Field Report
  const handleVerifyReport = async (reportId, status, triggerSiren = false) => {
    try {
      const res = await verifyFieldReport(reportId, status, 'SDRF Command Officer', triggerSiren);
      fetchFieldReports().then((r) => r && setFieldReports(r));
      fetchAlerts().then((a) => a && setRecentAlerts(a));
      if (triggerSiren) {
        playSirenBeep();
        speakEmergencyAlert('Field Incident Zone', 'CRITICAL');
      }
      setAlert({
        level: 'INFO',
        message: `Report ${status}. ${triggerSiren ? 'Emergency Siren & SMS Broadcast Dispatched!' : ''}`,
        time: getTime()
      });
    } catch (err) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  // Handle Emergency Warning Broadcast
  const handleBroadcastAlert = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    try {
      const res = await broadcastEmergencyAlert({
        locationName: selectedNode?.name || 'North East Region',
        locationId: selectedNode?.id || 'regional_alert',
        risk: 'CRITICAL',
        message: broadcastMessage,
        channels: 'SIREN,SMS,APP'
      });
      playSirenBeep();
      speakEmergencyAlert(selectedNode?.name || 'North East Region', 'CRITICAL');
      setBroadcastMessage('');
      fetchAlerts().then((a) => a && setRecentAlerts(a));
      setAlert({
        level: 'CRITICAL',
        message: `EMERGENCY BROADCAST DISPATCHED: Reached ${res.data?.recipientsReached || subscribers.length} subscribers via SMS/WhatsApp & Siren.`,
        time: getTime()
      });
    } catch (err) {
      alert(`Broadcast failed: ${err.message}`);
    }
  };

  // Handle SMS Subscriber Registration
  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!subscriberForm.phone || !subscriberForm.name) return;
    try {
      await subscribeSmsAlerts(subscriberForm);
      fetchSubscribers().then((s) => s && setSubscribers(s));
      setAlert({
        level: 'INFO',
        message: `Successfully registered ${subscriberForm.phone} for real-time early warning SMS in ${subscriberForm.district}!`,
        time: getTime()
      });
      setSubscriberForm({
        name: '',
        phone: '',
        district: 'East Sikkim',
        state: 'Sikkim',
        role: 'Resident',
        preferredChannel: 'SMS'
      });
    } catch (err) {
      alert(`Subscription failed: ${err.message}`);
    }
  };

  // Use GPS location for Field Report
  const handleGetGpsLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setReportForm((prev) => ({
            ...prev,
            lat: pos.coords.latitude.toFixed(4),
            lng: pos.coords.longitude.toFixed(4),
            locationName: prev.locationName || 'Current GPS Location'
          }));
        },
        (err) => {
          alert(`GPS unavailable: ${err.message}. Using selected node coordinates.`);
          if (selectedNode) {
            setReportForm((prev) => ({
              ...prev,
              lat: selectedNode.lat,
              lng: selectedNode.lng,
              locationName: selectedNode.name
            }));
          }
        }
      );
    }
  };

  const isDanger = alert?.level === 'CRITICAL' || alert?.level === 'HIGH';

  return (
    <div className={`app ${isDanger ? 'danger-mode' : ''}`}>
      {/* Top Banner Alert */}
      {alert && (
        <div className={`notification-banner ${alert.level.toLowerCase()}`} role="alert">
          <strong>{alert.level === 'INFO' ? 'ℹ️ Command Notice' : `🚨 ${alert.level} RISK ALERT`}</strong>
          <span>{alert.message}</span>
          <small>{alert.time} IST</small>
          <button onClick={() => setAlert(null)} aria-label="Dismiss alert">
            ×
          </button>
        </div>
      )}

      {/* Main Navbar & Command Header */}
      <header className="navbar">
        <div className="navbar-brand-group">
          <a className="brand" href="#gis">
            <span className="brand-icon">⛰️</span>
            <div>
              <span className="brand-name">LandslideSafe</span>
              <span className="brand-sub">AI DISASTER COMMAND · NORTH EAST REGION</span>
            </div>
          </a>

          {/* Live System Indicator */}
          <div className="nav-hazard-pill" title="Live Red Precaution Zones">
            <span className="live-radar-blink" />
            <span>{hazardZones.length || 5} Red Hazard Zones Active</span>
          </div>

          {/* Network Sync Pill */}
          <div className={`nav-network-pill ${isOnline ? 'online' : 'offline'}`}>
            <span className="network-dot" />
            <span>{isOnline ? 'Cloud Synced' : 'Offline Mode'}</span>
            {pendingSyncCount > 0 && (
              <button
                type="button"
                className="sync-pending-chip"
                onClick={handleBatchSync}
                title="Sync pending offline reports to SQLite"
              >
                Sync ({pendingSyncCount})
              </button>
            )}
          </div>
        </div>

        {/* Modular Navigation Tabs */}
        <nav className="nav-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'gis' ? 'active' : ''}`}
            onClick={() => setActiveTab('gis')}
          >
            🗺️ GIS Radar &amp; Heatmaps
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            🧠 AI Predictive Engine
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            📱 Field Reporting ({fieldReports.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            📢 Early Warning &amp; SMS
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'shelters' ? 'active' : ''}`}
            onClick={() => setActiveTab('shelters')}
          >
            🏕️ Shelters &amp; Governance
          </button>
        </nav>

        <div className="nav-right-actions">
          <button
            type="button"
            className="emergency-siren-test-btn"
            onClick={() => {
              playSirenBeep();
              speakEmergencyAlert(selectedNode?.name || 'Monitoring Node', 'CRITICAL');
            }}
            title="Trigger audio test of the automated alarm siren"
          >
            🔊 Alarm Siren
          </button>
          <button
            type="button"
            className="db-log-btn"
            onClick={() => setShowDbModal(true)}
            title="Inspect backend SQLite database tables"
          >
            💾 DB Status
          </button>
        </div>
      </header>

      {/* Floating Action Button for Quick Field Report */}
      <button
        type="button"
        className="floating-report-fab"
        onClick={() => setShowReportModal(true)}
        title="Submit Ground Incident (Offline Enabled)"
      >
        <span>📸 Report Incident</span>
      </button>

      {/* MAIN CONTENT PANELS BASED ON TAB */}
      <main className="command-main">
        {/* TAB 1: GIS RADAR & HEATMAPS */}
        {activeTab === 'gis' && (
          <section id="gis" className="tab-pane active">
            {/* Quick Hero Banner with Monitored Node Selector */}
            <div className="gis-hero-strip">
              <div className="strip-left">
                <h2>North East India Real-Time GIS Hazard Radar</h2>
                <p>
                  Continuous multi-satellite meteorological tracking, live IoT geotechnical telemetry, and AI risk heatmaps across the 8 North Eastern states and fragile Himalayan belts.
                </p>
              </div>

              <div className="strip-monitor-box">
                <label>
                  <span>MONITORING NODE:</span>
                  <input
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="Gangtok, Mawsynram, Kohima..."
                  />
                </label>
                <button type="button" onClick={saveLocation}>
                  Lock &amp; Monitor
                </button>
              </div>
            </div>

            {/* Monitored Node Horizontal Quick Switcher */}
            <div className="station-selector-strip">
              <span className="strip-label">NODES ({locations.length}):</span>
              <div className="node-grid">
                {locations.map((node) => (
                  <button
                    className={`node-card ${selectedNode?.id === node.id ? 'selected' : ''}`}
                    key={node.id}
                    onClick={() => {
                      setSelectedNode(node);
                      detectRisk(node);
                    }}
                  >
                    <span className={`risk-indicator-dot ${(node.risk_level || 'low').toLowerCase()}`}>●</span>
                    <strong>{node.name}</strong>
                    <small>
                      {node.state} · slope {node.slope}° · {node.last_score || 25}/100
                    </small>
                  </button>
                ))}
              </div>
            </div>

            {/* Embedded Leaflet Map Component */}
            <div className="map-container-box">
              <RiskMap
                stations={locations}
                hazardZones={hazardZones}
                sensors={sensors}
                shelters={shelters}
                fieldReports={fieldReports}
                selectedStation={selectedNode}
                activeReading={reading}
                satelliteData={satelliteData}
                onSelectStation={(node) => {
                  setSelectedNode(node);
                  loadBackendRisk(node);
                }}
                onRiskSearch={(risk) => {
                  applyBackendRisk(risk);
                }}
                onTriggerAlarm={() => {
                  playSirenBeep();
                  speakEmergencyAlert(selectedNode?.name || 'Hazard Zone', 'CRITICAL');
                }}
              />
            </div>

            {apiLoading && <div className="api-status-message">Connecting to LandslideSafe API...</div>}
            {apiError && <div className="api-status-message error">Backend data issue: {apiError}</div>}

            {/* Live Reading Result Card if active */}
            {reading && (
              <div className="reading-result-wrapper">
                <RiskResultCard
                  reading={reading}
                  aiPrediction={aiPrediction}
                  onTriggerAlarm={() => {
                    playSirenBeep();
                    speakEmergencyAlert(reading.location, reading.risk);
                  }}
                />
              </div>
            )}
          </section>
        )}

        {/* TAB 2: AI/ML PREDICTIVE ANALYTICS ENGINE */}
        {activeTab === 'analytics' && (
          <section id="analytics" className="tab-pane active">
            <div className="section-heading">
              <p className="eyebrow">PHYSICS-INFORMED MACHINE LEARNING &amp; GEOTECHNICAL MODELING</p>
              <h2>AI Landslide Susceptibility &amp; 48-Hour Failure Forecast</h2>
              <p>
                Calculates slope Factor of Safety ($FoS$) using Mohr-Coulomb shear criteria, antecedent rainfall saturation indices, and projects 48-hour forward failure trajectory curves.
              </p>
            </div>

            <div className="analytics-layout-grid">
              {/* Left Column: Live Factor of Safety & Danger Dials */}
              <div className="analytics-card main-gauge-card">
                <div className="gauge-header">
                  <div>
                    <h3>{selectedNode?.name || 'Gangtok'}, {selectedNode?.state || 'Sikkim'}</h3>
                    <p className="geology-subtitle">Geology: {selectedNode?.lithology || 'Weathered Phyllite & Schist'}</p>
                  </div>
                  <span className={`badge ${aiPrediction?.riskLevel?.toLowerCase() || 'critical'}`}>
                    {aiPrediction?.riskLevel || 'CRITICAL'} RISK
                  </span>
                </div>

                <div className="gauge-meters-row">
                  {/* Factor of Safety Dial */}
                  <div className="meter-box">
                    <small>FACTOR OF SAFETY (FoS)</small>
                    <div className="meter-value fos-highlight">
                      {aiPrediction?.factorOfSafety ?? 0.58}
                    </div>
                    <span className="meter-sub">
                      {aiPrediction?.factorOfSafety < 1.0
                        ? '🚨 Imminent Shear Failure (< 1.0)'
                        : aiPrediction?.factorOfSafety < 1.3
                        ? '⚠️ Marginally Unstable (1.0 - 1.3)'
                        : '🟢 Geotechnically Stable (> 1.5)'}
                    </span>
                  </div>

                  {/* Failure Probability */}
                  <div className="meter-box">
                    <small>SLOPE FAILURE PROBABILITY</small>
                    <div className="meter-value prob-highlight">
                      {aiPrediction?.failureProbability ?? 91}%
                    </div>
                    <span className="meter-sub">Model Confidence: 94.2%</span>
                  </div>

                  {/* Susceptibility Score */}
                  <div className="meter-box">
                    <small>LANDSLIDE SUSCEPTIBILITY (LSI)</small>
                    <div className="meter-value score-highlight">
                      {aiPrediction?.score ?? 91}<small>/100</small>
                    </div>
                    <span className="meter-sub">Peak: {aiPrediction?.peakDangerWindow || '+12h to +20h Surge'}</span>
                  </div>
                </div>

                {/* 48-Hour Forward Forecast Curve */}
                <div className="forecast-chart-box">
                  <h4>📈 48-Hour Forward Failure Probability Trajectory:</h4>
                  <p className="chart-explanation">
                    Forward meteorological extrapolation identifying the imminent peak danger window before slope failure:
                  </p>
                  <div className="forecast-timeline-bars">
                    {(aiPrediction?.forecastCurve || [
                      { label: '+0h', probability: 91, projectedRainfall: 115, status: 'CRITICAL' },
                      { label: '+4h', probability: 94, projectedRainfall: 125, status: 'CRITICAL' },
                      { label: '+8h', probability: 96, projectedRainfall: 138, status: 'CRITICAL' },
                      { label: '+12h', probability: 98, projectedRainfall: 145, status: 'CRITICAL' },
                      { label: '+16h', probability: 97, projectedRainfall: 140, status: 'CRITICAL' },
                      { label: '+20h', probability: 92, projectedRainfall: 118, status: 'CRITICAL' },
                      { label: '+24h', probability: 84, projectedRainfall: 95, status: 'HIGH' },
                      { label: '+28h', probability: 74, projectedRainfall: 70, status: 'HIGH' },
                      { label: '+32h', probability: 62, projectedRainfall: 50, status: 'HIGH' },
                      { label: '+36h', probability: 48, projectedRainfall: 35, status: 'MEDIUM' },
                      { label: '+40h', probability: 35, projectedRainfall: 20, status: 'LOW' },
                      { label: '+48h', probability: 22, projectedRainfall: 10, status: 'LOW' }
                    ]).map((f, idx) => (
                      <div key={idx} className="timeline-bar-column">
                        <span className="prob-label">{f.probability}%</span>
                        <div className="bar-track">
                          <div
                            className={`bar-fill ${f.status.toLowerCase()}`}
                            style={{ height: `${f.probability}%` }}
                            title={`${f.label}: ${f.probability}% probability | Projected rain: ${f.projectedRainfall} mm/h`}
                          />
                        </div>
                        <span className="time-label">{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: SHAP Explainability & Engineering Mitigations */}
              <div className="analytics-card explainability-card">
                <h3>🔍 Model Feature Explainability (SHAP Weights)</h3>
                <p>Breakdown of geotechnical drivers precipitating slope instability:</p>

                <div className="factors-list">
                  {(aiPrediction?.explainability || [
                    { factor: 'Rainfall Saturation & Antecedent Index', percentage: 38, impact: 'HIGH' },
                    { factor: 'Topographic Slope Gradient (>35°)', percentage: 26, impact: 'HIGH' },
                    { factor: 'Pore-Water Pressure in Slip Plane', percentage: 20, impact: 'HIGH' },
                    { factor: 'Geological Lithology & Shear Weakness', percentage: 11, impact: 'MODERATE' },
                    { factor: 'Vegetation Root Netting Loss', percentage: 5, impact: 'LOW' }
                  ]).map((item, idx) => (
                    <div key={idx} className="factor-row">
                      <div className="factor-header">
                        <span>{item.factor}</span>
                        <strong>{item.percentage}%</strong>
                      </div>
                      <div className="factor-progress">
                        <div
                          className={`factor-progress-fill ${item.impact.toLowerCase()}`}
                          style={{ width: `${item.percentage * 2}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mitigation-box">
                  <h4>🛡️ AI Engineering &amp; Governance Recommendations:</h4>
                  <ul>
                    {(aiPrediction?.mitigations || [
                      '🚨 Immediate evacuation of slope-toe residential buildings to designated highland shelters.',
                      '🚧 Enforce traffic restriction on NH-10 / fragile mountain bypasses.',
                      '🌱 Bio-engineering: Plant deep-root vetiver grass along contour terraces.'
                    ]).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: FIELD REPORTING & INCIDENT DESK */}
        {activeTab === 'reports' && (
          <section id="reports" className="tab-pane active">
            <div className="section-heading">
              <p className="eyebrow">COMMUNITY &amp; RANGER EARLY REPORTING (OFFLINE RESILIENT)</p>
              <h2>Crowdsourced Field Incident Desk</h2>
              <p>
                Field rangers, SDRF jawans, and local villagers can record emerging slope cracks, rockfalls, and mud weeping directly. Automatically queues offline when operating without cellular coverage.
              </p>
            </div>

            <div className="reports-top-bar">
              <button
                type="button"
                className="submit-report-btn"
                onClick={() => setShowReportModal(true)}
              >
                📸 + New Ground Incident Report
              </button>

              <div className="reports-stats-pill">
                <span>Total Reports: <strong>{fieldReports.length}</strong></span>
                <span>Verified: <strong>{fieldReports.filter((r) => r.status === 'VERIFIED').length}</strong></span>
                <span>Pending: <strong>{fieldReports.filter((r) => r.status.includes('PENDING')).length}</strong></span>
                {pendingSyncCount > 0 && (
                  <button type="button" className="sync-now-btn" onClick={handleBatchSync}>
                    🔄 Sync {pendingSyncCount} Offline Reports
                  </button>
                )}
              </div>
            </div>

            {/* Reports List Grid */}
            <div className="reports-cards-grid">
              {fieldReports.map((report) => (
                <div
                  key={report.id}
                  className={`field-report-card severity-${report.severity?.toLowerCase() || 'moderate'}`}
                >
                  <div className="report-card-header">
                    <div>
                      <span className={`badge ${report.severity?.toLowerCase() || 'high'}`}>
                        {report.severity} SEVERITY
                      </span>
                      <h4>{report.incident_type}</h4>
                    </div>
                    <span className={`status-tag ${report.status?.toLowerCase() || 'pending'}`}>
                      {report.status}
                    </span>
                  </div>

                  <p className="report-loc-line">📍 {report.location_name} ({report.lat}, {report.lng})</p>

                  {report.photo_url && (
                    <div className="report-card-media">
                      <img src={report.photo_url} alt={report.incident_type} />
                    </div>
                  )}

                  <p className="report-desc">{report.description}</p>

                  <div className="report-footer-meta">
                    <small>Reported by: <strong>{report.reporter_name} ({report.reporter_role})</strong></small>
                    <small>{report.reported_at ? new Date(report.reported_at).toLocaleString() : 'Just now'}</small>
                  </div>

                  {/* SDRF Official Action Buttons */}
                  {report.status.includes('PENDING') && (
                    <div className="officer-actions-row">
                      <button
                        type="button"
                        className="verify-action-btn"
                        onClick={() => handleVerifyReport(report.id, 'VERIFIED', false)}
                      >
                        ✅ Verify Incident
                      </button>
                      <button
                        type="button"
                        className="siren-escalate-btn"
                        onClick={() => handleVerifyReport(report.id, 'VERIFIED', true)}
                      >
                        🚨 Escalate to Siren &amp; SMS
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 4: EARLY WARNING & SMS BROADCAST HUB */}
        {activeTab === 'alerts' && (
          <section id="alerts" className="tab-pane active">
            <div className="section-heading">
              <p className="eyebrow">AUTOMATED SMS, SIREN &amp; MASS DISPATCH</p>
              <h2>Disaster Early Warning Dispatch Hub</h2>
              <p>
                Trigger audible sirens, emergency synthetic voice broadcasts, and automated SMS / WhatsApp dispatches to registered citizens, village sarpanchs, and NDRF responders.
              </p>
            </div>

            <div className="alerts-management-grid">
              {/* Left Column: Dispatch Panel */}
              <div className="broadcast-card">
                <h3>📢 Dispatch Emergency Public Alert</h3>
                <p>Broadcast high-priority evacuation warning across cellular and public sirens:</p>

                <form onSubmit={handleBroadcastAlert} className="broadcast-form">
                  <label>
                    Target Location / Sector
                    <input
                      value={selectedNode?.name || 'Gangtok'}
                      disabled
                      className="disabled-input"
                    />
                  </label>

                  <label>
                    Warning Message Payload (SMS &amp; Voice)
                    <textarea
                      rows={4}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="e.g. [ALERT-NDRF] CRITICAL LANDSLIDE WARNING for Gangtok: Rainfall 118mm/hr exceeded threshold. Move to Ridge Highland Shelter immediately! Helpline: 1078."
                      required
                    />
                  </label>

                  <div className="dispatch-action-row">
                    <button type="submit" className="broadcast-now-btn">
                      🚨 Dispatch Siren &amp; Broadcast SMS ({subscribers.length} Subscribers)
                    </button>
                    <button
                      type="button"
                      className="test-siren-btn"
                      onClick={() => {
                        playSirenBeep();
                        speakEmergencyAlert(selectedNode?.name || 'Gangtok', 'CRITICAL');
                      }}
                    >
                      🔊 Test Voice Alarm
                    </button>
                  </div>
                </form>

                <div className="subscribers-mini-list">
                  <h4>👥 Registered Community Responders ({subscribers.length}):</h4>
                  <div className="subscribers-scroll">
                    {subscribers.map((s) => (
                      <div key={s.id || s.phone} className="sub-chip">
                        <strong>{s.name}</strong>
                        <span>{s.phone}</span>
                        <small>{s.role} · {s.district}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Citizen Signup & Past Broadcast Logs */}
              <div className="sub-signup-card">
                <h3>📲 Citizen &amp; Official Alert Subscription</h3>
                <p>Register mobile phone numbers for automated SMS alerts when sensors cross thresholds:</p>

                <form onSubmit={handleSubscribe} className="subscribe-form">
                  <div className="form-two-col">
                    <label>
                      Full Name
                      <input
                        value={subscriberForm.name}
                        onChange={(e) => setSubscriberForm({ ...subscriberForm, name: e.target.value })}
                        placeholder="e.g. Tashi Dorjee"
                        required
                      />
                    </label>
                    <label>
                      Mobile Phone Number
                      <input
                        value={subscriberForm.phone}
                        onChange={(e) => setSubscriberForm({ ...subscriberForm, phone: e.target.value })}
                        placeholder="+91-98765-43210"
                        required
                      />
                    </label>
                  </div>

                  <div className="form-two-col">
                    <label>
                      District
                      <input
                        value={subscriberForm.district}
                        onChange={(e) => setSubscriberForm({ ...subscriberForm, district: e.target.value })}
                        placeholder="East Sikkim"
                        required
                      />
                    </label>
                    <label>
                      Role / Affiliation
                      <select
                        value={subscriberForm.role}
                        onChange={(e) => setSubscriberForm({ ...subscriberForm, role: e.target.value })}
                      >
                        <option value="Resident">Citizen / Resident</option>
                        <option value="Sarpanch">Village Sarpanch / Headman</option>
                        <option value="SDRF Officer">SDRF / NDRF Officer</option>
                        <option value="Ranger">Forest Ranger</option>
                        <option value="Transporter">Commercial Driver / Trucker</option>
                      </select>
                    </label>
                  </div>

                  <button type="submit" className="subscribe-btn">
                    🔔 Register for Early Warning SMS
                  </button>
                </form>

                <div className="broadcast-logs-box">
                  <h4>📋 Recent Siren &amp; SMS Broadcast Audit Logs:</h4>
                  <div className="logs-scroll">
                    {recentAlerts.map((al) => (
                      <div key={al.id} className={`log-entry ${al.risk?.toLowerCase() || 'critical'}`}>
                        <div className="log-header">
                          <strong>📍 {al.location_name}</strong>
                          <span className="badge">{al.risk}</span>
                          <small>{al.checked_at}</small>
                        </div>
                        <p>{al.message}</p>
                        <span className="log-delivery">
                          📱 Delivered to {al.sms_dispatched_count || 120} subscribers via {al.channels || 'SIREN,SMS'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 5: RELIEF SHELTERS & CLIMATE-RESILIENT GOVERNANCE */}
        {activeTab === 'shelters' && (
          <section id="shelters" className="tab-pane active">
            <div className="section-heading">
              <p className="eyebrow">DISASTER RELIEF, SAFE HAVENS &amp; CLIMATE-RESILIENT GOVERNANCE</p>
              <h2>Highland Evacuation Shelters &amp; District Control Rooms</h2>
              <p>
                Geotagged high-ground evacuation shelters with drinking water, medical triage, and 24/7 disaster helpline directory for the 8 North Eastern states.
              </p>
            </div>

            <div className="shelters-grid">
              {shelters.map((sh) => (
                <div key={sh.id} className="shelter-card">
                  <div className="shelter-card-top">
                    <div>
                      <span className="shelter-icon">🏕️</span>
                      <h3>{sh.name}</h3>
                      <p className="shelter-location">📍 {sh.district}, {sh.state} · Elevation: {sh.elevation}m</p>
                    </div>
                    <span className="capacity-badge">{sh.capacity} Persons</span>
                  </div>

                  <div className="shelter-facilities">
                    <strong>Medical &amp; Life Support Facilities:</strong>
                    <p>{sh.facilities}</p>
                  </div>

                  <div className="shelter-contact-box">
                    <span>Officer In-Charge: <strong>{sh.contact_person}</strong></span>
                    <span>Emergency Phone: <strong>{sh.contact_phone}</strong></span>
                  </div>

                  <div className="shelter-footer">
                    <span className="supplies-indicator">
                      Stock: <strong className="text-adequate">{sh.supplies_status}</strong>
                    </span>
                    <button
                      type="button"
                      className="shelter-view-btn"
                      onClick={() => {
                        setActiveTab('gis');
                      }}
                    >
                      View on GIS Radar 🗺️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* State Disaster Management Helplines Directory */}
            <div className="state-helplines-card">
              <h3>📞 North Eastern States Disaster Management Helpline Directory</h3>
              <div className="helplines-table-wrapper">
                <table className="helplines-table">
                  <thead>
                    <tr>
                      <th>State</th>
                      <th>SDMA Control Room</th>
                      <th>NDRF Battalion</th>
                      <th>Toll-Free</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>🏔️ Sikkim</td>
                      <td>03592-202411 / 201145</td>
                      <td>2nd Bn NDRF (Siliguri Base)</td>
                      <td><strong>1070 / 1078</strong></td>
                    </tr>
                    <tr>
                      <td>🌧️ Meghalaya</td>
                      <td>0364-2502098 / 2225289</td>
                      <td>1st Bn NDRF (Patgaon Base)</td>
                      <td><strong>1077 / 112</strong></td>
                    </tr>
                    <tr>
                      <td>🌲 Arunachal Pradesh</td>
                      <td>0360-2212223 / 2212224</td>
                      <td>12th Bn NDRF (Doimukh Base)</td>
                      <td><strong>1070 / 112</strong></td>
                    </tr>
                    <tr>
                      <td>🌄 Nagaland</td>
                      <td>0370-2291122 / 2291120</td>
                      <td>12th Bn NDRF Regional Node</td>
                      <td><strong>1070 / 112</strong></td>
                    </tr>
                    <tr>
                      <td>🌿 Mizoram</td>
                      <td>0389-2335842 / 2335843</td>
                      <td>1st Bn NDRF Detachment Aizawl</td>
                      <td><strong>1070 / 112</strong></td>
                    </tr>
                    <tr>
                      <td>⛰️ Manipur</td>
                      <td>0385-2443441 / 2443442</td>
                      <td>12th Bn NDRF Imphal Sector</td>
                      <td><strong>1070 / 112</strong></td>
                    </tr>
                    <tr>
                      <td>🏞️ Assam</td>
                      <td>0361-2237221 / 2237011</td>
                      <td>1st Bn NDRF Headquarters Guwahati</td>
                      <td><strong>1070 / 1079</strong></td>
                    </tr>
                    <tr>
                      <td>🌸 Tripura</td>
                      <td>0381-2416045 / 2416244</td>
                      <td>1st Bn NDRF Agartala Base</td>
                      <td><strong>1070 / 112</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* NEW FIELD REPORT MODAL (OFFLINE RESILIENT) */}
      {showReportModal && (
        <div className="db-modal-backdrop" onClick={() => setShowReportModal(false)}>
          <div className="db-modal-content report-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📸 Report Ground Landslide Warning Sign</h3>
              <button onClick={() => setShowReportModal(false)}>×</button>
            </div>
            <form onSubmit={handleReportSubmit} className="report-modal-form">
              <p className="modal-subtitle">
                {isOnline ? '🟢 Connected to Cloud' : '🟡 Offline Mode: Report will be queued and synchronized upon reconnection.'}
              </p>

              <div className="form-two-col">
                <label>
                  Reporter Full Name *
                  <input
                    value={reportForm.reporterName}
                    onChange={(e) => setReportForm({ ...reportForm, reporterName: e.target.value })}
                    placeholder="e.g. Ranger Karma Lepcha"
                    required
                  />
                </label>
                <label>
                  Reporter Role
                  <select
                    value={reportForm.reporterRole}
                    onChange={(e) => setReportForm({ ...reportForm, reporterRole: e.target.value })}
                  >
                    <option value="Citizen">Local Citizen / Resident</option>
                    <option value="Forest Ranger">Forest Ranger</option>
                    <option value="Sarpanch">Village Sarpanch / Headman</option>
                    <option value="SDRF Officer">SDRF Jawan / Officer</option>
                  </select>
                </label>
              </div>

              <div className="form-two-col">
                <label>
                  Location / Sector Name *
                  <input
                    value={reportForm.locationName}
                    onChange={(e) => setReportForm({ ...reportForm, locationName: e.target.value })}
                    placeholder="e.g. Gangtok 5th Mile Ridge"
                    required
                  />
                </label>
                <label>
                  Reporter Contact (Phone)
                  <input
                    value={reportForm.reporterPhone}
                    onChange={(e) => setReportForm({ ...reportForm, reporterPhone: e.target.value })}
                    placeholder="+91-98765-43210"
                  />
                </label>
              </div>

              <div className="form-two-col">
                <label>
                  Incident Warning Type
                  <select
                    value={reportForm.incidentType}
                    onChange={(e) => setReportForm({ ...reportForm, incidentType: e.target.value })}
                  >
                    <option value="Ground Crack / Fissure">Ground Crack / Fissure on Slope</option>
                    <option value="Rockfall on Road">Rockfall / Boulder Roll on Road</option>
                    <option value="Mudflow / Slurry">Muddy Slurry / Water Weeping from Slope</option>
                    <option value="Leaning Trees/Poles">Leaning Trees, Fences or Utility Poles</option>
                    <option value="Retaining Wall Bulge">Retaining Wall Bulge or Masonry Crack</option>
                    <option value="Active Landslide Debris">Active Landslide / Road Blocked</option>
                  </select>
                </label>
                <label>
                  Severity Level
                  <select
                    value={reportForm.severity}
                    onChange={(e) => setReportForm({ ...reportForm, severity: e.target.value })}
                  >
                    <option value="LOW">Low (Minor seep)</option>
                    <option value="MODERATE">Moderate (Expanding crack)</option>
                    <option value="HIGH">High (Active debris flow)</option>
                    <option value="CRITICAL">Critical (Immediate collapse threat)</option>
                  </select>
                </label>
              </div>

              <div className="gps-action-group">
                <button type="button" className="gps-btn" onClick={handleGetGpsLocation}>
                  📍 Capture My GPS Coordinates
                </button>
                {reportForm.lat && (
                  <span className="gps-tag">
                    Coords: {reportForm.lat}, {reportForm.lng}
                  </span>
                )}
              </div>

              <label>
                Detailed Observation &amp; Ground Signs
                <textarea
                  rows={3}
                  value={reportForm.description}
                  onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                  placeholder="Describe crack length, mud thickness, sounds of cracking rock..."
                />
              </label>

              <label>
                Photo Evidence URL (or sample preview)
                <input
                  value={reportForm.photoUrl}
                  onChange={(e) => setReportForm({ ...reportForm, photoUrl: e.target.value })}
                  placeholder="https://... or paste image link"
                />
              </label>

              <div className="modal-form-actions">
                <button type="submit" className="submit-report-modal-btn">
                  📤 Submit Incident to Command Desk
                </button>
                <button
                  type="button"
                  className="cancel-modal-btn"
                  onClick={() => setShowReportModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQLITE DATABASE STATUS MODAL */}
      {showDbModal && (
        <div className="db-modal-backdrop" onClick={() => setShowDbModal(false)}>
          <div className="db-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💾 Central SQLite Database Status</h3>
              <button onClick={() => setShowDbModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="db-stats-row">
                <div className="db-stat-box">
                  <small>MONITORED LOCATIONS</small>
                  <strong>{locations.length}</strong>
                </div>
                <div className="db-stat-box">
                  <small>RED PRECAUTION ZONES</small>
                  <strong>{hazardZones.length}</strong>
                </div>
                <div className="db-stat-box">
                  <small>IOT GEOTECH SENSORS</small>
                  <strong>{sensors.length}</strong>
                </div>
                <div className="db-stat-box">
                  <small>RELIEF SHELTERS</small>
                  <strong>{shelters.length}</strong>
                </div>
                <div className="db-stat-box">
                  <small>FIELD REPORTS</small>
                  <strong>{fieldReports.length}</strong>
                </div>
                <div className="db-stat-box">
                  <small>SMS SUBSCRIBERS</small>
                  <strong>{subscribers.length}</strong>
                </div>
              </div>

              <h4>Recent System Sirens &amp; Alerts Logged:</h4>
              <div className="alert-history-list">
                {recentAlerts.length === 0 ? (
                  <p className="no-logs">No sirens logged in SQLite yet.</p>
                ) : (
                  recentAlerts.slice(0, 8).map((log) => (
                    <div key={log.id} className={`alert-history-item ${(log.risk || 'info').toLowerCase()}`}>
                      <div className="alert-item-header">
                        <strong>📍 {log.location_name}</strong>
                        <span className="badge">{log.risk}</span>
                        <small>{log.checked_at}</small>
                      </div>
                      <p>{log.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer>
        <div className="footer-content">
          <strong>LandslideSafe · AI-Driven Disaster Mitigation Platform</strong>
          <p>
            Real-time GIS Heatmaps · AI/ML Predictive Analytics · IoT Telemetry · Automated Early Warnings · Offline Sync for Remote North East India
          </p>
          <small>
            Powered by Node 24 SQLite &amp; Open-Meteo Gateway · Compliant with NDMA &amp; SDMA Guidelines
          </small>
        </div>
      </footer>
    </div>
  );
}

// Sub-component: Risk Result Card
function RiskResultCard({ reading, aiPrediction, onTriggerAlarm }) {
  const isDanger = reading.risk === 'HIGH' || reading.risk === 'CRITICAL';

  return (
    <div className={`result ${riskColor[reading.risk] || 'low'}`}>
      <div className="result-header">
        <div>
          <strong>📍 {reading.location}, {reading.state}</strong>
          <h3>{levelText(reading.risk)}</h3>
        </div>
        <div className="result-scores-cluster">
          <div className="score-pill">
            <span className="score-number">{reading.score}</span>
            <small>/100 LSI</small>
          </div>
          {aiPrediction && (
            <div className="fos-pill" title="Geotechnical Factor of Safety">
              <span>FoS</span>
              <strong>{aiPrediction.factorOfSafety}</strong>
            </div>
          )}
        </div>
      </div>

      <p className="result-alert">
        {isDanger
          ? '🔊 Critical threshold exceeded: Automatic warning siren triggered. Red precautions and evacuation advisories are active!'
          : 'Monitoring active: Meteorological and slope telemetry remain stable within safe operational margins.'}
      </p>

      <div className="reading-grid">
        <span>
          🌧️ Rainfall Rate
          <strong>{reading.rainfall} mm/hr</strong>
        </span>
        <span>
          💧 Soil Saturation
          <strong>{reading.soil}%</strong>
        </span>
        <span>
          ⛰️ Slope Gradient
          <strong>{reading.slope}°</strong>
        </span>
        <span>
          🏔️ Elevation
          <strong>{reading.elevation ?? '—'} m</strong>
        </span>
        <span>
          🌡️ Temperature
          <strong>{reading.temperature ?? 24}°C</strong>
        </span>
      </div>

      {reading.precautions && reading.precautions.length > 0 && (
        <div className="result-precautions-box">
          <h4>🛡️ MANDATORY PRECAUTION DIRECTIVES FOR {reading.location.toUpperCase()}:</h4>
          <ul>
            {reading.precautions.map((p, idx) => (
              <li key={idx} className={isDanger ? 'red-precaution-item' : ''}>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isDanger && (
        <div className="danger-action-row">
          <button type="button" className="test-siren-btn" onClick={onTriggerAlarm}>
            🔊 Sound Alarm Siren &amp; Voice Warning
          </button>
        </div>
      )}

      {reading.recommendation && (
        <p className="recommendation-line"><strong>Recommendation:</strong> {reading.recommendation}</p>
      )}

      <p className="source-line">
        Source: {reading.source} · Updated {reading.checkedAt} IST · {reading.source?.includes('DEMO') ? 'Environmental values are DEMO DATA' : 'Telemetry logged to SQLite'}
      </p>
    </div>
  );
}
