import { db, initDb } from './db.js';

console.log('Migrating and seeding comprehensive LandslideSafe SQLite database...');

// Cleanly drop and recreate tables with comprehensive schema
initDb(true);

// 1. Seed Comprehensive Monitored Locations (Focusing on North East & fragile Himalayan corridors)
const locations = [
  {
    id: 'gangtok',
    name: 'Gangtok',
    state: 'Sikkim',
    district: 'East Sikkim',
    lat: 27.3389,
    lng: 88.6065,
    elevation: 1650,
    slope: 46,
    demoSoil: 93,
    lithology: 'Weathered Daling Phyllites & Chlorite Schist',
    vegetationIndex: 0.58,
    populationAtRisk: 28000,
    historicalEvents: 14,
    isHotspot: 1,
    risk: 'CRITICAL',
    score: 96
  },
  {
    id: 'mawsynram',
    name: 'Mawsynram',
    state: 'Meghalaya',
    district: 'East Khasi Hills',
    lat: 25.304,
    lng: 91.5822,
    elevation: 1400,
    slope: 42,
    demoSoil: 88,
    lithology: 'Karst Cretaceous Sandstone & Shale Interbeds',
    vegetationIndex: 0.72,
    populationAtRisk: 12500,
    historicalEvents: 11,
    isHotspot: 1,
    risk: 'HIGH',
    score: 85
  },
  {
    id: 'cherrapunji',
    name: 'Cherrapunji (Sohra)',
    state: 'Meghalaya',
    district: 'East Khasi Hills',
    lat: 25.27,
    lng: 91.73,
    elevation: 1484,
    slope: 38,
    demoSoil: 74,
    lithology: 'Therria Sandstone with Karst Escarpments',
    vegetationIndex: 0.64,
    populationAtRisk: 14200,
    historicalEvents: 8,
    isHotspot: 1,
    risk: 'MEDIUM',
    score: 62
  },
  {
    id: 'chamoli',
    name: 'Chamoli / Joshimath',
    state: 'Uttarakhand',
    district: 'Chamoli',
    lat: 30.5564,
    lng: 79.5638,
    elevation: 1890,
    slope: 48,
    demoSoil: 89,
    lithology: 'Vaikrita Tectonic Thrust Zone & Glacial Moraines',
    vegetationIndex: 0.42,
    populationAtRisk: 22000,
    historicalEvents: 19,
    isHotspot: 1,
    risk: 'CRITICAL',
    score: 94
  },
  {
    id: 'darjeeling',
    name: 'Darjeeling',
    state: 'West Bengal',
    district: 'Darjeeling',
    lat: 27.041,
    lng: 88.2663,
    elevation: 2042,
    slope: 44,
    demoSoil: 85,
    lithology: 'High-grade Gneiss with High Weathering Mantle',
    vegetationIndex: 0.61,
    populationAtRisk: 34000,
    historicalEvents: 16,
    isHotspot: 1,
    risk: 'HIGH',
    score: 81
  },
  {
    id: 'aizawl',
    name: 'Aizawl',
    state: 'Mizoram',
    district: 'Aizawl',
    lat: 23.7271,
    lng: 92.7176,
    elevation: 1132,
    slope: 39,
    demoSoil: 68,
    lithology: 'Surma Group Siltstone & Friable Shale',
    vegetationIndex: 0.76,
    populationAtRisk: 36000,
    historicalEvents: 9,
    isHotspot: 1,
    risk: 'MEDIUM',
    score: 58
  },
  {
    id: 'itanagar',
    name: 'Itanagar',
    state: 'Arunachal Pradesh',
    district: 'Papum Pare',
    lat: 27.0844,
    lng: 93.6053,
    elevation: 750,
    slope: 35,
    demoSoil: 67,
    lithology: 'Siwalik Molasse Sandstone & Silt Bedding',
    vegetationIndex: 0.81,
    populationAtRisk: 19000,
    historicalEvents: 6,
    isHotspot: 0,
    risk: 'MEDIUM',
    score: 54
  },
  {
    id: 'kohima',
    name: 'Kohima',
    state: 'Nagaland',
    district: 'Kohima',
    lat: 25.6701,
    lng: 94.1077,
    elevation: 1444,
    slope: 41,
    demoSoil: 71,
    lithology: 'Disang Shales with High Swelling Smectite Clays',
    vegetationIndex: 0.74,
    populationAtRisk: 24000,
    historicalEvents: 10,
    isHotspot: 1,
    risk: 'HIGH',
    score: 72
  },
  {
    id: 'shillong',
    name: 'Shillong',
    state: 'Meghalaya',
    district: 'East Khasi Hills',
    lat: 25.5788,
    lng: 91.8933,
    elevation: 1525,
    slope: 33,
    demoSoil: 62,
    lithology: 'Shillong Plateau Quartzites & Regolith',
    vegetationIndex: 0.69,
    populationAtRisk: 31000,
    historicalEvents: 4,
    isHotspot: 0,
    risk: 'LOW',
    score: 32
  },
  {
    id: 'guwahati',
    name: 'Guwahati (Hills)',
    state: 'Assam',
    district: 'Kamrup Metro',
    lat: 26.1445,
    lng: 91.7362,
    elevation: 180,
    slope: 34,
    demoSoil: 59,
    lithology: 'Precambrian Granite Gneiss residual soil cap',
    vegetationIndex: 0.52,
    populationAtRisk: 42000,
    historicalEvents: 7,
    isHotspot: 0,
    risk: 'MEDIUM',
    score: 48
  },
  {
    id: 'imphal',
    name: 'Imphal / Senapati',
    state: 'Manipur',
    district: 'Senapati',
    lat: 25.2667,
    lng: 94.0167,
    elevation: 1250,
    slope: 40,
    demoSoil: 76,
    lithology: 'Disang-Barail Complex fractured flysch',
    vegetationIndex: 0.71,
    populationAtRisk: 18000,
    historicalEvents: 8,
    isHotspot: 1,
    risk: 'HIGH',
    score: 78
  },
  {
    id: 'tawang',
    name: 'Tawang Pass Corridor',
    state: 'Arunachal Pradesh',
    district: 'Tawang',
    lat: 27.586,
    lng: 91.8594,
    elevation: 3048,
    slope: 51,
    demoSoil: 84,
    lithology: 'High Himalayan Crystalline Schist & Gneiss',
    vegetationIndex: 0.44,
    populationAtRisk: 11000,
    historicalEvents: 12,
    isHotspot: 1,
    risk: 'HIGH',
    score: 82
  }
];

