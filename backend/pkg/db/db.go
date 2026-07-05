package db

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type Database struct {
	Conn *sql.DB
}

// Connect opens a connection pool to the AWS RDS Postgres instance
func Connect(connStr string) (*Database, error) {
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("database driver opening failed: %w", err)
	}

	// Verify connectivity
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("database connection verification failed: %w", err)
	}

	log.Println("Successfully connected to RDS PostgreSQL database")
	return &Database{Conn: db}, nil
}

// Close gracefully closes the database connection
func (d *Database) Close() {
	if d.Conn != nil {
		_ = d.Conn.Close()
	}
}

// InitSchema automatically bootstraps tables for patient profiles, registrations, and vitals logs
func (d *Database) InitSchema() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS patient_profiles (
			wallet_address VARCHAR(42) PRIMARY KEY,
			name VARCHAR(100) NOT NULL,
			dob VARCHAR(20) NOT NULL,
			blood_group VARCHAR(10) NOT NULL,
			allergies TEXT DEFAULT '',
			emergency_contact VARCHAR(100) DEFAULT '',
			avatar_url VARCHAR(255) DEFAULT '',
			aadhaar_number VARCHAR(12) DEFAULT '',
			pan_number VARCHAR(10) DEFAULT '',
			aadhaar_s3_key VARCHAR(255) DEFAULT '',
			pan_s3_key VARCHAR(255) DEFAULT '',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,

		`ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) DEFAULT '';`,
		`ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(12) DEFAULT '';`,
		`ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10) DEFAULT '';`,
		`ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS aadhaar_s3_key VARCHAR(255) DEFAULT '';`,
		`ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS pan_s3_key VARCHAR(255) DEFAULT '';`,

		`CREATE TABLE IF NOT EXISTS medical_records (
			id SERIAL PRIMARY KEY,
			patient_address VARCHAR(42) NOT NULL,
			doctor_address VARCHAR(42) NOT NULL,
			diagnosis VARCHAR(255) NOT NULL,
			document_type VARCHAR(50) NOT NULL, -- 'prescription', 'report', etc.
			s3_key VARCHAR(255) UNIQUE NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,

		`CREATE TABLE IF NOT EXISTS doctor_profiles (
			wallet_address VARCHAR(42) PRIMARY KEY,
			name VARCHAR(100) NOT NULL,
			specialization VARCHAR(100) NOT NULL,
			aadhaar_number VARCHAR(12) DEFAULT '',
			pan_number VARCHAR(10) DEFAULT '',
			aadhaar_s3_key VARCHAR(255) DEFAULT '',
			pan_s3_key VARCHAR(255) DEFAULT '',
			employee_id VARCHAR(50) DEFAULT '',
			contact_number VARCHAR(20) DEFAULT '',
			home_address TEXT DEFAULT '',
			avatar_url VARCHAR(255) DEFAULT '',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,

		`ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(12) DEFAULT '';`,
		`ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10) DEFAULT '';`,
		`ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS aadhaar_s3_key VARCHAR(255) DEFAULT '';`,
		`ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS pan_s3_key VARCHAR(255) DEFAULT '';`,
		`ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) DEFAULT '';`,
		`ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20) DEFAULT '';`,
		`ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS home_address TEXT DEFAULT '';`,
		`ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';`,
		`ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';`,
		`ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) DEFAULT '';`,
		
		`CREATE TABLE IF NOT EXISTS pending_registrations (
			id SERIAL PRIMARY KEY,
			wallet_address VARCHAR(42) UNIQUE NOT NULL,
			name VARCHAR(100) NOT NULL,
			status VARCHAR(20) DEFAULT 'pending',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,
		
		`CREATE TABLE IF NOT EXISTS vitals_logs (
			id SERIAL PRIMARY KEY,
			patient_address VARCHAR(42) NOT NULL,
			heart_rate INT NOT NULL,
			systolic INT NOT NULL,
			diastolic INT NOT NULL,
			spo2 INT NOT NULL,
			temperature NUMERIC(4,2) NOT NULL,
			anomaly_detected BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,

		`CREATE TABLE IF NOT EXISTS user_sessions (
			id SERIAL PRIMARY KEY,
			wallet_address VARCHAR(42) NOT NULL,
			session_token VARCHAR(100) UNIQUE NOT NULL,
			role VARCHAR(20) NOT NULL, -- 'patient', 'doctor', 'admin'
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			expires_at TIMESTAMP NOT NULL
		);`,

		`CREATE TABLE IF NOT EXISTS implantable_devices (
			serial_number VARCHAR(100) PRIMARY KEY,
			device_name VARCHAR(100) NOT NULL,
			manufacturer VARCHAR(100) NOT NULL,
			patient_address VARCHAR(42) DEFAULT NULL,
			implanted_by VARCHAR(42) DEFAULT NULL,
			implanted_at TIMESTAMP DEFAULT NULL,
			status VARCHAR(20) DEFAULT 'in-stock', -- 'in-stock', 'implanted', 'recalled'
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,

		`CREATE TABLE IF NOT EXISTS controlled_substances_logs (
			id SERIAL PRIMARY KEY,
			drug_name VARCHAR(100) NOT NULL,
			dosage VARCHAR(50) NOT NULL,
			patient_address VARCHAR(42) NOT NULL,
			requester_doctor VARCHAR(42) NOT NULL,
			authorizer_admin VARCHAR(42) DEFAULT NULL,
			status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'authorized', 'rejected'
			requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			authorized_at TIMESTAMP DEFAULT NULL
		);`,

		`CREATE TABLE IF NOT EXISTS hospital_activity_logs (
			id SERIAL PRIMARY KEY,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			action_type VARCHAR(50) NOT NULL,
			message TEXT NOT NULL
		);`,

		`CREATE TABLE IF NOT EXISTS medicine_inventory (
			id SERIAL PRIMARY KEY,
			drug_name VARCHAR(100) UNIQUE NOT NULL,
			dosage_strength VARCHAR(50) NOT NULL,
			stock_quantity INTEGER DEFAULT 0,
			requires_double_auth BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,

		`INSERT INTO medicine_inventory (drug_name, dosage_strength, stock_quantity, requires_double_auth)
		 VALUES 
			('Morphine Sulfate', '5mg', 120, TRUE),
			('Fentanyl Citrate', '100mcg', 85, TRUE),
			('Oxycodone HCl', '10mg', 150, TRUE),
			('Ketamine Infusion', '50mg/ml', 40, TRUE),
			('Diazepam Injection', '5mg/ml', 200, FALSE)
		 ON CONFLICT (drug_name) DO NOTHING;`,
	}

	for i, q := range queries {
		if _, err := d.Conn.Exec(q); err != nil {
			return fmt.Errorf("failed to bootstrap schema table (index %d): %w", i, err)
		}
	}

	log.Println("Database schema verified and bootstrapped successfully")
	return nil
}
