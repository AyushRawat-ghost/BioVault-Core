package patient

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
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

// BookAppointment schedules a virtual consult with a physician
func (h *PatientHandler) BookAppointment(c *gin.Context) {
	var req struct {
		PatientAddress  string `json:"patient_address" binding:"required"`
		DoctorAddress   string `json:"doctor_address" binding:"required"`
		AppointmentDate string `json:"appointment_date" binding:"required"`
		AppointmentTime string `json:"appointment_time" binding:"required"`
		Reason          string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := `
		INSERT INTO appointments (patient_address, doctor_address, appointment_date, appointment_time, reason)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := h.DB.Conn.Exec(query, strings.ToLower(req.PatientAddress), strings.ToLower(req.DoctorAddress), req.AppointmentDate, req.AppointmentTime, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to book appointment: " + err.Error()})
		return
	}

	var docName string
	_ = h.DB.Conn.QueryRow("SELECT name FROM doctor_profiles WHERE wallet_address = $1", strings.ToLower(req.DoctorAddress)).Scan(&docName)
	if docName == "" {
		docName = req.DoctorAddress
	}

	h.DB.Conn.Exec("INSERT INTO hospital_activity_logs (action_type, message) VALUES ($1, $2)", "APPOINTMENT", fmt.Sprintf("Patient booked consultation with Dr. %s for %s at %s.", docName, req.AppointmentDate, req.AppointmentTime))

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Appointment scheduled successfully"})
}

// GetAppointments lists all scheduled sessions for the patient
func (h *PatientHandler) GetAppointments(c *gin.Context) {
	patientAddr := strings.ToLower(c.Query("address"))
	if patientAddr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
		return
	}

	query := `
		SELECT a.id, a.doctor_address, a.appointment_date, a.appointment_time, a.reason, a.status, COALESCE(d.name, a.doctor_address), COALESCE(d.specialization, 'General')
		FROM appointments a
		LEFT JOIN doctor_profiles d ON a.doctor_address = d.wallet_address
		WHERE a.patient_address = $1
		ORDER BY a.created_at DESC
	`
	rows, err := h.DB.Conn.Query(query, patientAddr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query appointments: " + err.Error()})
		return
	}
	defer rows.Close()

	type AppointmentItem struct {
		ID              int    `json:"id"`
		DoctorAddress   string `json:"doctor_address"`
		AppointmentDate string `json:"appointment_date"`
		AppointmentTime string `json:"appointment_time"`
		Reason          string `json:"reason"`
		Status          string `json:"status"`
		DoctorName      string `json:"doctor_name"`
		Specialization  string `json:"specialization"`
	}

	var list []AppointmentItem
	for rows.Next() {
		var app AppointmentItem
		if scanErr := rows.Scan(&app.ID, &app.DoctorAddress, &app.AppointmentDate, &app.AppointmentTime, &app.Reason, &app.Status, &app.DoctorName, &app.Specialization); scanErr == nil {
			list = append(list, app)
		}
	}
	if list == nil {
		list = []AppointmentItem{}
	}
	c.JSON(http.StatusOK, list)
}

// GetImplants lists all device telemetry and safety recall items
func (h *PatientHandler) GetImplants(c *gin.Context) {
	patientAddr := strings.ToLower(c.Query("address"))
	if patientAddr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
		return
	}

	query := `
		SELECT serial_number, device_name, manufacturer, implanted_at, status, COALESCE(d.name, implanted_by)
		FROM implantable_devices
		LEFT JOIN doctor_profiles d ON implanted_by = d.wallet_address
		WHERE patient_address = $1
		ORDER BY implanted_at DESC
	`
	rows, err := h.DB.Conn.Query(query, patientAddr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query implantable devices: " + err.Error()})
		return
	}
	defer rows.Close()

	type ImplantItem struct {
		SerialNumber string `json:"serial_number"`
		DeviceName   string `json:"device_name"`
		Manufacturer string `json:"manufacturer"`
		ImplantedAt  string `json:"implanted_at"`
		Status       string `json:"status"`
		SurgeonName  string `json:"surgeon_name"`
		BatteryLife  int    `json:"battery_life"`
	}

	var list []ImplantItem
	for rows.Next() {
		var item ImplantItem
		var impAt sql.NullTime
		if scanErr := rows.Scan(&item.SerialNumber, &item.DeviceName, &item.Manufacturer, &impAt, &item.Status, &item.SurgeonName); scanErr == nil {
			if impAt.Valid {
				item.ImplantedAt = impAt.Time.Local().Format("2006-01-02")
				monthsElapsed := int(time.Since(impAt.Time).Hours() / (24 * 30))
				battery := 98 - (monthsElapsed * 2)
				if battery < 10 {
					battery = 10
				}
				item.BatteryLife = battery
			} else {
				item.ImplantedAt = "N/A"
				item.BatteryLife = 100
			}
			list = append(list, item)
		}
	}
	if list == nil {
		list = []ImplantItem{}
	}
	c.JSON(http.StatusOK, list)
}

// GetPrescriptions returns standard Rx entries and controlled substance reviews
func (h *PatientHandler) GetPrescriptions(c *gin.Context) {
	patientAddr := strings.ToLower(c.Query("address"))
	if patientAddr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
		return
	}

	type RxItem struct {
		ID         int    `json:"id"`
		DrugName   string `json:"drug_name"`
		Dosage     string `json:"dosage"`
		Prescriber string `json:"prescriber"`
		Date       string `json:"date"`
		Type       string `json:"type"`
		Status     string `json:"status"`
	}

	var list []RxItem

	queryRecords := `
		SELECT r.id, r.diagnosis, COALESCE(d.name, r.doctor_address), r.created_at 
		FROM medical_records r
		LEFT JOIN doctor_profiles d ON r.doctor_address = d.wallet_address
		WHERE r.patient_address = $1 AND r.document_type = 'prescription'
		ORDER BY r.created_at DESC
	`
	rowsRecords, err := h.DB.Conn.Query(queryRecords, patientAddr)
	if err == nil {
		defer rowsRecords.Close()
		for rowsRecords.Next() {
			var id int
			var diagnosis, docName string
			var createdAt time.Time
			if scanErr := rowsRecords.Scan(&id, &diagnosis, &docName, &createdAt); scanErr == nil {
				list = append(list, RxItem{
					ID:         id,
					DrugName:   diagnosis,
					Dosage:     "As Directed",
					Prescriber: docName,
					Date:       createdAt.Local().Format("2006-01-02"),
					Type:       "Standard",
					Status:     "Active",
				})
			}
		}
	}

	queryControlled := `
		SELECT c.id, c.drug_name, c.dosage, COALESCE(d.name, c.requester_doctor), c.requested_at, c.status
		FROM controlled_substances_logs c
		LEFT JOIN doctor_profiles d ON c.requester_doctor = d.wallet_address
		WHERE c.patient_address = $1
		ORDER BY c.requested_at DESC
	`
	rowsControlled, err := h.DB.Conn.Query(queryControlled, patientAddr)
	if err == nil {
		defer rowsControlled.Close()
		for rowsControlled.Next() {
			var id int
			var drugName, dosage, docName, status string
			var requestedAt time.Time
			if scanErr := rowsControlled.Scan(&id, &drugName, &dosage, &docName, &requestedAt, &status); scanErr == nil {
				displayStatus := "Pending Authorization"
				if status == "authorized" {
					displayStatus = "Authorized"
				} else if status == "rejected" {
					displayStatus = "Rejected"
				}
				list = append(list, RxItem{
					ID:         id + 10000,
					DrugName:   drugName,
					Dosage:     dosage,
					Prescriber: docName,
					Date:       requestedAt.Local().Format("2006-01-02"),
					Type:       "Controlled Substance",
					Status:     displayStatus,
				})
			}
		}
	}

	if list == nil {
		list = []RxItem{}
	}
	c.JSON(http.StatusOK, list)
}

// GetInsurance returns the policy details and claims logs
func (h *PatientHandler) GetInsurance(c *gin.Context) {
	patientAddr := strings.ToLower(c.Query("address"))
	if patientAddr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
		return
	}

	var provider, policyNum, status string
	var limit float64
	err := h.DB.Conn.QueryRow("SELECT insurance_provider, insurance_policy_number, insurance_coverage_limit, insurance_policy_status FROM patient_profiles WHERE wallet_address = $1", patientAddr).Scan(&provider, &policyNum, &limit, &status)
	if err != nil {
		provider = "Alteris Care"
		policyNum = "POL-ALT-88291"
		limit = 50000.00
		status = "Active"
	}

	query := `
		SELECT id, claim_id, insurer_address, amount_requested, amount_approved, status, claim_cid, created_at 
		FROM insurance_claims
		WHERE patient_address = $1
		ORDER BY created_at DESC
	`
	rows, err := h.DB.Conn.Query(query, patientAddr)
	var claims []gin.H
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var id int
			var claimID sql.NullInt32
			var insurer, status, cid string
			var reqAmt, appAmt float64
			var createdAt time.Time
			if scanErr := rows.Scan(&id, &claimID, &insurer, &reqAmt, &appAmt, &status, &cid, &createdAt); scanErr == nil {
				var cID interface{} = nil
				if claimID.Valid {
					cID = claimID.Int32
				}
				claims = append(claims, gin.H{
					"id":               id,
					"claim_id":         cID,
					"insurer_address":  insurer,
					"amount_requested": reqAmt,
					"amount_approved":  appAmt,
					"status":           status,
					"claim_cid":        cid,
					"date":             createdAt.Local().Format("2006-01-02 15:04:05"),
				})
			}
		}
	}

	if claims == nil {
		claims = []gin.H{}
	}

	c.JSON(http.StatusOK, gin.H{
		"provider":      provider,
		"policy_number": policyNum,
		"limit":         limit,
		"status":        status,
		"claims":        claims,
	})
}

// SubmitInsuranceClaim saves a submitted claim log off-chain
func (h *PatientHandler) SubmitInsuranceClaim(c *gin.Context) {
	var req struct {
		PatientAddress  string  `json:"patient_address" binding:"required"`
		InsurerAddress  string  `json:"insurer_address" binding:"required"`
		AmountRequested float64 `json:"amount_requested" binding:"required"`
		ClaimCID        string  `json:"claim_cid"`
		ClaimID         int     `json:"claim_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := `
		INSERT INTO insurance_claims (claim_id, patient_address, insurer_address, amount_requested, status, claim_cid)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	var cID interface{} = nil
	if req.ClaimID > 0 {
		cID = req.ClaimID
	}
	_, err := h.DB.Conn.Exec(query, cID, strings.ToLower(req.PatientAddress), strings.ToLower(req.InsurerAddress), req.AmountRequested, "pending", req.ClaimCID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record claim: " + err.Error()})
		return
	}

	h.DB.Conn.Exec("INSERT INTO hospital_activity_logs (action_type, message) VALUES ($1, $2)", "FINANCE", fmt.Sprintf("Insurance claim submitted for $%.2f to insurer %s.", req.AmountRequested, req.InsurerAddress))

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Insurance claim submitted successfully"})
}

// UpdateInsuranceClaim updates a pending insurance claim
func (h *PatientHandler) UpdateInsuranceClaim(c *gin.Context) {
	var req struct {
		ID              int     `json:"id" binding:"required"`
		AmountRequested float64 `json:"amount_requested" binding:"required"`
		ClaimCID        string  `json:"claim_cid"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var status string
	err := h.DB.Conn.QueryRow("SELECT status FROM insurance_claims WHERE id = $1", req.ID).Scan(&status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "claim not found"})
		return
	}
	if status != "pending" && status != "Pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only pending claims can be modified"})
		return
	}

	query := `
		UPDATE insurance_claims 
		SET amount_requested = $1, claim_cid = $2
		WHERE id = $3
	`
	_, err = h.DB.Conn.Exec(query, req.AmountRequested, req.ClaimCID, req.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update claim: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Claim updated successfully"})
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
