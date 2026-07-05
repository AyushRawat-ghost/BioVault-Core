# 🏥 ALTERIS OS — BioVault-Core

> **Decentralized Healthcare Management Platform** — Soulbound Identity · Real-Time Vitals · AI Diagnostics · Blockchain Audit Trail

---

## 🧬 What is ALTERIS OS?

ALTERIS OS is a full-stack decentralized healthcare infrastructure combining:

- **On-chain Soulbound Token (SBT)** identity and consent for patients, doctors, and admins
- **Real-time IoT vital telemetry** streamed and classified by a Random Forest ML anomaly engine
- **Role-gated clinical dashboards** with a cyberpunk UI (Next.js 14)
- **Immutable blockchain audit logs** for all critical clinical operations
- **AWS RDS PostgreSQL** for performant relational data storage
- **AWS S3** for secure medical document storage
- **AWS Bedrock (Claude 3.5 Sonnet)** for AI-generated diagnostic summaries

---

## 🏗 Architecture

```
                 ┌─────────────────────────────────────┐
                 │        Next.js 14 Frontend           │
                 │  (Role-gated: Admin / Doctor / Patient)│
                 └────────────────┬────────────────────┘
                                  │  REST API
                                  ▼
                 ┌─────────────────────────────────────┐
                 │        Go (Gin) API Gateway          │
                 │  JWT Auth · CORS · DB · S3 · AI      │
                 └───────┬─────────────────┬───────────┘
                         │                 │
              JSON-RPC ──┘                 └── HTTP Proxy
                         ▼                             ▼
           ┌─────────────────────┐    ┌───────────────────────────┐
           │ Hardhat EVM Node    │    │    FastAPI ML Server       │
           │  (Solidity SBTs)    │    │  (IoT Anomaly Classifier)  │
           └─────────────────────┘    └───────────────────────────┘
                         │
           ┌─────────────────────┐
           │   AWS RDS Postgres  │ ← Patient records, vitals, overrides
           │   AWS S3            │ ← Medical document PDFs
           │   AWS Bedrock AI    │ ← Diagnostic summaries
           └─────────────────────┘
```

---

## 📁 Repository Structure

```
BioVault-Core/
│
├── backend/                        # Go REST API Gateway (Gin Framework)
│   ├── api/
│   │   ├── admin/                  # Admin routes: patients, doctors, KPIs, insurance
│   │   ├── auth/                   # MetaMask wallet login & nonce challenge
│   │   ├── patient/                # Patient profile, records, documents
│   │   ├── records/                # Medical record CRUD + S3 upload
│   │   └── vitals/                 # Real-time IoT telemetry SSE stream
│   ├── pkg/
│   │   ├── config/                 # .env loader
│   │   ├── db/                     # Postgres connection + auto-migrations
│   │   └── ethclient/              # Go-Ethereum: signature verification
│   ├── main.go                     # Server entrypoint
│   ├── .env.example                # Environment variable template
│   └── go.mod / go.sum
│
├── blockchain/                     # Smart Contract Workspace (Hardhat)
│   ├── contracts/                  # Solidity contracts
│   │   ├── PatientRegistry.sol     # SBT identity + consent tracking
│   │   ├── DoctorRegistry.sol      # Doctor registration & credentials
│   │   ├── MedicalRecords.sol      # On-chain record index
│   │   └── InsuranceClaims.sol     # Insurance claim lifecycle
│   ├── scripts/
│   │   ├── deploy.js               # Deploy all contracts
│   │   ├── register-patient.js     # Register test patient on-chain
│   │   ├── register-doctor.js      # Register test doctor on-chain
│   │   ├── check-patient-status.js # Verify registration status
│   │   └── simulate-vitals.js      # Continuous IoT telemetry simulator
│   ├── hardhat.config.js           # Hardhat config (100 pre-funded accounts)
│   └── package.json
│
├── frontend/                       # Next.js 14 Cyberpunk Dashboard
│   ├── src/app/
│   │   ├── page.tsx                # Landing / MetaMask login
│   │   ├── admin/dashboard/        # Role-gated dashboard (Admin + Doctor)
│   │   └── patient/dashboard/      # Patient self-service portal
│   ├── .env.local.example          # Frontend environment template
│   ├── tailwind.config.js
│   └── package.json
│
├── ml/                             # FastAPI ML Analytics Engine
│   └── main.py                     # Random Forest anomaly classifier (SSE stream)
│
├── Database Codes/                 # Reference SQL
│   ├── schema.sql                  # Full DB schema
│   └── user.sql                    # User management queries
│
└── .gitignore
```

---

## 👥 Roles & Capabilities

