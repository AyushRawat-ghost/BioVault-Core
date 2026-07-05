-- =====================================================================
-- ALTERIS OS — BioVault-Core
-- Seed Data (Development / Testing)
-- Run AFTER schema.sql to populate reference data for local testing.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- TEST PATIENT PROFILES
-- Uses Hardhat pre-funded account addresses (Chain ID 31337)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO patient_profiles (
    wallet_address, name, dob, blood_group, allergies, emergency_contact,
    insurance_provider, insurance_policy_number, insurance_coverage_limit, insurance_policy_status
) VALUES
    ('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', 'Alice Sharma',    '1992-03-15', 'O+',  'Penicillin', '+91-9876543210', 'Alteris Care', 'POL-ALT-00001', 75000.00, 'Active'),
    ('0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 'Bob Mehta',       '1985-07-22', 'A+',  'None',       '+91-9876543211', 'Alteris Care', 'POL-ALT-00002', 50000.00, 'Active'),
    ('0x3c44cdddb6a900fa2b585dd612793d12fa4293bc', 'Rehya Singh',     '1998-11-08', 'B-',  'Sulfa',      '+91-9876543212', 'MediShield',   'POL-MED-00001', 100000.00,'Active'),
    ('0x90f79bf6eb2c4f870365e785982e1f101e93b906', 'Deepak Nair',     '1975-05-30', 'AB+', 'Aspirin',    '+91-9876543213', 'Alteris Care', 'POL-ALT-00003', 50000.00, 'Active'),
    ('0x15d34aaf54267db7d7c367839aaf71a00a2c6a65', 'Priya Iyer',      '2001-09-17', 'O-',  'None',       '+91-9876543214', 'LifePlus',     'POL-LP-00001',  60000.00, 'Active')
ON CONFLICT (wallet_address) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- TEST DOCTOR PROFILES
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO doctor_profiles (
    wallet_address, name, specialization, employee_id, contact_number
) VALUES
    ('0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc', 'Dr. Tejaswini Kadam',  'Cardiologist',       'EMP-001', '+91-9000000001'),
    ('0x976ea74026e726554db657fa54763abd0c3a0aa9', 'Dr. Robert Chen',      'Neurologist',        'EMP-002', '+91-9000000002'),
    ('0x14dc79ed7f5b7b0b1e84a7de5da4c9c7d7d1f0c', 'Dr. Ananya Gupta',     'General Physician',  'EMP-003', '+91-9000000003')
ON CONFLICT (wallet_address) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- SAMPLE APPOINTMENTS (doctor–patient care associations)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO appointments (patient_address, doctor_address, appointment_date, appointment_time, reason, status) VALUES
    ('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc', '2026-07-10', '10:00', 'Routine cardiac checkup',        'scheduled'),
    ('0x70997970c51812dc3a010c7d01b50e0d17dc79c8', '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc', '2026-07-11', '11:30', 'ECG follow-up',                   'scheduled'),
    ('0x3c44cdddb6a900fa2b585dd612793d12fa4293bc', '0x976ea74026e726554db657fa54763abd0c3a0aa9', '2026-07-12', '09:00', 'Migraine evaluation',             'scheduled'),
    ('0x90f79bf6eb2c4f870365e785982e1f101e93b906', '0x976ea74026e726554db657fa54763abd0c3a0aa9', '2026-07-12', '14:00', 'Post-surgery neural monitoring', 'completed')
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- SAMPLE INSURANCE CLAIMS
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO insurance_claims (claim_id, patient_address, insurer_address, amount_requested, amount_approved, status, claim_cid) VALUES
    (1001, '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc', 12500.00, 12500.00, 'approved', 'QmSampleCID001'),
    (1002, '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc', 8750.00,  0.00,     'pending',  'QmSampleCID002'),
    (1003, '0x3c44cdddb6a900fa2b585dd612793d12fa4293bc', '0x976ea74026e726554db657fa54763abd0c3a0aa9', 32000.00, 28000.00, 'approved', 'QmSampleCID003')
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- SAMPLE IMPLANTABLE DEVICES
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO implantable_devices (serial_number, device_name, manufacturer, patient_address, implanted_by, implanted_at, status) VALUES
    ('DEV-PACE-001',  'Cardiac Pacemaker',     'Medtronic',  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc', '2025-03-15 10:00:00', 'implanted'),
    ('DEV-NEURO-002', 'Neurostimulator',       'Abbott',     '0x3c44cdddb6a900fa2b585dd612793d12fa4293bc', '0x976ea74026e726554db657fa54763abd0c3a0aa9', '2025-06-20 09:30:00', 'implanted'),
    ('DEV-PUMP-003',  'Insulin Pump',          'Insulet',    NULL,                                         NULL,                                         NULL,                  'in-stock'),
    ('DEV-PACE-004',  'Cardiac Pacemaker MK2', 'Biotronik',  NULL,                                         NULL,                                         NULL,                  'in-stock')
ON CONFLICT (serial_number) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- SAMPLE HOSPITAL ACTIVITY LOGS
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO hospital_activity_logs (action_type, message) VALUES
    ('SYSTEM',      'ALTERIS OS database initialized and schema bootstrapped.'),
    ('AUTH',        'Admin wallet 0xf39f... authenticated via MetaMask signature.'),
    ('REGISTER',    'New patient Alice Sharma registered — wallet 0xf39f...'),
    ('REGISTER',    'New doctor Dr. Tejaswini Kadam registered — specialization: Cardiologist'),
    ('APPOINTMENT', 'Patient Alice Sharma scheduled consultation with Dr. Tejaswini Kadam for 2026-07-10 at 10:00'),
    ('FINANCE',     'Insurance claim submitted for $12500.00 to insurer 0x9965...');
