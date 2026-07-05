package main

import (
	"log"
	"net/http"
	"patient-data-system/backend/api/admin"
	"patient-data-system/backend/api/auth"
	"patient-data-system/backend/api/patient"
	"patient-data-system/backend/api/records"
	"patient-data-system/backend/api/vitals"
	"patient-data-system/backend/pkg/config"
	"patient-data-system/backend/pkg/db"
	"patient-data-system/backend/pkg/ethclient"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Load Configurations
	cfg := config.LoadConfig()

	// 2. Connect to RDS PostgreSQL Database
	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Fatal: Failed to connect to RDS database: %v", err)
	}
	defer database.Close()

	// Initialize tables
	if err := database.InitSchema(); err != nil {
		log.Fatalf("Fatal: Failed to bootstrap database schema: %v", err)
	}

	// 3. Connect to Ethereum RPC Node
	eth, err := ethclient.Connect(cfg.RPCURL)
	if err != nil {
		log.Printf("Warning: Failed to connect to Ethereum Node at %s: %v. Raw blockchain features will revert.", cfg.RPCURL, err)
	} else {
		log.Printf("Connected to Ethereum RPC at %s (ChainID: %s)", cfg.RPCURL, eth.ChainID.String())
		defer eth.Close()
	}

	gin.SetMode(gin.DebugMode)
	r := gin.Default()

	// CORS Setup
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "Aetheris Go core operational"})
	})

	// 4. Register Routes
	apiGroup := r.Group("/api")
	
	// Authentication
	if eth != nil {
		authHandler := auth.NewAuthHandler(cfg, database, eth)
		auth.RegisterRoutes(apiGroup, authHandler)
	} else {
		log.Println("Skipping Auth route registration: Ethereum client offline")
	}

	// Patient
	patientHandler := patient.NewPatientHandler(cfg, database)
	patient.RegisterRoutes(apiGroup, patientHandler)

	// Admin
	adminHandler := admin.NewAdminHandler(cfg, database, eth)
	admin.RegisterRoutes(apiGroup, adminHandler)

	// Vitals (IoT Stream Ingestion)
	vitalsHandler := vitals.NewVitalsHandler(cfg, database)
	vitals.RegisterRoutes(apiGroup, vitalsHandler)

	// Records (S3 Uploads & Blockchain indexing)
	recordsHandler := records.NewRecordsHandler(cfg, database, eth)
	records.RegisterRoutes(apiGroup, recordsHandler)

	log.Printf("Aetheris Go Gateway online on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}
