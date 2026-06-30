# SELIDIKI
## Indonesia Digital Trust & Fraud Intelligence Platform

> **"Can this prevent users from losing money?"**

SELIDIKI adalah platform AI fraud prevention pertama di Indonesia yang menggabungkan:
- 🛡️ **AI Scam Analyzer** — Deteksi scam dari SMS, WhatsApp, link, screenshot
- 📞 **Phone Reputation** — Cek reputasi nomor HP sebelum menjawab/transfer
- 🏦 **Bank Account Checker** — Verifikasi rekening sebelum transfer
- 🚩 **Community Reports** — Laporkan dan lindungi sesama
- 🔒 **Privacy Center** — Data minimization & UU PDP compliance

---

## 📁 Project Structure

```
SELIDIKI/
├── mobile/                    # Flutter App (Android/iOS)
│   ├── lib/
│   │   ├── main.dart
│   │   ├── firebase_options.dart
│   │   ├── core/
│   │   │   ├── router/        # GoRouter configuration
│   │   │   └── theme/         # Dark fintech theme
│   │   ├── features/
│   │   │   ├── auth/          # Onboarding + OTP auth
│   │   │   ├── dashboard/     # Home risk dashboard
│   │   │   ├── scam_analyzer/ # AI scam detection
│   │   │   ├── checker/       # Phone & account checker
│   │   │   ├── reports/       # Fraud reporting
│   │   │   ├── history/       # Scan history
│   │   │   └── privacy/       # Privacy center
│   │   └── shared/
│   │       └── widgets/       # Shared UI components
│   ├── android/
│   └── pubspec.yaml
│
├── backend/                   # Node.js REST API
│   ├── server.js
│   ├── routes/
│   │   ├── scan.js            # AI scan endpoints
│   │   ├── check.js           # Phone/account check
│   │   ├── report.js          # Fraud reporting
│   │   └── user.js            # User data management
│   ├── services/
│   │   ├── aiEngine.js        # Gemini AI integration
│   │   └── fraudGraph.js      # Fraud intelligence database
│   ├── middleware/
│   │   └── auth.js            # Firebase auth verification
│   ├── utils/
│   │   └── crypto.js          # Privacy hashing utilities
│   ├── db/
│   │   └── schema.sql         # PostgreSQL schema
│   └── package.json
│
└── README.md
```

---

