-- =====================================================================
-- ALTERIS OS — BioVault-Core
-- Useful Queries (Developer Reference)
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- PATIENT QUERIES
-- ─────────────────────────────────────────────────────────────────────

-- List all patients (summary)
SELECT wallet_address, name, blood_group, status, created_at
FROM patient_profiles
ORDER BY created_at DESC;

-- Get full patient profile
SELECT * FROM patient_profiles WHERE wallet_address = '0x...';

-- Count active patients
SELECT COUNT(*) AS active_patients FROM patient_profiles WHERE status = 'active';


-- ─────────────────────────────────────────────────────────────────────
-- DOCTOR QUERIES
-- ─────────────────────────────────────────────────────────────────────

-- List all doctors
SELECT wallet_address, name, specialization, employee_id, status
FROM doctor_profiles
ORDER BY name;

-- Get patients under a specific doctor (via appointments)
SELECT DISTINCT p.wallet_address, p.name, p.blood_group
FROM patient_profiles p
JOIN appointments a ON a.patient_address = p.wallet_address
WHERE a.doctor_address = '0x...'
ORDER BY p.name;

-- Count patients per doctor
SELECT d.name AS doctor_name, COUNT(DISTINCT a.patient_address) AS patient_count
FROM doctor_profiles d
LEFT JOIN appointments a ON a.doctor_address = d.wallet_address
GROUP BY d.name
ORDER BY patient_count DESC;


-- ─────────────────────────────────────────────────────────────────────
-- VITALS & ML ANOMALY QUERIES
-- ─────────────────────────────────────────────────────────────────────

-- Latest vitals for a patient
SELECT heart_rate, systolic, diastolic, spo2, temperature, anomaly_detected, created_at
FROM vitals_logs
WHERE patient_address = '0x...'
ORDER BY created_at DESC
LIMIT 20;

-- All anomalous vitals (ML alerts) for a doctor's patients
SELECT v.id, v.patient_address, COALESCE(p.name, 'Unknown') AS patient_name,
       v.heart_rate, v.systolic, v.diastolic, v.spo2, v.temperature, v.created_at
FROM vitals_logs v
LEFT JOIN patient_profiles p ON p.wallet_address = v.patient_address
WHERE v.anomaly_detected = TRUE
  AND v.patient_address IN (
      SELECT DISTINCT patient_address FROM appointments WHERE doctor_address = '0x...'
  )
ORDER BY v.created_at DESC
LIMIT 50;

-- Anomaly count per patient
SELECT patient_address, COUNT(*) AS anomaly_count
FROM vitals_logs
WHERE anomaly_detected = TRUE
GROUP BY patient_address
ORDER BY anomaly_count DESC;

-- Total vitals logged and anomaly rate
SELECT
    COUNT(*)                                                        AS total_readings,
    COUNT(*) FILTER (WHERE anomaly_detected = TRUE)                 AS anomaly_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE anomaly_detected = TRUE)
          / NULLIF(COUNT(*), 0), 2)                                 AS anomaly_rate_pct
FROM vitals_logs;


-- ─────────────────────────────────────────────────────────────────────
-- INSURANCE CLAIMS QUERIES
-- ─────────────────────────────────────────────────────────────────────

-- All claims with patient names
SELECT ic.id, ic.claim_id, p.name AS patient_name,
       ic.amount_requested, ic.amount_approved, ic.status, ic.created_at
FROM insurance_claims ic
LEFT JOIN patient_profiles p ON p.wallet_address = ic.patient_address
ORDER BY ic.created_at DESC;

-- Pending claims only
SELECT * FROM insurance_claims WHERE status = 'pending' ORDER BY created_at DESC;

-- Total approved payouts
SELECT SUM(amount_approved) AS total_approved FROM insurance_claims WHERE status = 'approved';


-- ─────────────────────────────────────────────────────────────────────
-- OVERRIDE & TRANSFER QUERIES
-- ─────────────────────────────────────────────────────────────────────

-- List all active overrides with names
SELECT eo.id, p.name AS patient_name, eo.patient_address,
       d.name AS doctor_name, eo.doctor_address,
       eo.reason, eo.votes_count, eo.voted_doctors, eo.status, eo.created_at
FROM emergency_overrides eo
LEFT JOIN patient_profiles p ON p.wallet_address = eo.patient_address
LEFT JOIN doctor_profiles  d ON d.wallet_address = eo.doctor_address
ORDER BY eo.created_at DESC;

-- Pending overrides awaiting more co-signatures
SELECT * FROM emergency_overrides WHERE status = 'active' AND votes_count < 2;

-- Endorse an override (add co-signature)
UPDATE emergency_overrides
SET votes_count   = votes_count + 1,
    voted_doctors = CONCAT(voted_doctors, ',', '0x<cosigner_address>'),
    status        = CASE WHEN votes_count + 1 >= 2 THEN 'endorsed' ELSE 'active' END
WHERE id = <override_id>;


-- ─────────────────────────────────────────────────────────────────────
-- REGULATORY LEDGER QUERIES
-- ─────────────────────────────────────────────────────────────────────

-- All controlled substance dispensing requests
SELECT csl.id, csl.drug_name, csl.dosage,
       p.name AS patient_name, d.name AS doctor_name,
       csl.status, csl.requested_at
FROM controlled_substances_logs csl
LEFT JOIN patient_profiles p ON p.wallet_address = csl.patient_address
LEFT JOIN doctor_profiles  d ON d.wallet_address = csl.requester_doctor
ORDER BY csl.requested_at DESC;

-- Pending narcotic requests
SELECT * FROM controlled_substances_logs WHERE status = 'pending';


-- ─────────────────────────────────────────────────────────────────────
-- INVENTORY QUERIES
-- ─────────────────────────────────────────────────────────────────────

-- Current medicine stock levels
SELECT drug_name, dosage_strength, stock_quantity, requires_double_auth
FROM medicine_inventory
ORDER BY stock_quantity ASC;

-- Low stock alert (below 50 units)
SELECT drug_name, stock_quantity
FROM medicine_inventory
WHERE stock_quantity < 50
ORDER BY stock_quantity ASC;


-- ─────────────────────────────────────────────────────────────────────
-- DASHBOARD KPI QUERIES
-- ─────────────────────────────────────────────────────────────────────

-- Hospital-wide KPIs (used by admin dashboard)
SELECT
    (SELECT COUNT(*) FROM patient_profiles WHERE status = 'active')                     AS active_patients,
    (SELECT COUNT(*) FROM doctor_profiles   WHERE status = 'active')                    AS active_doctors,
    (SELECT COUNT(*) FROM vitals_logs       WHERE anomaly_detected = TRUE
         AND created_at > NOW() - INTERVAL '24 hours')                                  AS anomalies_last_24h,
    (SELECT COUNT(*) FROM insurance_claims  WHERE status = 'pending')                   AS pending_claims,
    (SELECT COUNT(*) FROM emergency_overrides WHERE status = 'active')                  AS active_overrides,
    (SELECT COUNT(*) FROM implantable_devices WHERE status = 'in-stock')                AS devices_in_stock;


-- ─────────────────────────────────────────────────────────────────────
-- ACTIVITY LOG QUERIES
-- ─────────────────────────────────────────────────────────────────────

-- Latest 100 system events
SELECT id, timestamp, action_type, message
FROM hospital_activity_logs
ORDER BY timestamp DESC
LIMIT 100;

-- Filter by event type
SELECT * FROM hospital_activity_logs
WHERE action_type = 'AUTH'   -- or 'REGISTER', 'FINANCE', 'APPOINTMENT', 'SYSTEM'
ORDER BY timestamp DESC;