const upsertLocation = db.prepare(`
  INSERT INTO locations (
    id, name, state, district, lat, lng, elevation, slope, demo_soil,
    lithology, vegetation_index, population_at_risk, historical_events,
    risk_level, last_score, is_hazard_hotspot, last_checked
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name,
    state=excluded.state,
    district=excluded.district,
    lat=excluded.lat,
    lng=excluded.lng,
    elevation=excluded.elevation,
    slope=excluded.slope,
    demo_soil=excluded.demo_soil,
    lithology=excluded.lithology,
    vegetation_index=excluded.vegetation_index,
    population_at_risk=excluded.population_at_risk,
    historical_events=excluded.historical_events,
    risk_level=excluded.risk_level,
    last_score=excluded.last_score,
    is_hazard_hotspot=excluded.is_hazard_hotspot,
    last_checked=datetime('now')
`);

for (const loc of locations) {
  upsertLocation.run(
    loc.id,
    loc.name,
    loc.state,
    loc.district,
    loc.lat,
    loc.lng,
    loc.elevation,
    loc.slope,
    loc.demoSoil,
    loc.lithology,
    loc.vegetationIndex,
    loc.populationAtRisk,
    loc.historicalEvents,
    loc.risk,
    loc.score,
    loc.isHotspot
  );
}

