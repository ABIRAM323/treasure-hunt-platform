# Tech Fest Smart Treasure Hunt Platform

A real-time treasure hunt management system for a coding club tech fest.

## Features
- 🔐 JWT-based team & admin authentication
- 🗺 19 clues: 8 physical (QR-validated), 8 technical (answer-validated), 3 Final Boss
- 📡 Real-time leaderboard & timer via Socket.io
- 📷 In-app QR camera scanner
- 🏆 Scoring engine with time bonus, penalties, and Final Boss bonus
- ⚙️ Admin dashboard: team/clue CRUD, event controls, campus map, CSV export
- 📱 Responsive dark neon theme (mobile + desktop)

## Project Structure
```
tressure/
├── backend/    # Node.js + Express + Socket.io + MongoDB
└── frontend/   # React 18 + Vite
```

## Prerequisites
- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas/database))

---

## Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env   # Then edit .env with your MongoDB URI
npm run seed           # Seeds 19 clues + 5 sample teams
npm run dev            # Starts on http://localhost:5000
```

### 2. Frontend Setup (new terminal)
```bash
cd frontend
npm install
npm run dev            # Starts on http://localhost:5173
```

### 3. Access the App
| URL | Description |
|-----|-------------|
| `http://localhost:5173/login` | Team login |
| `http://localhost:5173/admin/login` | Admin login |
| `http://localhost:5173/leaderboard` | Public leaderboard |

---

## Default Credentials

**Admin:**
- Username: `admin`
- Password: `TechFest@2024`

**Sample Teams (after seeding):**
| Team ID | Password |
|---------|----------|
| TEAM01 | cipher123 |
| TEAM02 | byteforce456 |
| TEAM03 | neural789 |
| TEAM04 | stack000 |
| TEAM05 | kernel111 |

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Admin login password |
| `QR_SECRET` | HMAC secret for QR hash generation |
| `CLIENT_URL` | Frontend URL for CORS |

### Frontend (`frontend/.env`)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (leave empty in dev, uses Vite proxy) |

---

## Production Deployment

### Backend → [Render](https://render.com) or [Railway](https://railway.app)
1. Set environment variables in the platform dashboard
2. Set `MONGO_URI` to MongoDB Atlas connection string
3. Set `CLIENT_URL` to your Vercel frontend URL
4. Start command: `npm start`

### Frontend → [Vercel](https://vercel.com)
1. Import the `frontend/` directory
2. Set `VITE_API_URL` to your backend URL
3. Vercel will auto-detect Vite and deploy

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/team-login` | — | Team login |
| POST | `/api/auth/admin-login` | — | Admin login |
| GET | `/api/game/current-clue` | Team JWT | Get current clue |
| POST | `/api/game/submit-answer` | Team JWT | Submit text answer |
| POST | `/api/game/scan-qr` | Team JWT | Validate QR scan |
| GET | `/api/leaderboard` | — | Public leaderboard |
| GET | `/api/admin/teams` | Admin JWT | List all teams |
| POST | `/api/admin/teams` | Admin JWT | Create team |
| GET | `/api/admin/clues/:id/qr` | Admin JWT | Get QR image |
| POST | `/api/admin/event/start` | Admin JWT | Start event timer |
| POST | `/api/admin/event/stop` | Admin JWT | Stop event |
| POST | `/api/admin/event/reset` | Admin JWT | Full reset |
| GET | `/api/admin/export` | Admin JWT | Download CSV |

---

## Scoring Engine
- **Base points**: Easy=100, Medium=200, Hard=350, Boss=500
- **Time bonus**: Up to 50% of base points (decays linearly over event duration)
- **Wrong attempt penalty**: −15 pts per wrong attempt (capped at 80% of base)
- **Full completion bonus**: +500 pts
- **Final Boss unlocks**: After 70% of physical + technical clues completed

---

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `leaderboard:update` | Server→Client | Full leaderboard array |
| `team:status` | Server→Client | Single team status change |
| `timer:tick` | Server→Client | Every second: `{ remaining, duration }` |
| `event:start` | Server→Client | Event started |
| `event:stop` | Server→Client | Event ended |
| `event:reset` | Server→Client | Event reset |