### 🔐 Admin
| Section | Capabilities |
|---|---|
| **Dashboard** | Hospital KPIs, patient/doctor counts, anomaly stats |
| **Clinical Vault** | Full patient registry, record viewer, document access |
| **Patient Management** | Register, edit, view all patients |
| **Doctor Management** | Register and manage clinical staff |
| **Regulatory Ledger** | Narcotic tracking, compliance logs |
| **Insurance** | View, process, and manage all insurance claims |
| **Override Approvals** | View pending override requests, cast co-signature votes |
| **Readme Logs** | Live system event log terminal |

### 👨‍⚕️ Doctor
| Section | Capabilities |
|---|---|
| **Patient KPIs** | Live vital stats for assigned patients |
| **Patient Section** | Modify records, upload clinical documents |
| **Request Meds & Equipments** | File procurement requests |
| **Emergency Override** | Request emergency access to external patients |
| **Care Transfer** | File authorized patient transfer requests |
| **Approval Queue** | View and co-sign other doctors' override requests |
| **ML Patient Alerts** | Real-time anomaly alerts from the IoT classifier |

### 🏥 Patient
| Section | Capabilities |
|---|---|
| **Profile** | View SBT identity, consent status |
| **Medical Records** | View own records (text + AI diagnostic summary) |
| **Documents** | View uploaded clinical documents |
| **Insurance** | File and track insurance claims |
| **Vitals** | Live IoT vital telemetry stream |

---

## ⚙ Override & Transfer System

ALTERIS OS implements a **clinical consensus override protocol**:

- A doctor files an **Emergency Override** to access a patient outside their care list
- The request enters the **Approval Queue** (visible to all doctors and admins)
- **Two co-signatures** are required to activate the override
- Admins can vote to unilaterally approve any pending request
- All actions are logged to the immutable PostgreSQL audit trail

---

## 🤖 ML Anomaly Detection

The FastAPI ML server (`ml/main.py`) exposes a **Server-Sent Events (SSE)** stream:

- Receives real-time vitals from `blockchain/scripts/simulate-vitals.js`
- Runs a **Random Forest classifier** to detect anomalous vital signs
- Anomalous events are stored in `vitals_logs` (RDS) with `anomaly_detected = TRUE`
- The doctor dashboard surfaces the latest 50 anomalous events per doctor's patient list under **ML Patient Alerts**

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18, Go ≥ 1.21, Python ≥ 3.9
- MetaMask browser extension
- AWS account (RDS, S3, Bedrock)

---

### Step 1 — Start Local Blockchain (Terminal 1)
```bash
cd blockchain
npm install
npx hardhat node
```
> Launches a local EVM with 100 pre-funded test wallets on port 8545.

### Step 2 — Deploy Smart Contracts (Terminal 2)
```bash
cd blockchain
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```
> Copy the printed contract addresses into `backend/.env`.

### Step 3 — Register Test Accounts On-Chain
```bash
npx hardhat run scripts/register-patient.js --network localhost
npx hardhat run scripts/register-doctor.js --network localhost
```

### Step 4 — Start Vitals Telemetry Simulator (keep running)
```bash
node scripts/simulate-vitals.js
```

### Step 5 — Configure Environment Variables

**`backend/.env`** (copy from `backend/.env.example`):
```env
DB_URL=postgres://user:pass@host:5432/dbname?sslmode=require
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=your-bucket
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
PATIENT_REGISTRY_ADDRESS=0x...
DOCTOR_REGISTRY_ADDRESS=0x...
MEDICAL_RECORDS_ADDRESS=0x...
```

**`frontend/.env.local`** (copy from `frontend/.env.local.example`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Step 6 — Start Go Backend (Terminal 3)
```bash
cd backend
go mod tidy
go run main.go
```
> Auto-migrates all database tables on startup.

### Step 7 — Start ML Engine (Terminal 4)
```bash
cd ml
python main.py
```
> FastAPI server on port 8000. Provides SSE anomaly stream.

### Step 8 — Launch Frontend (Terminal 5)
```bash
cd frontend
npm install
npm run dev
```
> Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Test Login (MetaMask)

1. Open MetaMask → **Add Network** → RPC URL: `http://127.0.0.1:8545` · Chain ID: `31337`
2. Import a Hardhat test private key (Account #1):
   ```
   0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   ```
3. Navigate to `http://localhost:3000` and click **Initialize Session**
4. Sign the challenge in MetaMask — you'll be routed to your role-specific dashboard

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Ethers.js v6 |
| Backend | Go 1.21, Gin, go-ethereum |
| Smart Contracts | Solidity 0.8.x, Hardhat, EVM Cancun |
| Database | AWS RDS PostgreSQL |
| Storage | AWS S3 |
| AI | AWS Bedrock (Claude 3.5 Sonnet) |
| ML | Python, FastAPI, scikit-learn (Random Forest) |
| Auth | MetaMask wallet signature (EIP-191) |

---

## 📄 License

MIT — see `LICENSE` for details.
