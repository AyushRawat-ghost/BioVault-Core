package patient

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"patient-data-system/backend/pkg/config"
	"patient-data-system/backend/pkg/db"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gin-gonic/gin"
)

type PatientHandler struct {
	Cfg *config.Config
	DB  *db.Database
}

func NewPatientHandler(cfg *config.Config, database *db.Database) *PatientHandler {
	return &PatientHandler{
		Cfg: cfg,
		DB:  database,
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

	var name, dob, bloodGroup, allergies, emergencyContact, avatarURL string

	query := `SELECT name, dob, blood_group, allergies, emergency_contact, avatar_url FROM patient_profiles WHERE wallet_address = $1`
	err := h.DB.Conn.QueryRow(query, walletAddress).Scan(&name, &dob, &bloodGroup, &allergies, &emergencyContact, &avatarURL)
	
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
				"avatar_url":        "",
				"is_profile_empty":  true,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query profile: " + err.Error()})
		return
	}

	if avatarURL != "" {
		s3Key := getS3KeyFromURL(avatarURL)
		if s3Key != "" {
			if presigned, signErr := h.getPresignedDownloadURL(c.Request.Context(), s3Key); signErr == nil {
				avatarURL = presigned
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"address":           walletAddress,
		"name":              name,
		"dob":               dob,
		"blood_group":       bloodGroup,
		"allergies":         allergies,
		"emergency_contact": emergencyContact,
		"avatar_url":        avatarURL,
		"is_profile_empty":  false,
	})
}

func getS3KeyFromURL(rawURL string) string {
	idx := strings.Index(rawURL, "Bio-Information/")
	if idx != -1 {
		return rawURL[idx:]
	}
	idx2 := strings.Index(rawURL, "Profile-photos/")
	if idx2 != -1 {
		return rawURL[idx2:]
	}
	return ""
}

func (h *PatientHandler) getPresignedDownloadURL(ctx context.Context, key string) (string, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		return "", err
	}

	client := s3.NewFromConfig(awsCfg)
	presignClient := s3.NewPresignClient(client)

	req, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: &h.Cfg.AWSS3BioBucket,
		Key:    &key,
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		return "", err
	}

	return req.URL, nil
}