// 2. Seed Red Hazard Precaution Zones with specific perimeters
const hazardZones = [
  {
    id: 'hz_gangtok',
    name: 'Gangtok Hillside & Rani Khola Hazard Belt',
    state: 'Sikkim',
    lat: 27.3389,
    lng: 88.6065,
    radius_meters: 16000,
    hazard_level: 'CRITICAL',
    slope: 46,
    soil_saturation: 93,
    rainfall_threshold: 85,
    danger_description: 'High susceptibility to rotational landslides, debris flows, and active subsidence along NH-10 corridor connecting Siliguri to Gangtok.',
    precautions: [
      '🚨 IMMEDIATE EVACUATION: Evacuate slope-toe settlements and valleys within the 16km red perimeter.',
      '⛔ TRAVEL HALT: Cease all vehicular traffic along NH-10 and fragile mountain bypasses.',
      '🌊 DRAINAGE & FISSURE INSPECTION: Clear stormwater chutes immediately; divert excess runoff away from slope crests.',
      '📢 EARLY SIREN COMPLIANCE: Upon hearing the automated sirens, move uphill to designated reinforced shelter nodes.',
      '⚡ UTILITY SHUTDOWN: Cut domestic gas and power supply lines prior to departing vulnerable buildings.'
    ],
    evacuation_route: 'Uphill towards ridge shelter via Ridge Park Road, avoiding riverward gullies.',
    emergency_contact: 'State SDRF: 1070 | NDRF Command: 1078 | District Control: 03592-202411'
  },
  {
    id: 'hz_mawsynram',
    name: 'Mawsynram Valley Crest & Gorge Red Zone',
    state: 'Meghalaya',
    lat: 25.304,
    lng: 91.5822,
    radius_meters: 18000,
    hazard_level: 'CRITICAL',
    slope: 42,
    soil_saturation: 88,
    rainfall_threshold: 90,
    danger_description: 'Extreme rainfall saturation on karst sandstone slopes; acute danger of sudden translational rock and mud torrents in gorge cuts.',
    precautions: [
      '🔴 RED ZONE CLEARANCE: Stay away from sheer cliff bases, river bends, and historic slip scars.',
      '⚠️ GROUND MONITORING: Report sudden ground fissures, tilting electric poles, or muddy water springs to local authorities.',
      '🚫 STREAM RESTRICTIONS: Under no circumstances attempt to cross flooded mountain streams or gullies.',
      '🎒 SURVIVAL KIT: Keep 72-hour emergency pack with waterproof radio, first aid, and drinking water ready.',
      '📡 SENSOR VIGIL: Continuous rainfall telemetry active; monitor automated siren broadcast.'
    ],
    evacuation_route: 'Eastward highland evacuation route to Mawsynram Community Disaster Centre.',
    emergency_contact: 'Meghalaya SDMA: 1077 | Police Control: 112 | Mawsynram Hospital: 03631-275222'
  },
  {
    id: 'hz_chamoli',
    name: 'Chamoli - Joshimath Subsidence Belt',
    state: 'Uttarakhand',
    lat: 30.5564,
    lng: 79.5638,
    radius_meters: 15000,
    hazard_level: 'CRITICAL',
    slope: 48,
    soil_saturation: 89,
    rainfall_threshold: 75,
    danger_description: 'Fragile tectonic shear zone with active slope creep, glacial outwash instability, and rapid water infiltration risks.',
    precautions: [
      '🔴 CRITICAL EVACUATION: Immediate halt to all earthworks, heavy vehicle traffic, and slope excavation.',
      '🏃 SHELTER RELOCATION: Occupants of cracked masonry structures must evacuate to designated relief camps.',
      '🚧 HIGHWAY CLOSURE: Badrinath National Highway (NH-07) subject to instant closure during red alerts.',
      '🚨 AUTOMATED SIREN: Evacuate uphill immediately when warning tone sounds.'
    ],
    evacuation_route: 'Upward migration towards Auli Highland Disaster Base Camps.',
    emergency_contact: 'Uttarakhand SDMA: 1070 | Chamoli Disaster Cell: 01372-251077'
  },
  {
    id: 'hz_darjeeling',
    name: 'Darjeeling - Tindharia Hill Ridge Zone',
    state: 'West Bengal',
    lat: 27.041,
    lng: 88.2663,
    radius_meters: 14000,
    hazard_level: 'HIGH',
    slope: 44,
    soil_saturation: 85,
    rainfall_threshold: 80,
    danger_description: 'Deep weathering mantles on steep tea estate slopes; high vulnerability to torrential downpours triggering mud avalanches.',
    precautions: [
      '⚠️ ROADSIDE VIGIL: Prohibit parking beneath steep cuttings on Hill Cart Road.',
      '🪵 CLEAR DEBRIS: Remove fallen timber and rocks blocking municipal hillside drainage.',
      '🚨 EVACUATE TOE DWELLINGS: Move families living at slope bases to municipal schools.'
    ],
    evacuation_route: 'Via Lebong Cart Road to Darjeeling Gymkhana Highland Safe Shelter.',
    emergency_contact: 'Darjeeling Disaster Control: 0354-2255749 | NDRF 2nd Bn: 1078'
  },
  {
    id: 'hz_kohima',
    name: 'Kohima Sanuorü - Dzükou Valley Slope Sector',
    state: 'Nagaland',
    lat: 25.6701,
    lng: 94.1077,
    radius_meters: 13000,
    hazard_level: 'HIGH',
    slope: 41,
    soil_saturation: 81,
    rainfall_threshold: 70,
    danger_description: 'Swelling Disang shales and structural faults; expansive soils cause massive sinking along NH-29 during monsoon pulses.',
    precautions: [
      '🚧 HEAVY TRUCK DIVERSION: Divert multi-axle freight vehicles from unstable NH-29 bypass sections.',
      '🔍 CRACK MONITORING: Report expanding ground fractures across pavements or building foundations.',
      '🦺 COMMUNITY RESPONSE: Village Disaster Management Committees on high standby.'
    ],
    evacuation_route: 'Route towards Kohima Local Ground Highland Community Hall.',
    emergency_contact: 'Nagaland NSDMA: 1070 | Kohima Control: 0370-2291122'
  }
];

