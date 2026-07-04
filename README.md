# 🏥 BioVault-Core: Decentralized Health Records System

A secure, decentralized medical portal combining on-chain Soulbound Token (SBT) identities and audit logs with performant off-chain databases, secure AWS S3 PDF storage, AWS Bedrock clinical AI summaries, and real-time IoT vital telemetry analysed by a FastAPI Random Forest classifier.

---

## 🚀 Architectural Overview

BioVault-Core divides tasks modularly across four core layers:

```
                  ┌──────────────────────────────┐
                  │      Next.js Frontend        │
                  │   (Ethers.js v6 Wallet Log)   │
                  └──────────────┬───────────────┘
                                 │
                                 ▼ (REST API)
                  ┌──────────────────────────────┐
                  │      Go API Gateway          │
                  │  (CORS, Postgres & S3 Sync)  │
                  └──────┬──────────────┬────────┘
                         │              │
                         │ (JSON-RPC)   │ (HTTP Proxy)
                         ▼              ▼
           ┌─────────────────────┐   ┌───────────────────────────┐
           │ Go-Ethereum Client  │   │     FastAPI ML Server     │
           │  (EVM Cancun Node)  │   │  (IoT Anomaly Predictor)  │
           └─────────────────────┘   └───────────────────────────┘
```

1. **Smart Contracts (EVM Cancun / Hardhat)**: 
   * Identity verification using Soulbound Tokens (SBT).
   * Dual-approval consent tracking and medical record indexing.
2. **Go API Gateway (`backend`)**: 
   * A performant, struct-based backend implementing Gin routes.
   * Handles session nonces, MetaMask signature recovery, database logging, and blockchain transaction signing.
3. **Cloud Stack (AWS)**: 
   * **RDS PostgreSQL**: Relational tables for profiles, registration queues, and vital logs.
   * **S3 Bucket**: Secure storage for medical files.
   * **Bedrock AI**: Generates diagnostic summaries using Claude 3.5 Sonnet.
4. **Machine Learning Classifier (FastAPI)**:
   * Classifies streamed patient IoT data in real-time.

---

## 📁 Repository Structure

```
BioVault-Core/
├── backend/                  # Go REST API Gateway
│   ├── api/                  # Modular Route Groupings (Auth, Admin, Patient)
│   ├── pkg/
│   │   ├── config/           # Config managers (.env loaders)
│   │   ├── db/               # RDS PostgreSQL connection & auto-schema migrations
│   │   └── ethclient/        # Ethereum connection & signature verification
│   └── main.go               # Server startup entrypoint
│
├── blockchain/               # Smart Contract Workspace
│   ├── contracts/            # Solidity files (Registries, Records, Finance, Override)
│   ├── scripts/              # Deployments & patient registration helpers
│   └── hardhat.config.js     # Hardhat settings (runs 100 accounts on node start)
│
└── frontend/                 # Next.js 14 Cyberpunk Portal
    ├── src/
    │   ├── app/              # Next.js router pages (MetaMask login, profile)
    │   └── components/       # Visual components (CyberNavbar)
    └── .env.local            # Frontend variables
```

---

## 🛠 Setup & Startup Guide

Follow these steps to run the complete stack locally:

### 1. Compile and Start Local Blockchain
1. Enter the blockchain folder and install dependencies:
   ```bash
   cd blockchain
   npm install
   ```
2. Start the local node (generates 100 pre-funded test accounts):
   ```bash
   npx hardhat node
   ```
3. Open a second terminal and deploy the smart contracts:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```
   *Note: This will print the deployed contract addresses. Keep these for your env files!*

### 2. Configure environment variables
* **Backend**: Create `backend/.env` (using `backend/.env.example` as a template) and add your database credentials, AWS keypair, and the deployed contract addresses.
* **Frontend**: Create `frontend/.env.local` (using `frontend/.env.local.example`) and configure the Go API URL.

### 3. Bootstrap Go Backend
1. Enter the backend folder and fetch dependencies:
   ```bash
   cd backend
   go mod tidy
   ```
2. Run the Go server:
   ```bash
   go run main.go
   ```
   *Note: Automatically verifies tables inside PostgreSQL on startup.*

### 4. Bootstrap Frontend
1. Enter the frontend folder and install packages:
   ```bash
   cd frontend
   npm install
   ```
2. Run Next.js:
   ```bash
   npm run dev
   ```
3. Load `http://localhost:3000/` in your browser.

---

## 🧪 Testing the Login Handshake
1. Register a test patient address in the contract:
   ```bash
   cd blockchain
   npx hardhat run scripts/register-patient.js --network localhost
   ```
2. Import Hardhat **Account #1's private key** (`0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`) into MetaMask.
3. Switch MetaMask to `Localhost 8545` (Chain ID `31337`).
4. Click **Initialize Session** on the homepage and sign!
