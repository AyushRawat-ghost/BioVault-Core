-- =====================================================================
-- ALTERIS OS — BioVault-Core
-- Full Database Schema (PostgreSQL / AWS RDS)
-- Auto-migrated on server start by backend/pkg/db/db.go :: InitSchema()
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. PATIENT PROFILES
-- Core identity table. One row per registered patient wallet.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_profiles (
    wallet_address          VARCHAR(42)     PRIMARY KEY,
    name                    VARCHAR(100)    NOT NULL,
    dob                     VARCHAR(20)     NOT NULL,
    blood_group             VARCHAR(10)     NOT NULL,
    allergies               TEXT            DEFAULT '',
    emergency_contact       VARCHAR(100)    DEFAULT '',
    avatar_url              VARCHAR(255)    DEFAULT '',
    aadhaar_number          VARCHAR(12)     DEFAULT '',
    pan_number              VARCHAR(10)     DEFAULT '',
    aadhaar_s3_key          VARCHAR(255)    DEFAULT '',
    pan_s3_key              VARCHAR(255)    DEFAULT '',
    status                  VARCHAR(20)     DEFAULT 'active',
    -- Insurance fields
    insurance_provider      VARCHAR(100)    DEFAULT 'Alteris Care',
    insurance_policy_number VARCHAR(100)    DEFAULT 'POL-ALT-88291',
    insurance_coverage_limit NUMERIC(12,2) DEFAULT 50000.00,
    insurance_policy_status VARCHAR(50)     DEFAULT 'Active',
    created_at              TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);


-- ─────────────────────────────────────────────────────────────────────
-- 2. DOCTOR PROFILES
-- One row per registered doctor wallet.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_profiles (
    wallet_address  VARCHAR(42)     PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    specialization  VARCHAR(100)    NOT NULL,
    aadhaar_number  VARCHAR(12)     DEFAULT '',
    pan_number      VARCHAR(10)     DEFAULT '',
    aadhaar_s3_key  VARCHAR(255)    DEFAULT '',
    pan_s3_key      VARCHAR(255)    DEFAULT '',
    employee_id     VARCHAR(50)     DEFAULT '',
    contact_number  VARCHAR(20)     DEFAULT '',
    home_address    TEXT            DEFAULT '',
    avatar_url      VARCHAR(255)    DEFAULT '',
    status          VARCHAR(20)     DEFAULT 'active',
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);


-- ─────────────────────────────────────────────────────────────────────
-- 3. MEDICAL RECORDS
-- Off-chain index of clinical records. Actual PDFs stored in AWS S3.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_records (
    id              SERIAL          PRIMARY KEY,
    patient_address VARCHAR(42)     NOT NULL,
    doctor_address  VARCHAR(42)     NOT NULL,
    diagnosis       VARCHAR(255)    NOT NULL,
    document_type   VARCHAR(50)     NOT NULL,   -- 'prescription', 'report', 'lab', etc.
    s3_key          VARCHAR(255)    UNIQUE NOT NULL,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);


-- ─────────────────────────────────────────────────────────────────────
-- 4. PENDING REGISTRATIONS
-- Tracks on-chain registration requests queued for admin approval.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_registrations (
    id              SERIAL          PRIMARY KEY,
    wallet_address  VARCHAR(42)     UNIQUE NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    status          VARCHAR(20)     DEFAULT 'pending',   -- 'pending', 'approved', 'rejected'
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);