const upsertHazardZone = db.prepare(`
  INSERT INTO hazard_zones (
    id, name, state, lat, lng, radius_meters, hazard_level, slope,
    soil_saturation, rainfall_threshold, danger_description, precautions_json,
    evacuation_route, emergency_contact, active
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name,
    state=excluded.state,
    lat=excluded.lat,
    lng=excluded.lng,
    radius_meters=excluded.radius_meters,
    hazard_level=excluded.hazard_level,
    slope=excluded.slope,
    soil_saturation=excluded.soil_saturation,
    rainfall_threshold=excluded.rainfall_threshold,
    danger_description=excluded.danger_description,
    precautions_json=excluded.precautions_json,
    evacuation_route=excluded.evacuation_route,
    emergency_contact=excluded.emergency_contact,
    active=1
`);

for (const hz of hazardZones) {
  upsertHazardZone.run(
    hz.id,
    hz.name,
    hz.state,
    hz.lat,
    hz.lng,
    hz.radius_meters,
    hz.hazard_level,
    hz.slope,
    hz.soil_saturation,
    hz.rainfall_threshold,
    hz.danger_description,
    JSON.stringify(hz.precautions),
    hz.evacuation_route,
    hz.emergency_contact
  );
}

// 3. Seed IoT Geotechnical Sensors
const sensors = [
  {
    id: 'sn_gt_inc_01',
    name: 'Gangtok Rani Khola Inclinometer Array',
    locationId: 'gangtok',
    locationName: 'Gangtok, Sikkim',
    lat: 27.332,
    lng: 88.601,
    sensorType: 'Inclinometer (Tilt)',
    currentValue: 1.48,
    unit: 'deg/day (Warning > 0.8)',
    batteryLevel: 94,
    signalStrength: 89,
    status: 'ALERT'
  },
  {
    id: 'sn_gt_piez_02',
    name: 'Gangtok Ridge Piezometer (Pore Pressure)',
    locationId: 'gangtok',
    locationName: 'Gangtok, Sikkim',
    lat: 27.341,
    lng: 88.612,
    sensorType: 'Vibrating Wire Piezometer',
    currentValue: 88.4,
    unit: 'kPa (Warning > 60)',
    batteryLevel: 91,
    signalStrength: 82,
    status: 'ALERT'
  },
  {
    id: 'sn_maw_rain_01',
    name: 'Mawsynram Crest Tipping Rain Gauge',
    locationId: 'mawsynram',
    locationName: 'Mawsynram, Meghalaya',
    lat: 25.308,
    lng: 91.586,
    sensorType: 'Tipping Rain Gauge',
    currentValue: 114.2,
    unit: 'mm/hr',
    batteryLevel: 87,
    signalStrength: 95,
    status: 'ALERT'
  },
  {
    id: 'sn_maw_tdr_02',
    name: 'Mawsynram Gorge TDR Soil Moisture Probe',
    locationId: 'mawsynram',
    locationName: 'Mawsynram, Meghalaya',
    lat: 25.301,
    lng: 91.579,
    sensorType: 'TDR Soil Moisture Probe',
    currentValue: 91.5,
    unit: '% Volumetric Saturation',
    batteryLevel: 96,
    signalStrength: 91,
    status: 'ALERT'
  },
  {
    id: 'sn_cham_inc_01',
    name: 'Joshimath Sunildhar Inclinometer',
    locationId: 'chamoli',
    locationName: 'Chamoli / Joshimath, Uttarakhand',
    lat: 30.551,
    lng: 79.569,
    sensorType: 'Inclinometer (Tilt)',
    currentValue: 1.92,
    unit: 'deg/day',
    batteryLevel: 90,
    signalStrength: 78,
    status: 'ALERT'
  },
  {
    id: 'sn_aiz_piez_01',
    name: 'Aizawl Durtlang Piezometer Node',
    locationId: 'aizawl',
    locationName: 'Aizawl, Mizoram',
    lat: 23.731,
    lng: 92.719,
    sensorType: 'Vibrating Wire Piezometer',
    currentValue: 34.2,
    unit: 'kPa',
    batteryLevel: 98,
    signalStrength: 93,
    status: 'ONLINE'
  },
  {
    id: 'sn_koh_ext_01',
    name: 'Kohima NH-29 Crack Extensometer',
    locationId: 'kohima',
    locationName: 'Kohima, Nagaland',
    lat: 25.668,
    lng: 94.103,
    sensorType: 'Crack Wire Extensometer',
    currentValue: 6.8,
    unit: 'mm/24h displacement',
    batteryLevel: 89,
    signalStrength: 86,
    status: 'ONLINE'
  },
  {
    id: 'sn_darj_rain_01',
    name: 'Darjeeling Birch Hill Rain Gauge',
    locationId: 'darjeeling',
    locationName: 'Darjeeling, West Bengal',
    lat: 27.045,
    lng: 88.261,
    sensorType: 'Tipping Rain Gauge',
    currentValue: 72.5,
    unit: 'mm/hr',
    batteryLevel: 92,
    signalStrength: 90,
    status: 'ONLINE'
  }
];