## 🚀 Setup Guide

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Flutter SDK | ≥ 3.22.0 | [flutter.dev](https://flutter.dev/docs/get-started/install/windows) |
| Dart | ≥ 3.4.0 | Included with Flutter |
| Node.js | ≥ 18.0.0 | [nodejs.org](https://nodejs.org) |
| Android Studio | Latest | For Android emulator |
| Firebase CLI | Latest | `npm i -g firebase-tools` |
| FlutterFire CLI | Latest | `dart pub global activate flutterfire_cli` |

---

### Step 1: Flutter Setup

```powershell
# 1. Install Flutter (if not installed)
# Download from: https://flutter.dev/docs/get-started/install/windows
# Add to PATH: C:\flutter\bin

# 2. Verify installation
flutter doctor

# 3. Navigate to mobile project
cd mobile

# 4. Copy .env
cp .env.example .env
# Edit .env with your GEMINI_API_KEY

# 5. Install dependencies
flutter pub get

# 6. Run on Android (with emulator running or device connected)
flutter run
```

### Step 2: Firebase Setup

```powershell
# 1. Create Firebase project at console.firebase.google.com
# 2. Enable: Authentication (Phone), Firestore, Analytics, Crashlytics

# 3. Login to Firebase
firebase login

# 4. Configure FlutterFire (in /mobile directory)
flutterfire configure

# This auto-generates lib/firebase_options.dart with your real config
```

### Step 3: Backend Setup

```powershell
cd backend

# Install dependencies
npm install

# Copy env
cp .env.example .env
# Edit with your values

# Start dev server
npm run dev

# API will run at http://localhost:3000
# Test: GET http://localhost:3000/health
```

### Step 4: Database Setup

```sql
-- Connect to PostgreSQL and run:
psql -U postgres -d selidiki -f db/schema.sql
```

---

## 🔑 Environment Variables

### Mobile (`mobile/.env`)
```env
GEMINI_API_KEY=your_gemini_api_key       # Get from aistudio.google.com
FIREBASE_PROJECT_ID=your_project_id
API_BASE_URL=http://localhost:3000/api/v1  # Local dev
APP_ENV=development
```

### Backend (`backend/.env`)
```env
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_PROJECT_ID=your_project_id
HASH_SALT=your_random_salt_here          # IMPORTANT: Change in production!
DATABASE_URL=postgresql://user:pass@localhost:5432/selidiki
```

---

## 📱 Screens (Sprint 1 MVP)

| Screen | Description | Status |
|--------|-------------|--------|
| Onboarding | 4-page brand intro with animations | ✅ Done |
| Auth | Phone OTP login (2-step) | ✅ Done |
| Home Dashboard | Safety status, quick actions, community stats | ✅ Done |
| AI Scam Analyzer | Text/URL/screenshot analysis | ✅ Done |
| Scan Result | Risk gauge, reasons, recommendations | ✅ Done |
| Phone Checker | Phone reputation with signal breakdown | ✅ Done |
| Account Checker | Bank account risk verification | ✅ Done |
| Report Fraud | 3-step wizard, 8 categories | ✅ Done |
| Scan History | Filtered scan history | ✅ Done |
| Privacy Center | Consent management, UU PDP rights | ✅ Done |

---

## 🔌 API Endpoints

```
POST   /api/v1/scan/message      Analyze SMS/WA message
POST   /api/v1/scan/url          Analyze URL for phishing  
POST   /api/v1/scan/screenshot   Analyze screenshot (base64)
GET    /api/v1/check/phone/:num  Phone reputation score
GET    /api/v1/check/account     Bank account risk (?bank=BCA&account=123)
POST   /api/v1/report            Submit fraud report
GET    /api/v1/report/trending   Trending fraud reports
GET    /api/v1/user/history      User scan history (auth required)
DELETE /api/v1/user/data         Delete all user data (UU PDP)
GET    /health                   Health check
```

---

## 🛡️ Security & Privacy

### Data Minimization
- Phone numbers stored as `SHA-256(SALT + phone)` — cannot be reversed
- Bank accounts stored as `SHA-256(SALT + bank + account)`
- Location data: **NOT collected**
- Contact list: **NOT accessed**
- Raw messages: **NOT stored** (only hash + result)

### Protection
- Rate limiting: 100 req/15min global, 10 scans/min
- Helmet security headers
- CORS whitelist only
- Firebase Auth token verification
- Audit log for all sensitive operations

### Compliance
- ✅ UU PDP Indonesia No. 27/2022
- ✅ Google Play Data Safety Policy
- 🔄 OJK POJK 11/2022 (in progress)

---

## 🗺️ Phase Roadmap

| Phase | Timeline | Features |
|-------|----------|---------|
| **Phase 1** (current) | 8-12 weeks | AI Scam Analyzer, Phone/Account Checker, Community Reports, Privacy Center |
| **Phase 2** | 3-6 months | Smart Caller ID, Spam SMS detection, On-device ML, Notification |
| **Phase 3** | 6-12 months | Financial Identity Layer, B2B API, Warung Trust Network |

---

## 💰 Monetization

### Free Tier
- 10 scans/day
- Community reports
- Basic phone/account check

### Premium (Rp 19.000–39.000/bulan)
- Unlimited scans
- Advanced AI analysis
- Family protection (up to 5 numbers)
- Detailed history (90 days)
- Priority support

### B2B API (Future)
- `POST /api/v2/fraud-score` — Fraud scoring for banks/fintech
- `POST /api/v2/batch-check` — Bulk verification
- SLA: 99.9% uptime, <200ms latency

---

## 📊 Scale Target

Built to handle **10 million Indonesian users**:
- Stateless Node.js on Cloud Run (auto-scaling)
- Firestore for community data (horizontal scale)
- PostgreSQL read replicas for analytics
- CDN for static assets
- Redis cache for frequent lookups (Phase 2)

---

## 📄 License

Proprietary — © 2024 SELIDIKI. All rights reserved.
