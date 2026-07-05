package vitals

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"patient-data-system/backend/pkg/config"
	"patient-data-system/backend/pkg/db"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gin-gonic/gin"
)

type VitalsHandler struct {
	Cfg *config.Config
	DB  *db.Database
}

func NewVitalsHandler(cfg *config.Config, database *db.Database) *VitalsHandler {
	return &VitalsHandler{
		Cfg: cfg,
		DB:  database,
	}
}

type VitalsStreamRequest struct {
	PatientAddress string  `json:"patient_address" binding:"required"`
	HeartRate      int     `json:"heart_rate" binding:"required"`
	Systolic       int     `json:"systolic" binding:"required"`
	Diastolic      int     `json:"diastolic" binding:"required"`
	SpO2           int     `json:"spo2" binding:"required"`
	Temperature    float64 `json:"temperature" binding:"required"`
}

type MLPredictResponse struct {
	AnomalyDetected bool    `json:"anomaly_detected"`
	Confidence      float64 `json:"confidence"`
	Warning         string  `json:"warning"`
}

// StreamVitals receives streaming data, calls the ML service, and logs to PostgreSQL
func (h *VitalsHandler) StreamVitals(c *gin.Context) {
	var req VitalsStreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	patientAddr := strings.ToLower(req.PatientAddress)
	if !common.IsHexAddress(patientAddr) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient address format"})
		return
	}

	// 1. Forward to Python FastAPI ML Microservice
	anomalyDetected := false
	warningMsg := "Vitals logged"
	mlURL := fmt.Sprintf("%s/predict", h.Cfg.MLServiceURL)

	reqBytes, err := json.Marshal(req)
	if err == nil {
		resp, postErr := http.Post(mlURL, "application/json", bytes.NewBuffer(reqBytes))
		if postErr == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			bodyBytes, readErr := io.ReadAll(resp.Body)
			if readErr == nil {
				var mlResp MLPredictResponse
				if unpackErr := json.Unmarshal(bodyBytes, &mlResp); unpackErr == nil {
					anomalyDetected = mlResp.AnomalyDetected
					warningMsg = mlResp.Warning
				}
			}
		} else {
			if postErr != nil {
				fmt.Printf("Warning: Failed to reach ML microservice: %v\n", postErr)
			} else {
				fmt.Printf("Warning: ML microservice returned status: %d\n", resp.StatusCode)
			}
		}
	}

	// 2. Log in RDS PostgreSQL
	insertQuery := `
		INSERT INTO vitals_logs (patient_address, heart_rate, systolic, diastolic, spo2, temperature, anomaly_detected)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, dbErr := h.DB.Conn.Exec(
		insertQuery,
		patientAddr,
		req.HeartRate,
		req.Systolic,
		req.Diastolic,
		req.SpO2,
		req.Temperature,
		anomalyDetected,
	)

	if dbErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save vitals log to database: " + dbErr.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":           "success",
		"patient_address":  patientAddr,
		"anomaly_detected": anomalyDetected,
		"warning":          warningMsg,
		"timestamp":        time.Now().Unix(),
	})
}

// GetVitalsHistory retrieves the last 50 vitals entries for charting
func (h *VitalsHandler) GetVitalsHistory(c *gin.Context) {
	patientAddr := strings.ToLower(c.Query("address"))
	if patientAddr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "patient address query parameter is required"})
		return
	}

	if !common.IsHexAddress(patientAddr) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid Ethereum address format"})
		return
	}

	query := `
		SELECT heart_rate, systolic, diastolic, spo2, temperature, anomaly_detected, created_at 
		FROM vitals_logs 
		WHERE patient_address = $1 
		ORDER BY created_at DESC 
		LIMIT 50
	`
	rows, err := h.DB.Conn.Query(query, patientAddr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query vital logs: " + err.Error()})
		return
	}
	defer rows.Close()

	type VitalsLog struct {
		HeartRate       int       `json:"heart_rate"`
		Systolic        int       `json:"systolic"`
		Diastolic       int       `json:"diastolic"`
		SpO2            int       `json:"spo2"`
		Temperature     float64   `json:"temperature"`
		AnomalyDetected bool      `json:"anomaly_detected"`
		CreatedAt       time.Time `json:"created_at"`
	}

	var logs []VitalsLog
	for rows.Next() {
		var log VitalsLog
		scanErr := rows.Scan(
			&log.HeartRate,
			&log.Systolic,
			&log.Diastolic,
			&log.SpO2,
			&log.Temperature,
			&log.AnomalyDetected,
			&log.CreatedAt,
		)
		if scanErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to scan row: " + scanErr.Error()})
			return
		}
		logs = append(logs, log)
	}

	// Default to empty array instead of null
	if logs == nil {
		logs = []VitalsLog{}
	}

	c.JSON(http.StatusOK, logs)
}