const upsertSensor = db.prepare(`
  INSERT INTO sensors (
    id, name, location_id, location_name, lat, lng, sensor_type,
    current_value, unit, battery_level, signal_strength, status, last_telemetry
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name,
    current_value=excluded.current_value,
    battery_level=excluded.battery_level,
    signal_strength=excluded.signal_strength,
    status=excluded.status,
    last_telemetry=datetime('now')
`);

for (const s of sensors) {
  upsertSensor.run(
    s.id,
    s.name,
    s.locationId,
    s.locationName,
    s.lat,
    s.lng,
    s.sensorType,
    s.currentValue,
    s.unit,
    s.batteryLevel,
    s.signalStrength,
    s.status
  );
}

// 4. Seed Highland Evacuation Shelters & Relief Hubs
const shelters = [
  {
    id: 'sh_gt_01',
    name: 'Paljor Stadium Highland Relief Shelter',
    state: 'Sikkim',
    district: 'East Sikkim',
    lat: 27.3325,
    lng: 88.613,
    elevation: 1720,
    capacity: 2500,
    suppliesStatus: 'ADEQUATE',
    contactPerson: 'Capt. Tenzing Norbu (SDRF)',
    contactPhone: '+91-94340-11223',
    facilities: 'Medical triage unit, diesel power generators, emergency food pantry, satellite comms'
  },
  {
    id: 'sh_gt_02',
    name: 'Ridge Park High Ground Community Center',
    state: 'Sikkim',
    district: 'East Sikkim',
    lat: 27.341,
    lng: 88.618,
    elevation: 1780,
    capacity: 1200,
    suppliesStatus: 'ADEQUATE',
    contactPerson: 'S. Sharma (Dist. Magistrate Off.)',
    contactPhone: '+91-94340-55667',
    facilities: 'Drinking water tanks, blankets, primary medical kit'
  },
  {
    id: 'sh_maw_01',
    name: 'Mawsynram Central Highland Hall',
    state: 'Meghalaya',
    district: 'East Khasi Hills',
    lat: 25.309,
    lng: 91.589,
    elevation: 1450,
    capacity: 1800,
    suppliesStatus: 'ADEQUATE',
    contactPerson: 'B. Marbaniang (Block Dev Officer)',
    contactPhone: '+91-94361-33445',
    facilities: 'Helipad access, water purifiers, solar lighting arrays, VHF emergency radio'
  },
  {
    id: 'sh_cham_01',
    name: 'Auli Highland Disaster Relief Base Camp',
    state: 'Uttarakhand',
    district: 'Chamoli',
    lat: 30.531,
    lng: 79.57,
    elevation: 2500,
    capacity: 3500,
    suppliesStatus: 'ADEQUATE',
    contactPerson: 'Maj. R. Rawat (NDRF 8th Bn)',
    contactPhone: '+91-94120-77889',
    facilities: 'Full trauma care center, heated tents, aerial rescue staging ground'
  },
  {
    id: 'sh_darj_01',
    name: 'Darjeeling Gymkhana Safe Ridge Assembly',
    state: 'West Bengal',
    district: 'Darjeeling',
    lat: 27.0435,
    lng: 88.267,
    elevation: 2110,
    capacity: 2000,
    suppliesStatus: 'ADEQUATE',
    contactPerson: 'A. Pradhan (SDRF Coordinator)',
    contactPhone: '+91-94341-99881',
    facilities: 'First aid post, community kitchen, warm clothes cache'
  },
  {
    id: 'sh_koh_01',
    name: 'Kohima Local Ground Community Safe Complex',
    state: 'Nagaland',
    district: 'Kohima',
    lat: 25.673,
    lng: 94.112,
    elevation: 1480,
    capacity: 2200,
    suppliesStatus: 'ADEQUATE',
    contactPerson: 'T. Jamir (NSDMA Officer)',
    contactPhone: '+91-94360-12345',
    facilities: 'Emergency medical unit, diesel generators, mobile telecommunication tower'
  }
];