-- ─────────────────────────────────────────────────────────────────────
-- 5. VITALS LOGS
-- Real-time IoT telemetry rows; anomaly_detected set by ML classifier.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vitals_logs (
    id               SERIAL          PRIMARY KEY,
    patient_address  VARCHAR(42)     NOT NULL,
    heart_rate       INT             NOT NULL,
    systolic         INT             NOT NULL,
    diastolic        INT             NOT NULL,
    spo2             INT             NOT NULL,
    temperature      NUMERIC(4,2)    NOT NULL,
    anomaly_detected BOOLEAN         DEFAULT FALSE,
    created_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast per-patient anomaly lookups used by ML Patient Alerts
CREATE INDEX IF NOT EXISTS idx_vitals_patient_anomaly
    ON vitals_logs (patient_address, anomaly_detected, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────
-- 6. USER SESSIONS
-- Short-lived JWT-style tokens issued after MetaMask signature verification.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
    id              SERIAL          PRIMARY KEY,
    wallet_address  VARCHAR(42)     NOT NULL,
    session_token   VARCHAR(100)    UNIQUE NOT NULL,
    role            VARCHAR(20)     NOT NULL,   -- 'patient', 'doctor', 'admin'
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP       NOT NULL
);


-- ─────────────────────────────────────────────────────────────────────
-- 7. IMPLANTABLE DEVICES
-- Tracks medical device inventory and patient implants.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS implantable_devices (
    serial_number   VARCHAR(100)    PRIMARY KEY,
    device_name     VARCHAR(100)    NOT NULL,
    manufacturer    VARCHAR(100)    NOT NULL,
    patient_address VARCHAR(42)     DEFAULT NULL,
    implanted_by    VARCHAR(42)     DEFAULT NULL,
    implanted_at    TIMESTAMP       DEFAULT NULL,
    status          VARCHAR(20)     DEFAULT 'in-stock',  -- 'in-stock', 'implanted', 'recalled'
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);


-- ─────────────────────────────────────────────────────────────────────
-- 8. CONTROLLED SUBSTANCES LOG
-- Regulatory narcotic dispensing ledger. Requires dual authorization.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controlled_substances_logs (
    id                  SERIAL          PRIMARY KEY,
    drug_name           VARCHAR(100)    NOT NULL,
    dosage              VARCHAR(50)     NOT NULL,
    patient_address     VARCHAR(42)     NOT NULL,
    requester_doctor    VARCHAR(42)     NOT NULL,
    authorizer_admin    VARCHAR(42)     DEFAULT NULL,
    status              VARCHAR(20)     DEFAULT 'pending',   -- 'pending', 'authorized', 'rejected'
    requested_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    authorized_at       TIMESTAMP       DEFAULT NULL
);


-- ─────────────────────────────────────────────────────────────────────
-- 9. HOSPITAL ACTIVITY LOGS
-- Immutable audit trail of all significant system events.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital_activity_logs (
    id          SERIAL          PRIMARY KEY,
    timestamp   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    action_type VARCHAR(50)     NOT NULL,   -- 'AUTH', 'REGISTER', 'FINANCE', 'APPOINTMENT', etc.
    message     TEXT            NOT NULL
);


-- ─────────────────────────────────────────────────────────────────────
-- 10. MEDICINE INVENTORY
-- Tracks controlled substance stock levels available for dispensing.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicine_inventory (
    id                      SERIAL          PRIMARY KEY,
    drug_name               VARCHAR(100)    UNIQUE NOT NULL,
    dosage_strength         VARCHAR(50)     NOT NULL,
    stock_quantity          INTEGER         DEFAULT 0,
    requires_double_auth    BOOLEAN         DEFAULT TRUE,
    created_at              TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- Seed default controlled substances
INSERT INTO medicine_inventory (drug_name, dosage_strength, stock_quantity, requires_double_auth) VALUES
    ('Morphine Sulfate',    '5mg',      120,  TRUE),
    ('Fentanyl Citrate',    '100mcg',   85,   TRUE),
    ('Oxycodone HCl',       '10mg',     150,  TRUE),
    ('Ketamine Infusion',   '50mg/ml',  40,   TRUE),
    ('Diazepam Injection',  '5mg/ml',   200,  FALSE)
ON CONFLICT (drug_name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 11. APPOINTMENTS
-- Links patients to doctors for scheduled consultations and care records.
-- Also used to track doctor–patient care relationships.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
    id                  SERIAL          PRIMARY KEY,
    patient_address     VARCHAR(42)     NOT NULL,
    doctor_address      VARCHAR(42)     NOT NULL,
    appointment_date    VARCHAR(20)     NOT NULL,
    appointment_time    VARCHAR(20)     NOT NULL,
    reason              VARCHAR(255)    NOT NULL,
    status              VARCHAR(20)     DEFAULT 'scheduled',   -- 'scheduled', 'completed', 'cancelled'
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);


-- ─────────────────────────────────────────────────────────────────────
-- 12. INSURANCE CLAIMS
-- Patient-filed reimbursement claims. Linked to on-chain claim IDs.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_claims (
    id                  SERIAL          PRIMARY KEY,
    claim_id            INT             DEFAULT NULL,           -- On-chain claim ID
    patient_address     VARCHAR(42)     NOT NULL,
    insurer_address     VARCHAR(42)     NOT NULL,
    amount_requested    NUMERIC(12,2)   NOT NULL,
    amount_approved     NUMERIC(12,2)   DEFAULT 0,
    status              VARCHAR(20)     DEFAULT 'pending',      -- 'pending', 'approved', 'rejected'
    claim_cid           VARCHAR(255)    DEFAULT '',             -- IPFS / S3 document CID
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);


-- ─────────────────────────────────────────────────────────────────────
-- 13. EMERGENCY OVERRIDES
-- Clinical consensus protocol: doctors request cross-patient access.
-- Requires 2 co-signatures to activate.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emergency_overrides (
    id              SERIAL          PRIMARY KEY,
    patient_address VARCHAR(42)     NOT NULL,
    doctor_address  VARCHAR(42)     NOT NULL,
    reason          TEXT            NOT NULL,
    votes_count     INTEGER         DEFAULT 1,
    voted_doctors   TEXT            DEFAULT '',   -- comma-separated list of co-signers
    status          VARCHAR(20)     DEFAULT 'active',   -- 'active', 'endorsed'
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
