import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { 
  getFirestore as getClientFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  writeBatch, 
  onSnapshot as onClientSnapshot, 
  query, 
  limit, 
  updateDoc as updateClientDoc, 
  orderBy, 
  collectionGroup, 
  arrayUnion, 
  arrayRemove, 
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin (still useful for Auth if needed)
const adminApp = admin.initializeApp();

// Use Client SDK for Firestore on server to bypass service account permission issues
const clientApp = initializeClientApp(firebaseConfig);
const db = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    }
  });

  const PORT = 3000;

  // --- Initial Data (Seed if empty) ---
  const initialBridges = [
    { 
      id: 'tn-pamban', name: 'Pamban Bridge', location: 'Rameswaram', type: 'Marine Bridge', status: 'GREEN', lat: 9.2778, lng: 79.2083,
      monitorInfo: { sensorId: 'SN-PMB-927', maintenanceTeam: 'South Railway Zone', lastCalibration: '2026-03-10' },
      history: [
        { year: '1914', event: 'Original bridge opened by British Rail' },
        { year: '1964', event: 'Survived major cyclone that washed away Dhanushkodi' },
        { year: '1988', event: 'Road bridge (Annai Indira Gandhi) opened adjacent' },
        { year: '2023', event: 'New vertical lift bridge construction major milestone' }
      ]
    },
    { 
      id: 'tn-napier', name: 'Napier Bridge', location: 'Chennai', type: 'River Bridge', status: 'GREEN', lat: 13.0694, lng: 80.2811,
      monitorInfo: { sensorId: 'SN-NAP-130', maintenanceTeam: 'Chennai Corp Eng', lastCalibration: '2026-02-15' },
      history: [
        { year: '1869', event: 'Built by Francis Napier, Governor of Madras' },
        { year: '1999', event: 'Major reconstruction with modern lighting system' },
        { year: '2022', event: 'Painted in Chessboard pattern for 44th Chess Olympiad' }
      ]
    },
    { 
      id: 'tn-kallanai', name: 'Grand Anicut (Kallanai)', location: 'Thanjavur', type: 'Arch Bridge', status: 'GREEN', lat: 10.8333, lng: 78.8167,
      monitorInfo: { sensorId: 'SN-KAL-108', maintenanceTeam: 'Cauvery Delta Admin', lastCalibration: '2026-01-20' },
      history: [
        { year: '2nd Century', event: 'Original dam built by Karikala Chola' },
        { year: '1804', event: 'Modern British stone masonry added by Capt. Caldwell' },
        { year: '2021', event: 'Received World Heritage Irrigation Structure award' }
      ]
    },
    { 
      id: 'tn-coleroon', name: 'Coleroon Bridge', location: 'Trichy', type: 'River Bridge', status: 'AMBER', lat: 10.8661, lng: 78.7111,
      monitorInfo: { sensorId: 'SN-COL-866', maintenanceTeam: 'Trichy PWD', lastCalibration: '2026-04-01' },
      history: [
        { year: '1924', event: 'Old bridge constructed during British era' },
        { year: '2018', event: 'Significant scouring detected in river bed' },
        { year: '2022', event: 'New parallel bridge opened to heavy traffic' }
      ]
    },
    { 
      id: 'tn-vaigai', name: 'Albert Victor Bridge', location: 'Madurai', type: 'River Bridge', status: 'GREEN', lat: 9.9239, lng: 78.1250,
      monitorInfo: { sensorId: 'SN-VAI-992', maintenanceTeam: 'Madurai PWD', lastCalibration: '2026-03-05' },
      history: [
        { year: '1889', event: 'Opened to public across Vaigai River' },
        { year: '2015', event: 'Pedestrian plaza and river beautification integration' }
      ]
    },
    { 
      id: 'tn-kathipara', name: 'Kathipara Interchange', location: 'Chennai', type: 'Flyover', status: 'GREEN', lat: 13.0067, lng: 80.2017,
      monitorInfo: { sensorId: 'SN-KAT-130', maintenanceTeam: 'NHAI Chennai', lastCalibration: '2025-12-15' }
    },
    { 
      id: 'tn-metturb', name: 'Mettur Bridge', location: 'Mettur', type: 'Dam Bridge', status: 'GREEN', lat: 11.7761, lng: 77.8011,
      monitorInfo: { sensorId: 'SN-MET-117', maintenanceTeam: 'Mettur Dam Auth', lastCalibration: '2026-04-10' }
    },
    { 
      id: 'tn-ennore', name: 'Ennore Creek Bridge', location: 'Ennore', type: 'Railway Bridge', status: 'AMBER', lat: 13.2167, lng: 80.3167,
      monitorInfo: { sensorId: 'SN-ENN-132', maintenanceTeam: 'Southern Railways', lastCalibration: '2026-02-28' }
    },
    { 
      id: 'tn-siruvani', name: 'Siruvani Bridge', location: 'Coimbatore', type: 'Canyon Bridge', status: 'GREEN', lat: 10.9333, lng: 76.6833,
      monitorInfo: { sensorId: 'SN-SIR-109', maintenanceTeam: 'Coimbatore PWD', lastCalibration: '2026-01-15' }
    },
    { 
      id: 'tn-adyar', name: 'Thiru Vi Ka Bridge', location: 'Adyar', type: 'City Bridge', status: 'RED', lat: 13.0111, lng: 80.2522,
      monitorInfo: { sensorId: 'SN-ADY-130', maintenanceTeam: 'Chennai Metro Auth', lastCalibration: '2026-04-12' }
    },
  ];

  async function seedBridges() {
    try {
      console.log(`PulseBridge: Checking Firestore database [${firebaseConfig.firestoreDatabaseId}] via Client SDK...`);
      const snapshot = await getDocs(query(collection(db, 'bridges'), limit(1)));
      if (snapshot.empty) {
        console.log('PulseBridge: Firestore is empty. Initializing with seed data...');
        const batch = writeBatch(db);
        for (const b of initialBridges) {
          const bridgeRef = doc(db, 'bridges', b.id);
          batch.set(bridgeRef, { ...b, monitorInfo: { ...b.monitorInfo, vibrationThreshold: 1.2, tiltThreshold: 2.0, waterLevelThreshold: 15.0 }});
        }
        await batch.commit();
        console.log('PulseBridge: Seed data committed successfully.');
      } else {
        console.log('PulseBridge: Firestore already contains bridge data.');
      }
    } catch (err) {
      console.error('PulseBridge: Critical error during seeding:', err);
    }
  }

  // Non-blocking seed
  seedBridges().catch(console.error);

  // Cache for local state/simulation
  let currentBridges: any[] = [];
  const sensorData: Record<string, any[]> = {};
  
  // Real-time listener for bridges on the server
  let initialWeatherSynced = false;
  onClientSnapshot(collection(db, 'bridges'), snapshot => {
    currentBridges = snapshot.docs.map(doc => doc.data());
    console.log(`PulseBridge: Syncing ${currentBridges.length} bridge configurations...`);
    currentBridges.forEach(b => {
      if (!sensorData[b.id]) sensorData[b.id] = [];
    });

    if (!initialWeatherSynced && currentBridges.length > 0) {
      initialWeatherSynced = true;
      fetchWeatherForBridges();
    }
  }, err => {
    console.error('Error listening to bridges:', err);
  });

  // --- External Data: Weather (Open-Meteo Integration) ---
  const fetchWeatherForBridges = async () => {
    console.log('PulseBridge: Syncing atmospheric data from weather APIs...');
    for (const bridge of currentBridges) {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${bridge.lat}&longitude=${bridge.lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,visibility&timezone=auto`);
        const data = await response.json();
        
        if (data && data.current) {
          const weather = {
            temp: data.current.temperature_2m,
            windSpeed: data.current.wind_speed_10m,
            humidity: data.current.relative_humidity_2m,
            visibility: data.current.visibility ? (data.current.visibility / 1000) : undefined,
            condition: getWeatherCondition(data.current.weather_code),
            lastUpdated: new Date().toISOString()
          };
          
          await updateClientDoc(doc(db, 'bridges', bridge.id), { weather });
          bridge.weather = weather;
        }
      } catch (err) {
        console.error(`Failed to fetch weather for ${bridge.name}:`, err);
      }
    }
  };

  const getWeatherCondition = (code: number): string => {
    if (code === 0) return 'Clear';
    if (code >= 1 && code <= 3) return 'Partly Cloudy';
    if (code >= 45 && code <= 48) return 'Foggy';
    if (code >= 51 && code <= 67) return 'Rainy';
    if (code >= 71 && code <= 77) return 'Snowy';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code >= 95) return 'Stormy';
    return 'Overcast';
  };

  // Periodic update every 15 minutes
  setInterval(fetchWeatherForBridges, 900000);

  // --- Simulation Logic ---
  const simulateData = async () => {
    for (const bridge of currentBridges) {
      const timestamp = new Date().toISOString();
      const vibration = bridge.id === 'tn-adyar' 
        ? 0.9 + Math.random() * 1.5 // Red status simulation
        : 0.1 + Math.random() * 0.2;
      
      const tilt = Math.random() * 0.5;
      const waterLevel = (bridge.type === 'River Bridge' || bridge.type === 'Marine Bridge' || bridge.type === 'Dam Bridge') 
        ? (4.2 + Math.random() * 0.5) 
        : (Math.random() * 0.2);

      const reading = { id: nanoid(), timestamp, vibration, tilt, waterLevel };
      
      sensorData[bridge.id].push(reading);
      if (sensorData[bridge.id].length > 50) sensorData[bridge.id].shift();

      io.to(bridge.id).emit('sensor_update', reading);

      // Threshold-based alerts from bridge configuration
      const mInfo = bridge.monitorInfo;
      const vThresh = mInfo?.vibrationThreshold || 1.2;
      const tThresh = mInfo?.tiltThreshold || 2.0;
      const wThresh = mInfo?.waterLevelThreshold || 15.0;

      if (vibration > vThresh && bridge.status !== 'RED') {
        const alert = { id: nanoid(), bridgeId: bridge.id, type: 'CRITICAL_VIBRATION', message: `Vibration spike (${vibration.toFixed(2)} mm/s) exceeded threshold!`, date: timestamp };
        await setDoc(doc(db, 'bridges', bridge.id, 'alerts', alert.id), alert);
        io.emit('new_alert', alert);
      }
      if (tilt > tThresh && bridge.status !== 'RED') {
        const alert = { id: nanoid(), bridgeId: bridge.id, type: 'CRITICAL_TILT', message: `Tilt angle (${tilt.toFixed(2)}°) exceeded threshold!`, date: timestamp };
        await setDoc(doc(db, 'bridges', bridge.id, 'alerts', alert.id), alert);
        io.emit('new_alert', alert);
      }
      if (waterLevel > wThresh && bridge.status !== 'RED') {
        const alert = { id: nanoid(), bridgeId: bridge.id, type: 'CRITICAL_WATER_LEVEL', message: `Water level (${waterLevel.toFixed(1)}m) exceeded threshold!`, date: timestamp };
        await setDoc(doc(db, 'bridges', bridge.id, 'alerts', alert.id), alert);
        io.emit('new_alert', alert);
      }
    }
  };

  setInterval(simulateData, 3000);

  // --- API Routes ---
  app.use(express.json());

  app.get('/api/bridges', (req, res) => {
    res.json(currentBridges);
  });
  
  app.get('/api/alerts', async (req, res) => {
    try {
      const q = query(collectionGroup(db, 'alerts'), orderBy('date', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      res.json(snapshot.docs.map(doc => doc.data()));
    } catch (error) {
      console.error('Error fetching global alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  app.get('/api/bridges/:id/readings', (req, res) => {
    res.json(sensorData[req.params.id] || []);
  });

  app.get('/api/bridges/:id/inspections', async (req, res) => {
    try {
      const q = query(collection(db, 'bridges', req.params.id, 'inspections'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      res.json(snapshot.docs.map(doc => doc.data()));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch inspections' });
    }
  });

  app.get('/api/bridges/:id/calibrations', async (req, res) => {
    try {
      const q = query(collection(db, 'bridges', req.params.id, 'calibrations'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      res.json(snapshot.docs.map(doc => doc.data()));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch calibrations' });
    }
  });

  app.get('/api/bridges/:id/alerts', async (req, res) => {
    try {
      const q = query(collection(db, 'bridges', req.params.id, 'alerts'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      res.json(snapshot.docs.map(doc => doc.data()));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  app.post('/api/bridges/:id/inspections', async (req, res) => {
    const bridgeId = req.params.id;
    const entry = { ...req.body, id: nanoid(), bridgeId, date: new Date().toISOString() };
    await setDoc(doc(db, 'bridges', bridgeId, 'inspections', entry.id), entry);
    
    // Update status if critical
    const bridge = currentBridges.find(b => b.id === bridgeId);
    if (bridge && entry.severity === 'CRITICAL') {
      await updateClientDoc(doc(db, 'bridges', bridgeId), { status: 'RED' });
      bridge.status = 'RED';
      const alert = { id: nanoid(), bridgeId, type: 'MANUAL_CRITICAL', message: `Critical Inspection: ${entry.notes}`, date: entry.date };
      await setDoc(doc(db, 'bridges', bridgeId, 'alerts', alert.id), alert);
      io.emit('bridge_status_change', { bridgeId, status: 'RED' });
      io.emit('new_alert', alert);
    }

    res.status(201).json(entry);
  });

  app.post('/api/bridges/:id/calibrations', async (req, res) => {
    const { technician, notes, date } = req.body;
    if (!technician || !notes) return res.status(400).json({ error: 'Technician and notes required' });
    
    const bridgeId = req.params.id;
    const entry = { 
      id: nanoid(), 
      bridgeId, 
      technician, 
      notes, 
      date: date || new Date().toISOString().split('T')[0] 
    };
    await setDoc(doc(db, 'bridges', bridgeId, 'calibrations', entry.id), entry);
    
    // Update last calibration date on bridge
    const bridge = currentBridges.find(b => b.id === bridgeId);
    if (bridge && bridge.monitorInfo) {
      bridge.monitorInfo.lastCalibration = entry.date;
      await updateClientDoc(doc(db, 'bridges', bridgeId), { 
        'monitorInfo.lastCalibration': entry.date 
      });
    }

    res.status(201).json(entry);
  });

  // Admin: Update Bridge Data
  app.patch('/api/bridges/:id', async (req, res) => {
    const bridgeId = req.params.id;
    const bridge = currentBridges.find(b => b.id === bridgeId);
    if (!bridge) return res.status(404).json({ error: 'Bridge not found' });
    
    const { name, location, type, status } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (location) updates.location = location;
    if (type) updates.type = type;
    if (status) updates.status = status;
    
    await updateClientDoc(doc(db, 'bridges', bridgeId), updates);
    
    if (status && bridge.status !== status) {
      bridge.status = status;
      io.emit('bridge_status_change', { bridgeId, status });
    }
    if (name) bridge.name = name;
    if (location) bridge.location = location;
    if (type) bridge.type = type;
    
    res.json({ ...bridge, ...updates });
  });

  // Admin: Add Historical Record
  app.post('/api/bridges/:id/history', async (req, res) => {
    const bridgeId = req.params.id;
    const bridge = currentBridges.find(b => b.id === bridgeId);
    if (!bridge) return res.status(404).json({ error: 'Bridge not found' });
    
    const { year, event } = req.body;
    if (!year || !event) return res.status(400).json({ error: 'Year and Event required' });
    
    const entry = { year, event };
    await updateClientDoc(doc(db, 'bridges', bridgeId), {
      history: arrayUnion(entry)
    });
    
    if (!bridge.history) bridge.history = [];
    bridge.history.push(entry);
    
    res.status(201).json(entry);
  });

  // Admin: Delete Inspection
  app.delete('/api/inspections/:id', async (req, res) => {
    try {
      const q = query(collectionGroup(db, 'inspections'));
      const snapshot = await getDocs(q);
      for (const inspDoc of snapshot.docs) {
        if (inspDoc.id === req.params.id) {
          await deleteDoc(inspDoc.ref);
          return res.status(204).send();
        }
      }
      res.status(404).json({ error: 'Inspection not found' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete' });
    }
  });

  // Admin: Delete Historical Record
  app.delete('/api/bridges/:id/history/:index', async (req, res) => {
    const bridgeId = req.params.id;
    const bridge = currentBridges.find(b => b.id === bridgeId);
    if (!bridge) return res.status(404).json({ error: 'Bridge not found' });
    
    const index = parseInt(req.params.index);
    if (isNaN(index) || !bridge.history || index < 0 || index >= bridge.history.length) {
      return res.status(400).json({ error: 'Invalid history index' });
    }
    
    const itemToRemove = bridge.history[index];
    await updateClientDoc(doc(db, 'bridges', bridgeId), {
      history: arrayRemove(itemToRemove)
    });
    
    bridge.history.splice(index, 1);
    res.status(204).send();
  });

  // Alert Thresholds API
  // --- Vite / Static Assets ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Socket.io Room Logic
  io.on('connection', (socket) => {
    socket.on('join_bridge', (bridgeId) => {
      socket.join(bridgeId);
      console.log(`Socket ${socket.id} joined bridge ${bridgeId}`);
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
