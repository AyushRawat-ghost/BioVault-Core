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
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,
		
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
	}

	for i, q := range queries {
		if _, err := d.Conn.Exec(q); err != nil {
			return fmt.Errorf("failed to bootstrap schema table (index %d): %w", i, err)
		}
	}

	log.Println("Database schema verified and bootstrapped successfully")
	return nil
}