const upsertShelter = db.prepare(`
  INSERT INTO shelters (
    id, name, state, district, lat, lng, elevation, capacity,
    supplies_status, contact_person, contact_phone, facilities
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name,
    capacity=excluded.capacity,
    supplies_status=excluded.supplies_status,
    contact_person=excluded.contact_person,
    contact_phone=excluded.contact_phone,
    facilities=excluded.facilities
`);

for (const sh of shelters) {
  upsertShelter.run(
    sh.id,
    sh.name,
    sh.state,
    sh.district,
    sh.lat,
    sh.lng,
    sh.elevation,
    sh.capacity,
    sh.suppliesStatus,
    sh.contactPerson,
    sh.contactPhone,
    sh.facilities
  );
}

// 5. Seed Initial Crowdsourced Citizen & Field Ranger Reports
const initialFieldReports = [
  {
    id: 'rep_001',
    reporterName: 'Pema Wangdi (Forest Ranger)',
    reporterPhone: '+91-98765-43210',
    reporterRole: 'Forest Ranger',
    locationName: 'Gangtok - 5th Mile Ridge',
    lat: 27.345,
    lng: 88.614,
    incidentType: 'Ground Crack / Fissure',
    severity: 'HIGH',
    description: 'Noticed a 15-meter longitudinal fissure across the uphill walking track. Fissure depth approximately 40cm. Water seepage observed at lower toe.',
    photoUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb39f?auto=format&fit=crop&w=600&q=80',
    status: 'VERIFIED',
    verifiedBy: 'SDRF Sub-Inspector Chettri',
    isOfflineSynced: 1,
    reportedAt: '2026-09-09 09:30 AM'
  },
  {
    id: 'rep_002',
    reporterName: 'Kharmawphlang Village Head',
    reporterPhone: '+91-94361-99882',
    reporterRole: 'Sarpanch / Headman',
    locationName: 'Mawsynram Valley Road',
    lat: 25.302,
    lng: 91.58,
    incidentType: 'Rockfall on Road',
    severity: 'CRITICAL',
    description: 'Heavy boulders (up to 1.5m diameter) tumbled onto single-lane connection to dispensary. Road currently impassable for ambulances.',
    photoUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    status: 'VERIFIED',
    verifiedBy: 'Meghalaya PWD & SDMA',
    isOfflineSynced: 1,
    reportedAt: '2026-09-09 10:15 AM'
  },
  {
    id: 'rep_003',
    reporterName: 'Dawa Lepcha (Local Resident)',
    reporterPhone: '+91-98001-22334',
    reporterRole: 'Citizen',
    locationName: 'Darjeeling Lebong Toe Slope',
    lat: 27.048,
    lng: 88.263,
    incidentType: 'Mudflow / Slurry',
    severity: 'MODERATE',
    description: 'Muddy slurry running into backyard drainage ditch following 3 hours of continuous torrential rain. Retaining wall showing slight deflection.',
    photoUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    status: 'PENDING',
    verifiedBy: null,
    isOfflineSynced: 0,
    reportedAt: '2026-09-09 11:45 AM'
  }
];

