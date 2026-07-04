package patient

import (
	"database/sql"
	"net/http"
	"strings"

	"patient-data-system/backend/pkg/db"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gin-gonic/gin"
)

type PatientHandler struct {
	DB *db.Database
}

func NewPatientHandler(database *db.Database) *PatientHandler {
	return &PatientHandler{
		DB: database,
	}
}

type ProfileRequest struct {
	Address          string `json:"address" binding:"required"`
	Name             string `json:"name" binding:"required"`
	DOB              string `json:"dob" binding:"required"`
	BloodGroup       string `json:"blood_group" binding:"required"`
	Allergies        string `json:"allergies"`
	EmergencyContact string `json:"emergency_contact"`
}

// GetProfile fetches the patient demographic details from the database
func (h *PatientHandler) GetProfile(c *gin.Context) {
	walletAddress := strings.ToLower(c.Query("address"))
	if walletAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet address query parameter is required"})
		return
	}

	if !common.IsHexAddress(walletAddress) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid Ethereum address format"})
		return
	}

	var name, dob, bloodGroup, allergies, emergencyContact string

	query := `SELECT name, dob, blood_group, allergies, emergency_contact FROM patient_profiles WHERE wallet_address = $1`
	err := h.DB.Conn.QueryRow(query, walletAddress).Scan(&name, &dob, &bloodGroup, &allergies, &emergencyContact)
	
	if err != nil {
		if err == sql.ErrNoRows {
			// Profile not created yet - return empty default structure
			c.JSON(http.StatusOK, gin.H{
				"address":           walletAddress,
				"name":              "",
				"dob":               "",
				"blood_group":       "",
				"allergies":         "",
				"emergency_contact": "",
				"is_profile_empty":  true,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query profile: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"address":           walletAddress,
		"name":              name,
		"dob":               dob,
		"blood_group":       bloodGroup,
		"allergies":         allergies,
		"emergency_contact": emergencyContact,
		"is_profile_empty":  false,
	})
}
