require('dotenv').config();
require('express-async-errors');
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const adminRoutes = require('./routes/admin');
const leaderboardRoutes = require('./routes/leaderboard');
const initSocket = require('./socket');

const app = express();
const server = http.createServer(app);

// ─── Socket.io — allow all origins (needed for ngrok / external URLs) ─────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
app.set('io', io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,         // allow inline scripts in frontend
}));
app.use(cors({ origin: '*', credentials: false }));  // open CORS for all origins
app.use(express.json());
app.use(morgan('dev'));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve built React frontend ──────────────────────────────────────────────
const fs = require('fs');
const possibleDistPaths = [
  path.join(__dirname, '../../frontend/dist'),   // local dev: backend/src → frontend/dist
  path.join(__dirname, '../frontend/dist'),        // render: backend/ → frontend/dist
  path.join(process.cwd(), 'frontend/dist'),       // render root deploy
];
const frontendDist = possibleDistPaths.find((p) => fs.existsSync(p));
if (frontendDist) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
  console.log('📦 Serving frontend from:', frontendDist);
} else {
  console.log('ℹ️  No built frontend found — API-only mode');
}

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({ success: false, message: err.message || 'Internal Server Error' });
});

// ─── MongoDB Connection ───────────────────────────────────────────────────────
async function getMongoUri() {
  const envUri = process.env.MONGO_URI;

  // If Atlas/remote URI provided — use it directly (persistent data ✅)
  if (envUri && !envUri.includes('localhost')) {
    return envUri;
  }

  // Try local MongoDB (3 second timeout)
  if (envUri) {
    try {
      await mongoose.connect(envUri, { serverSelectionTimeoutMS: 3000 });
      return null; // already connected
    } catch {
      console.log('⚠️  Local MongoDB not reachable — falling back to in-memory server...');
    }
  }

  // Zero-config fallback: in-memory MongoDB
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = new MongoMemoryServer();
  await mongod.start();
  const uri = mongod.getUri();
  console.log('🧠 In-memory MongoDB started (data resets on restart)');
  console.log('   ⚠️  For persistent data set MONGO_URI in backend/.env to a MongoDB Atlas URI');
  process.env._MONGO_MEM_URI = uri;
  return uri;
}

// ─── Startup ──────────────────────────────────────────────────────────────────
async function startServer() {
  try {
    const uri = await getMongoUri();
    if (uri) await mongoose.connect(uri);
    console.log('✅ MongoDB connected');

    // Auto-seed in-memory DB
    if (process.env._MONGO_MEM_URI) {
      const { seedDatabase } = require('./utils/seeder');
      await seedDatabase();
      console.log('✅ Database auto-seeded');
    }

    const PORT = process.env.PORT || 5000;

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`   Free it (PowerShell): Get-NetTCPConnection -LocalPort ${PORT} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`);
        console.error(`   Then rerun: node src/server.js\n`);
      } else {
        console.error('Server error:', err);
      }
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(`\n🚀 Server:  http://localhost:${PORT}`);
      console.log(`📡 Admin:   http://localhost:${PORT}/admin/login  →  admin / TechFest@2024`);
      console.log(`👥 Teams:   http://localhost:${PORT}/login         →  TEAM01 / cipher123`);
      console.log('\n─────────────────────────────────────────────────────');
      console.log('🌐 To share with teams on OTHER NETWORKS, run in a NEW terminal:');
      console.log('   npx ngrok http ' + PORT);
      console.log('   Then share the ngrok HTTPS URL with all teams.');
      console.log('─────────────────────────────────────────────────────\n');
    });

    initSocket(io);
  } catch (err) {
    console.error('❌ Startup error:', err.message);
    process.exit(1);
  }
}

startServer();
module.exports = { app, io };