const upsertFieldReport = db.prepare(`
  INSERT INTO field_reports (
    id, reporter_name, reporter_phone, reporter_role, location_name,
    lat, lng, incident_type, severity, description, photo_url,
    status, verified_by, is_offline_synced, reported_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    status=excluded.status,
    verified_by=excluded.verified_by
`);

for (const r of initialFieldReports) {
  upsertFieldReport.run(
    r.id,
    r.reporterName,
    r.reporterPhone,
    r.reporterRole,
    r.locationName,
    r.lat,
    r.lng,
    r.incidentType,
    r.severity,
    r.description,
    r.photoUrl,
    r.status,
    r.verifiedBy,
    r.isOfflineSynced,
    r.reportedAt
  );
}

// 6. Seed Initial Subscribers for Early Warning Broadcasts
const subscribers = [
  { name: 'Dr. Sonam Bhutia', phone: '+91-94340-90001', district: 'East Sikkim', state: 'Sikkim', role: 'SDRF Officer', channel: 'SMS' },
  { name: 'Khasi Hills Sarpanch Council', phone: '+91-94361-90002', district: 'East Khasi Hills', state: 'Meghalaya', role: 'Sarpanch', channel: 'SMS' },
  { name: 'Chamoli Disaster Control Room', phone: '+91-94120-90003', district: 'Chamoli', state: 'Uttarakhand', role: 'Disaster Official', channel: 'SMS' },
  { name: 'BRO Beacon Officer In-Charge', phone: '+91-98765-90004', district: 'Papum Pare', state: 'Arunachal Pradesh', role: 'Border Roads Org', channel: 'SMS' }
];

const upsertSub = db.prepare(`
  INSERT INTO subscribers (name, phone, district, state, role, preferred_channel, active, created_at)
  VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
  ON CONFLICT(phone) DO NOTHING
`);

for (const sub of subscribers) {
  upsertSub.run(sub.name, sub.phone, sub.district, sub.state, sub.role, sub.channel);
}

// 7. Seed Initial Alerts
const initialAlerts = [
  {
    locationId: 'gangtok',
    locationName: 'Gangtok',
    risk: 'CRITICAL',
    message: 'Automatic Siren ON: Gangtok crossed critical landslide threshold (Rainfall: 118mm/hr, Soil Saturation: 93%, Slope: 46°). Evacuate slope-toe settlements to Paljor Stadium Shelter!',
    smsCount: 1420,
    automatic: 1,
    checkedAt: '10:45 AM'
  },
  {
    locationId: 'mawsynram',
    locationName: 'Mawsynram',
    risk: 'CRITICAL',
    message: 'High Hazard Siren ON: Mawsynram gorge crest saturation reached 88%. Flash mudflow warning issued along village links.',
    smsCount: 890,
    automatic: 1,
    checkedAt: '11:15 AM'
  }
];

const insertAlert = db.prepare(`
  INSERT INTO alerts (location_id, location_name, risk, message, sms_dispatched_count, channels, automatic, checked_at)
  VALUES (?, ?, ?, ?, ?, 'SIREN,SMS,APP', ?, ?)
`);

for (const a of initialAlerts) {
  insertAlert.run(a.locationId, a.locationName, a.risk, a.message, a.smsCount, a.automatic, a.checkedAt);
}

console.log('Comprehensive database seed completed successfully!');
