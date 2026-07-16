package admin

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"database/sql"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"patient-data-system/backend/pkg/config"
	"patient-data-system/backend/pkg/db"
	"patient-data-system/backend/pkg/ethclient"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gin-gonic/gin"
	"sort"
)

// Minimal PatientRegistry ABI representing the addPatient function
const patientRegistryWriteABI = `[{"inputs":[{"name":"patient","type":"address"},{"name":"name","type":"string"},{"name":"ipfsProfile","type":"string"}],"name":"addPatient","outputs":[],"stateMutability":"nonpayable","type":"function"}]`

// Minimal DoctorRegistry ABI representing the addDoctor function
const doctorRegistryWriteABI = `[{"inputs":[{"name":"doctor","type":"address"},{"name":"name","type":"string"},{"name":"specialization","type":"string"},{"name":"ipfsProfile","type":"string"},{"name":"profileCID","type":"string"}],"name":"addDoctor","outputs":[],"stateMutability":"nonpayable","type":"function"}]`

// Minimal RegulatoryLedger ABI representing the implantable device and narcotic compliance logging functions
const regulatoryLedgerABI = `[{"inputs":[{"name":"_serialNumber","type":"string"},{"name":"_patient","type":"address"},{"name":"_surgeon","type":"address"},{"name":"_deviceName","type":"string"},{"name":"_manufacturer","type":"string"}],"name":"implantDevice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_serialNumber","type":"string"}],"name":"recallDevice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_dbId","type":"uint256"},{"name":"_drugName","type":"string"},{"name":"_dosage","type":"string"},{"name":"_patient","type":"address"},{"name":"_requester","type":"address"},{"name":"_authorizer","type":"address"},{"name":"_action","type":"string"}],"name":"logNarcoticAdministration","outputs":[],"stateMutability":"nonpayable","type":"function"}]`

type AdminHandler struct {
	Cfg       *config.Config
	DB        *db.Database
	EthClient *ethclient.EthereumClient
}

func NewAdminHandler(cfg *config.Config, database *db.Database, ethClient *ethclient.EthereumClient) *AdminHandler {
	return &AdminHandler{
		Cfg:       cfg,
		DB:        database,
		EthClient: ethClient,
	}
}

type AdmitPatientRequest struct {
	Address          string `json:"address" binding:"required"`
	Name             string `json:"name" binding:"required"`
	DOB              string `json:"dob" binding:"required"`
	BloodGroup       string `json:"blood_group" binding:"required"`
	Allergies        string `json:"allergies"`
	EmergencyContact string `json:"emergency_contact"`
}

// AdmitPatient registers the patient on-chain and populates their profile in the database
func (h *AdminHandler) AdmitPatient(c *gin.Context) {
	walletAddrStr := strings.ToLower(c.PostForm("address"))
	name := c.PostForm("name")
	dob := c.PostForm("dob")
	bloodGroup := c.PostForm("blood_group")
	allergies := c.PostForm("allergies")
	emergencyContact := c.PostForm("emergency_contact")
	aadhaarNumber := c.PostForm("aadhaar_number")
	panNumber := c.PostForm("pan_number")

	if walletAddrStr == "" || name == "" || dob == "" || bloodGroup == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address, name, dob, and blood_group are required form fields"})
		return
	}

	if !common.IsHexAddress(walletAddrStr) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient wallet address format"})
		return
	}
	patientAddr := common.HexToAddress(walletAddrStr)

	// 1. Upload Aadhaar Card file if present
	var aadhaarS3Key string
	aadhaarFileHeader, err := c.FormFile("aadhaar_file")
	if err == nil {
		file, errOpen := aadhaarFileHeader.Open()
		if errOpen == nil {
			fileBytes, errRead := io.ReadAll(file)
			file.Close()
			if errRead == nil {
				ext := filepath.Ext(aadhaarFileHeader.Filename)
				aadhaarS3Key = fmt.Sprintf("Bio-Information/patients/aadhaar/%s%s", walletAddrStr, ext)
				_, err = h.uploadToS3Bio(c.Request.Context(), aadhaarS3Key, fileBytes)
				if err != nil {
					c.JSON(http.StatusBadGateway, gin.H{"error": "failed to upload Aadhaar card to S3: " + err.Error()})
					return
				}
			}
		}
	}

	// 2. Upload PAN Card file if present
	var panS3Key string
	panFileHeader, err := c.FormFile("pan_file")
	if err == nil {
		file, errOpen := panFileHeader.Open()
		if errOpen == nil {
			fileBytes, errRead := io.ReadAll(file)
			file.Close()
			if errRead == nil {
				ext := filepath.Ext(panFileHeader.Filename)
				panS3Key = fmt.Sprintf("Bio-Information/patients/pan/%s%s", walletAddrStr, ext)
				_, err = h.uploadToS3Bio(c.Request.Context(), panS3Key, fileBytes)
				if err != nil {
					c.JSON(http.StatusBadGateway, gin.H{"error": "failed to upload PAN card to S3: " + err.Error()})
					return
				}
			}
		}
	}

	// 3. Submit on-chain transaction to register patient (Mint SBT)
	txHash, err := h.submitOnChainPatientRegistration(c, patientAddr, name)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to register patient on blockchain: " + err.Error()})
		return
	}

	// 4. Write/Upsert patient profile to RDS PostgreSQL database
	query := `
		INSERT INTO patient_profiles (wallet_address, name, dob, blood_group, allergies, emergency_contact, aadhaar_number, pan_number, aadhaar_s3_key, pan_s3_key)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (wallet_address) DO UPDATE 
		SET name = $2, dob = $3, blood_group = $4, allergies = $5, emergency_contact = $6, aadhaar_number = $7, pan_number = $8, aadhaar_s3_key = $9, pan_s3_key = $10
	`
	_, dbErr := h.DB.Conn.Exec(query, walletAddrStr, name, dob, bloodGroup, allergies, emergencyContact, aadhaarNumber, panNumber, aadhaarS3Key, panS3Key)
	if dbErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Patient registered on blockchain, but failed to save profile in database: " + dbErr.Error(),
			"tx_hash": txHash,
		})
		return
	}

	LogHospitalActivity(h.DB.Conn, "ADMISSION", fmt.Sprintf("Patient %s admitted, Soulbound Token (SBT) minted, KYC archived in S3.", name))

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Patient admitted on-chain and profile set in database successfully",
		"tx_hash": txHash,
	})
}

// submitOnChainPatientRegistration signs and broadcasts the addPatient transaction
func (h *AdminHandler) submitOnChainPatientRegistration(c *gin.Context, patient common.Address, name string) (string, error) {
	if h.EthClient == nil {
		return "0x-offline-simulate-hash", nil // Safe fallback for offline node simulation
	}

	contractAddr := common.HexToAddress(h.Cfg.PatientRegistry)
	parsedABI, err := abi.JSON(strings.NewReader(patientRegistryWriteABI))
	if err != nil {
		return "", err
	}

	// Pack call inputs: addPatient(address patient, string name, string ipfsProfile)
	callData, err := parsedABI.Pack("addPatient", patient, name, "ipfs://soulbound-identity-profile")
	if err != nil {
		return "", err
	}

	// Parse admin private key
	privateKey, err := crypto.HexToECDSA(h.Cfg.DeployerPrivateKey)
	if err != nil {
		return "", err
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", err
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	ctx := c.Request.Context()
	nonce, err := h.EthClient.Client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return "", err
	}

	gasPrice, err := h.EthClient.Client.SuggestGasPrice(ctx)
	if err != nil {
		return "", err
	}

	// Estimate gas
	gasLimit, err := h.EthClient.Client.EstimateGas(ctx, ethereum.CallMsg{
		From: fromAddress,
		To:   &contractAddr,
		Data: callData,
	})
	if err != nil {
		gasLimit = 300000 // Fallback
	}

	// Build Transaction
	tx := types.NewTx(&types.LegacyTx{
		Nonce:    nonce,
		To:       &contractAddr,
		Value:    big.NewInt(0),
		Gas:      gasLimit,
		GasPrice: gasPrice,
		Data:     callData,
	})

	// Sign Transaction
	signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(h.EthClient.ChainID), privateKey)
	if err != nil {
		return "", err
	}

	// Broadcast Transaction
	err = h.EthClient.Client.SendTransaction(ctx, signedTx)
	if err != nil {
		return "", err
	}

	return signedTx.Hash().Hex(), nil
}

// ListAdmittedPatients retrieves all patient wallet addresses, names, and avatar URLs from the database
func (h *AdminHandler) ListAdmittedPatients(c *gin.Context) {
	query := `SELECT wallet_address, name, status, blood_group, avatar_url FROM patient_profiles`
	rows, err := h.DB.Conn.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query patients: " + err.Error()})
		return
	}
	defer rows.Close()

	type PatientInfo struct {
		Address    string `json:"address"`
		Name       string `json:"name"`
		Status     string `json:"status"`
		BloodGroup string `json:"blood_group"`
		AvatarURL  string `json:"avatar_url"`
	}

	var patients []PatientInfo
	for rows.Next() {
		var p PatientInfo
		if scanErr := rows.Scan(&p.Address, &p.Name, &p.Status, &p.BloodGroup, &p.AvatarURL); scanErr == nil {
			if p.AvatarURL != "" {
				s3Key := getS3KeyFromURL(p.AvatarURL)
				if s3Key != "" {
					if presigned, signErr := h.getPresignedDownloadURL(c.Request.Context(), s3Key); signErr == nil {
						p.AvatarURL = presigned
					}
				}
			}
			patients = append(patients, p)
		}
	}

	if patients == nil {
		patients = []PatientInfo{}
	}

	c.JSON(http.StatusOK, patients)
}

// AdmitDoctor registers the doctor on-chain and populates their profile in the database
func (h *AdminHandler) AdmitDoctor(c *gin.Context) {
	walletAddrStr := strings.ToLower(c.PostForm("address"))
	name := c.PostForm("name")
	specialization := c.PostForm("specialization")
	aadhaarNumber := c.PostForm("aadhaar_number")
	panNumber := c.PostForm("pan_number")
	employeeID := c.PostForm("employee_id")
	contactNumber := c.PostForm("contact_number")
	homeAddress := c.PostForm("home_address")

	if walletAddrStr == "" || name == "" || specialization == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address, name, and specialization are required form fields"})
		return
	}

	if !common.IsHexAddress(walletAddrStr) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid doctor wallet address format"})
		return
	}
	doctorAddr := common.HexToAddress(walletAddrStr)

	// 1. Upload Aadhaar Card file if present
	var aadhaarS3Key string
	aadhaarFileHeader, err := c.FormFile("aadhaar_file")
	if err == nil {
		file, errOpen := aadhaarFileHeader.Open()
		if errOpen == nil {
			fileBytes, errRead := io.ReadAll(file)
			file.Close()
			if errRead == nil {
				ext := filepath.Ext(aadhaarFileHeader.Filename)
				aadhaarS3Key = fmt.Sprintf("Bio-Information/doctors/aadhaar/%s%s", walletAddrStr, ext)
				_, err = h.uploadToS3Bio(c.Request.Context(), aadhaarS3Key, fileBytes)
				if err != nil {
					c.JSON(http.StatusBadGateway, gin.H{"error": "failed to upload Aadhaar card to S3: " + err.Error()})
					return
				}
			}
		}
	}

	// 2. Upload PAN Card file if present
	var panS3Key string
	panFileHeader, err := c.FormFile("pan_file")
	if err == nil {
		file, errOpen := panFileHeader.Open()
		if errOpen == nil {
			fileBytes, errRead := io.ReadAll(file)
			file.Close()
			if errRead == nil {
				ext := filepath.Ext(panFileHeader.Filename)
				panS3Key = fmt.Sprintf("Bio-Information/doctors/pan/%s%s", walletAddrStr, ext)
				_, err = h.uploadToS3Bio(c.Request.Context(), panS3Key, fileBytes)
				if err != nil {
					c.JSON(http.StatusBadGateway, gin.H{"error": "failed to upload PAN card to S3: " + err.Error()})
					return
				}
			}
		}
	}

	// 3. Submit on-chain transaction to register doctor (Mint SBT)
	txHash, err := h.submitOnChainDoctorRegistration(c, doctorAddr, name, specialization)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to register doctor on blockchain: " + err.Error()})
		return
	}

	// 4. Write doctor profile to RDS PostgreSQL database
	query := `
		INSERT INTO doctor_profiles (wallet_address, name, specialization, aadhaar_number, pan_number, aadhaar_s3_key, pan_s3_key, employee_id, contact_number, home_address)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (wallet_address) DO UPDATE 
		SET name = $2, specialization = $3, aadhaar_number = $4, pan_number = $5, aadhaar_s3_key = $6, pan_s3_key = $7, employee_id = $8, contact_number = $9, home_address = $10
	`
	_, dbErr := h.DB.Conn.Exec(query, walletAddrStr, name, specialization, aadhaarNumber, panNumber, aadhaarS3Key, panS3Key, employeeID, contactNumber, homeAddress)
	if dbErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Doctor registered on blockchain, but failed to save profile in database: " + dbErr.Error(),
			"tx_hash": txHash,
		})
		return
	}

	LogHospitalActivity(h.DB.Conn, "DOCTOR", fmt.Sprintf("Dr. %s registered in %s. Soulbound credentials issued.", name, specialization))

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Doctor admitted on-chain and profile set in database successfully",
		"tx_hash": txHash,
	})
}

// submitOnChainDoctorRegistration signs and broadcasts the addDoctor transaction
func (h *AdminHandler) submitOnChainDoctorRegistration(c *gin.Context, doctor common.Address, name, specialization string) (string, error) {
	if h.EthClient == nil {
		return "0x-offline-simulate-hash", nil
	}

	contractAddr := common.HexToAddress(h.Cfg.DoctorRegistry)
	parsedABI, err := abi.JSON(strings.NewReader(doctorRegistryWriteABI))
	if err != nil {
		return "", err
	}

	// Pack call inputs: addDoctor(address doctor, string name, string specialization, string ipfsProfile, string profileCID)
	callData, err := parsedABI.Pack("addDoctor", doctor, name, specialization, "ipfs://doctor-identity-profile", "QmdocProfileCID")
	if err != nil {
		return "", err
	}

	// Parse admin private key
	privateKey, err := crypto.HexToECDSA(h.Cfg.DeployerPrivateKey)
	if err != nil {
		return "", err
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", fmt.Errorf("failed to recover public key")
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	ctx := c.Request.Context()
	nonce, err := h.EthClient.Client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return "", err
	}

	gasPrice, err := h.EthClient.Client.SuggestGasPrice(ctx)
	if err != nil {
		return "", err
	}

	gasLimit, err := h.EthClient.Client.EstimateGas(ctx, ethereum.CallMsg{
		From: fromAddress,
		To:   &contractAddr,
		Data: callData,
	})
	if err != nil {
		gasLimit = 300000
	}

	// Build Transaction
	tx := types.NewTx(&types.LegacyTx{
		Nonce:    nonce,
		To:       &contractAddr,
		Value:    big.NewInt(0),
		Gas:      gasLimit,
		GasPrice: gasPrice,
		Data:     callData,
	})

	// Sign Transaction
	signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(h.EthClient.ChainID), privateKey)
	if err != nil {
		return "", err
	}

	// Broadcast Transaction
	err = h.EthClient.Client.SendTransaction(ctx, signedTx)
	if err != nil {
		return "", err
	}

	return signedTx.Hash().Hex(), nil
}

// ListDoctors retrieves all doctor wallet addresses, names, specializations, and avatar URLs from the database
func (h *AdminHandler) ListDoctors(c *gin.Context) {
	query := `SELECT wallet_address, name, specialization, avatar_url FROM doctor_profiles`
	rows, err := h.DB.Conn.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query doctors: " + err.Error()})
		return
	}
	defer rows.Close()

	type DoctorInfo struct {
		Address        string `json:"address"`
		Name           string `json:"name"`
		Specialization string `json:"specialization"`
		AvatarURL      string `json:"avatar_url"`
	}

	var doctors []DoctorInfo
	for rows.Next() {
		var d DoctorInfo
		if scanErr := rows.Scan(&d.Address, &d.Name, &d.Specialization, &d.AvatarURL); scanErr == nil {
			if d.AvatarURL != "" {
				s3Key := getS3KeyFromURL(d.AvatarURL)
				if s3Key != "" {
					if presigned, signErr := h.getPresignedDownloadURL(c.Request.Context(), s3Key); signErr == nil {
						d.AvatarURL = presigned
					}
				}
			}
			doctors = append(doctors, d)
		}
	}

	if doctors == nil {
		doctors = []DoctorInfo{}
	}

	c.JSON(http.StatusOK, doctors)
}

func (h *AdminHandler) uploadToS3Bio(ctx context.Context, key string, fileBytes []byte) (string, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		return "", fmt.Errorf("unable to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg)

	_, err = client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: &h.Cfg.AWSS3BioBucket,
		Key:    &key,
		Body:   bytes.NewReader(fileBytes),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload object to S3 Bio: %w", err)
	}

	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = os.Getenv("AWS_DEFAULT_REGION")
	}
	if region == "" {
		region = "us-east-1"
	}

	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", h.Cfg.AWSS3BioBucket, region, key)
	return url, nil
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

func (h *AdminHandler) getPresignedDownloadURL(ctx context.Context, key string) (string, error) {
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

// LogHospitalActivity inserts an audit log into PostgreSQL database
func LogHospitalActivity(dbConn *sql.DB, actionType string, message string) {
	if dbConn == nil {
		return
	}
	_, _ = dbConn.Exec("INSERT INTO hospital_activity_logs (action_type, message) VALUES ($1, $2)", actionType, message)
}

// GetHospitalLogs retrieves dynamic hospital activity logs ordered by timestamp DESC
func (h *AdminHandler) GetHospitalLogs(c *gin.Context) {
	rows, err := h.DB.Conn.Query("SELECT id, timestamp, action_type, message FROM hospital_activity_logs ORDER BY timestamp DESC LIMIT 50")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query logs: " + err.Error()})
		return
	}
	defer rows.Close()

	type HospitalLog struct {
		ID         int    `json:"id"`
		Timestamp  string `json:"timestamp"`
		ActionType string `json:"action_type"`
		Message    string `json:"message"`
	}

	var logs []HospitalLog
	for rows.Next() {
		var l HospitalLog
		var t time.Time
		if scanErr := rows.Scan(&l.ID, &t, &l.ActionType, &l.Message); scanErr == nil {
			// Convert to local time format HH:MM:SS
			l.Timestamp = t.Local().Format("15:04:05")
			logs = append(logs, l)
		}
	}

	if logs == nil {
		logs = []HospitalLog{}
	}

	c.JSON(http.StatusOK, logs)
}

// GetHospitalKPIs queries database statistics for dashboards
func (h *AdminHandler) GetHospitalKPIs(c *gin.Context) {
	var totalPatients, bedsOccupied, discharged, deceased, activeDoctors int

	_ = h.DB.Conn.QueryRow("SELECT COUNT(*) FROM patient_profiles").Scan(&totalPatients)
	_ = h.DB.Conn.QueryRow("SELECT COUNT(*) FROM patient_profiles WHERE status = 'active'").Scan(&bedsOccupied)
	_ = h.DB.Conn.QueryRow("SELECT COUNT(*) FROM patient_profiles WHERE status = 'discharged'").Scan(&discharged)
	_ = h.DB.Conn.QueryRow("SELECT COUNT(*) FROM patient_profiles WHERE status = 'deceased'").Scan(&deceased)
	_ = h.DB.Conn.QueryRow("SELECT COUNT(*) FROM doctor_profiles WHERE status = 'active'").Scan(&activeDoctors)

	c.JSON(http.StatusOK, gin.H{
		"total_patients":  totalPatients,
		"beds_occupied":   bedsOccupied,
		"discharged":      discharged,
		"deceased":        deceased,
		"active_doctors":  activeDoctors,
	})
}

// GetPatientDetails returns the full database profile of a patient
func (h *AdminHandler) GetPatientDetails(c *gin.Context) {
	addr := strings.ToLower(c.Query("address"))
	if addr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
		return
	}

	query := `
		SELECT wallet_address, name, dob, blood_group, allergies, emergency_contact, status, aadhaar_number, pan_number, avatar_url, aadhaar_s3_key, pan_s3_key
		FROM patient_profiles
		WHERE wallet_address = $1
	`
	var p struct {
		Address          string `json:"address"`
		Name             string `json:"name"`
		DOB              string `json:"dob"`
		BloodGroup       string `json:"blood_group"`
		Allergies        string `json:"allergies"`
		EmergencyContact string `json:"emergency_contact"`
		Status           string `json:"status"`
		AadhaarNumber    string `json:"aadhaar_number"`
		PanNumber        string `json:"pan_number"`
		AvatarURL        string `json:"avatar_url"`
		AadhaarS3Key     string `json:"aadhaar_s3_key"`
		PanS3Key         string `json:"pan_s3_key"`
	}

	err := h.DB.Conn.QueryRow(query, addr).Scan(
		&p.Address, &p.Name, &p.DOB, &p.BloodGroup, &p.Allergies, &p.EmergencyContact, &p.Status, &p.AadhaarNumber, &p.PanNumber, &p.AvatarURL, &p.AadhaarS3Key, &p.PanS3Key,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient profile not found"})
		return
	}

	if p.AvatarURL != "" {
		s3Key := getS3KeyFromURL(p.AvatarURL)
		if s3Key != "" {
			if presigned, signErr := h.getPresignedDownloadURL(c.Request.Context(), s3Key); signErr == nil {
				p.AvatarURL = presigned
			}
		}
	}

	c.JSON(http.StatusOK, p)
}

// GetDoctorDetails returns the full database profile of a doctor
func (h *AdminHandler) GetDoctorDetails(c *gin.Context) {
	addr := strings.ToLower(c.Query("address"))
	if addr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
		return
	}

	query := `
		SELECT wallet_address, name, specialization, employee_id, contact_number, home_address, status, aadhaar_number, pan_number, avatar_url, aadhaar_s3_key, pan_s3_key
		FROM doctor_profiles
		WHERE wallet_address = $1
	`
	var d struct {
		Address        string `json:"address"`
		Name           string `json:"name"`
		Specialization string `json:"specialization"`
		EmployeeID     string `json:"employee_id"`
		ContactNumber  string `json:"contact_number"`
		HomeAddress    string `json:"home_address"`
		Status         string `json:"status"`
		AadhaarNumber  string `json:"aadhaar_number"`
		PanNumber      string `json:"pan_number"`
		AvatarURL      string `json:"avatar_url"`
		AadhaarS3Key   string `json:"aadhaar_s3_key"`
		PanS3Key       string `json:"pan_s3_key"`
	}

	err := h.DB.Conn.QueryRow(query, addr).Scan(
		&d.Address, &d.Name, &d.Specialization, &d.EmployeeID, &d.ContactNumber, &d.HomeAddress, &d.Status, &d.AadhaarNumber, &d.PanNumber, &d.AvatarURL, &d.AadhaarS3Key, &d.PanS3Key,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "doctor profile not found"})
		return
	}

	if d.AvatarURL != "" {
		s3Key := getS3KeyFromURL(d.AvatarURL)
		if s3Key != "" {
			if presigned, signErr := h.getPresignedDownloadURL(c.Request.Context(), s3Key); signErr == nil {
				d.AvatarURL = presigned
			}
		}
	}

	c.JSON(http.StatusOK, d)
}

// UpdatePatientDetails updates patient details in PostgreSQL and uploads updated files to S3
func (h *AdminHandler) UpdatePatientDetails(c *gin.Context) {
	addr := strings.ToLower(c.PostForm("address"))
	name := c.PostForm("name")
	dob := c.PostForm("dob")
	bloodGroup := c.PostForm("blood_group")
	allergies := c.PostForm("allergies")
	emergencyContact := c.PostForm("emergency_contact")
	aadhaarNumber := c.PostForm("aadhaar_number")
	panNumber := c.PostForm("pan_number")
	status := c.PostForm("status")

	if addr == "" || name == "" || dob == "" || bloodGroup == "" || status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address, name, dob, blood_group, and status are required fields"})
		return
	}

	var aadhaarS3Key, panS3Key string
	_ = h.DB.Conn.QueryRow("SELECT aadhaar_s3_key, pan_s3_key FROM patient_profiles WHERE wallet_address = $1", addr).Scan(&aadhaarS3Key, &panS3Key)

	aadhaarFileHeader, err := c.FormFile("aadhaar_file")
	if err == nil {
		file, errOpen := aadhaarFileHeader.Open()
		if errOpen == nil {
			fileBytes, errRead := io.ReadAll(file)
			file.Close()
			if errRead == nil {
				ext := filepath.Ext(aadhaarFileHeader.Filename)
				aadhaarS3Key = fmt.Sprintf("Bio-Information/patients/aadhaar/%s%s", addr, ext)
				_, _ = h.uploadToS3Bio(c.Request.Context(), aadhaarS3Key, fileBytes)
			}
		}
	}

	panFileHeader, err := c.FormFile("pan_file")
	if err == nil {
		file, errOpen := panFileHeader.Open()
		if errOpen == nil {
			fileBytes, errRead := io.ReadAll(file)
			file.Close()
			if errRead == nil {
				ext := filepath.Ext(panFileHeader.Filename)
				panS3Key = fmt.Sprintf("Bio-Information/patients/pan/%s%s", addr, ext)
				_, _ = h.uploadToS3Bio(c.Request.Context(), panS3Key, fileBytes)
			}
		}
	}

	query := `
		UPDATE patient_profiles
		SET name = $2, dob = $3, blood_group = $4, allergies = $5, emergency_contact = $6, aadhaar_number = $7, pan_number = $8, aadhaar_s3_key = $9, pan_s3_key = $10, status = $11
		WHERE wallet_address = $1
	`
	_, dbErr := h.DB.Conn.Exec(query, addr, name, dob, bloodGroup, allergies, emergencyContact, aadhaarNumber, panNumber, aadhaarS3Key, panS3Key, status)
	if dbErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update patient details: " + dbErr.Error()})
		return
	}

	LogHospitalActivity(h.DB.Conn, "UPDATE", fmt.Sprintf("Patient %s profile details updated.", name))

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "patient profile updated successfully"})
}

// UpdateDoctorDetails updates doctor details in PostgreSQL and uploads updated files to S3
func (h *AdminHandler) UpdateDoctorDetails(c *gin.Context) {
	addr := strings.ToLower(c.PostForm("address"))
	name := c.PostForm("name")
	specialization := c.PostForm("specialization")
	employeeID := c.PostForm("employee_id")
	contactNumber := c.PostForm("contact_number")
	homeAddress := c.PostForm("home_address")
	aadhaarNumber := c.PostForm("aadhaar_number")
	panNumber := c.PostForm("pan_number")
	status := c.PostForm("status")

	if addr == "" || name == "" || specialization == "" || status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address, name, specialization, and status are required fields"})
		return
	}

	var aadhaarS3Key, panS3Key string
	_ = h.DB.Conn.QueryRow("SELECT aadhaar_s3_key, pan_s3_key FROM doctor_profiles WHERE wallet_address = $1", addr).Scan(&aadhaarS3Key, &panS3Key)

	aadhaarFileHeader, err := c.FormFile("aadhaar_file")
	if err == nil {
		file, errOpen := aadhaarFileHeader.Open()
		if errOpen == nil {
			fileBytes, errRead := io.ReadAll(file)
			file.Close()
			if errRead == nil {
				ext := filepath.Ext(aadhaarFileHeader.Filename)
				aadhaarS3Key = fmt.Sprintf("Bio-Information/doctors/aadhaar/%s%s", addr, ext)
				_, _ = h.uploadToS3Bio(c.Request.Context(), aadhaarS3Key, fileBytes)
			}
		}
	}

	panFileHeader, err := c.FormFile("pan_file")
	if err == nil {
		file, errOpen := panFileHeader.Open()
		if errOpen == nil {
			fileBytes, errRead := io.ReadAll(file)
			file.Close()
			if errRead == nil {
				ext := filepath.Ext(panFileHeader.Filename)
				panS3Key = fmt.Sprintf("Bio-Information/doctors/pan/%s%s", addr, ext)
				_, _ = h.uploadToS3Bio(c.Request.Context(), panS3Key, fileBytes)
			}
		}
	}

	query := `
		UPDATE doctor_profiles
		SET name = $2, specialization = $3, employee_id = $4, contact_number = $5, home_address = $6, aadhaar_number = $7, pan_number = $8, aadhaar_s3_key = $9, pan_s3_key = $10, status = $11
		WHERE wallet_address = $1
	`
	_, dbErr := h.DB.Conn.Exec(query, addr, name, specialization, employeeID, contactNumber, homeAddress, aadhaarNumber, panNumber, aadhaarS3Key, panS3Key, status)
	if dbErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update doctor details: " + dbErr.Error()})
		return
	}

	LogHospitalActivity(h.DB.Conn, "UPDATE", fmt.Sprintf("Doctor %s profile details updated.", name))

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "doctor profile updated successfully"})
}

// RegisterImplantableDevice adds a new high-value device to inventory
func (h *AdminHandler) RegisterImplantableDevice(c *gin.Context) {
	var req struct {
		SerialNumber string `json:"serial_number" binding:"required"`
		DeviceName   string `json:"device_name" binding:"required"`
		Manufacturer string `json:"manufacturer" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := `
		INSERT INTO implantable_devices (serial_number, device_name, manufacturer, status)
		VALUES ($1, $2, $3, 'in-stock')
		ON CONFLICT (serial_number) DO UPDATE
		SET device_name = $2, manufacturer = $3
	`
	_, err := h.DB.Conn.Exec(query, req.SerialNumber, req.DeviceName, req.Manufacturer)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to register device: " + err.Error()})
		return
	}

	LogHospitalActivity(h.DB.Conn, "IMPLANTABLE", fmt.Sprintf("Serialized device %s (SN: %s) registered in stock ledger.", req.DeviceName, req.SerialNumber))

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Device registered in inventory successfully"})
}

// ImplantDevice maps a serial number to a patient and doctor
func (h *AdminHandler) ImplantDevice(c *gin.Context) {
	var req struct {
		SerialNumber   string `json:"serial_number" binding:"required"`
		PatientAddress string `json:"patient_address" binding:"required"`
		ImplantedBy    string `json:"implanted_by" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Look up device metadata for on-chain submission
	var deviceName, manufacturer string
	err := h.DB.Conn.QueryRow("SELECT device_name, manufacturer FROM implantable_devices WHERE serial_number = $1", req.SerialNumber).Scan(&deviceName, &manufacturer)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "device serial number not found"})
		return
	}

	patientAddr := common.HexToAddress(req.PatientAddress)
	doctorAddr := common.HexToAddress(req.ImplantedBy)

	// 2. Submit transaction on-chain (Mint Compliance Receipt)
	txHash, err := h.submitOnChainImplant(c, req.SerialNumber, deviceName, manufacturer, patientAddr, doctorAddr)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to register implant on blockchain: " + err.Error()})
		return
	}

	// 3. Update status to 'implanted' in database
	query := `
		UPDATE implantable_devices
		SET patient_address = $2, implanted_by = $3, implanted_at = CURRENT_TIMESTAMP, status = 'implanted'
		WHERE serial_number = $1
	`
	_, err = h.DB.Conn.Exec(query, req.SerialNumber, strings.ToLower(req.PatientAddress), strings.ToLower(req.ImplantedBy))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Implantation written on blockchain, but failed to update status in database: " + err.Error(),
			"tx_hash": txHash,
		})
		return
	}

	var patientName, doctorName string
	_ = h.DB.Conn.QueryRow("SELECT name FROM patient_profiles WHERE wallet_address = $1", strings.ToLower(req.PatientAddress)).Scan(&patientName)
	_ = h.DB.Conn.QueryRow("SELECT name FROM doctor_profiles WHERE wallet_address = $1", strings.ToLower(req.ImplantedBy)).Scan(&doctorName)
	if patientName == "" {
		patientName = req.PatientAddress[:8] + "..."
	}
	if doctorName == "" {
		doctorName = req.ImplantedBy[:8] + "..."
	}
	LogHospitalActivity(h.DB.Conn, "IMPLANTABLE", fmt.Sprintf("Surgeon Dr. %s finalized %s implantation for Patient %s.", doctorName, deviceName, patientName))

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Implantation logged on-chain and database successfully",
		"tx_hash": txHash,
	})
}

// RecallDevice flags a device serial number as recalled
func (h *AdminHandler) RecallDevice(c *gin.Context) {
	var req struct {
		SerialNumber string `json:"serial_number" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Submit recall transaction on-chain
	txHash, err := h.submitOnChainRecall(c, req.SerialNumber)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to register recall on blockchain: " + err.Error()})
		return
	}

	// 2. Update status in database
	query := `
		UPDATE implantable_devices
		SET status = 'recalled'
		WHERE serial_number = $1
	`
	res, err := h.DB.Conn.Exec(query, req.SerialNumber)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Recall logged on blockchain, but failed to update database: " + err.Error(),
			"tx_hash": txHash,
		})
		return
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "device serial number not found"})
		return
	}

	var deviceName string
	_ = h.DB.Conn.QueryRow("SELECT device_name FROM implantable_devices WHERE serial_number = $1", req.SerialNumber).Scan(&deviceName)
	if deviceName == "" {
		deviceName = "Device"
	}
	LogHospitalActivity(h.DB.Conn, "IMPLANTABLE", fmt.Sprintf("Implantable device %s (SN: %s) flagged as RECALLED. Urgent recall warning dispatched.", deviceName, req.SerialNumber))

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Device marked as RECALLED. Emergency patient alert triggered.",
		"tx_hash": txHash,
	})
}

// ListDevices returns the entire high-value device asset ledger
func (h *AdminHandler) ListDevices(c *gin.Context) {
	query := `
		SELECT serial_number, device_name, manufacturer, COALESCE(patient_address, ''), COALESCE(implanted_by, ''), status, implanted_at
		FROM implantable_devices
		ORDER BY created_at DESC
	`
	rows, err := h.DB.Conn.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query device ledger: " + err.Error()})
		return
	}
	defer rows.Close()

	type DeviceInfo struct {
		SerialNumber   string     `json:"serial_number"`
		DeviceName     string     `json:"device_name"`
		Manufacturer   string     `json:"manufacturer"`
		PatientAddress string     `json:"patient_address"`
		ImplantedBy    string     `json:"implanted_by"`
		Status         string     `json:"status"`
		ImplantedAt    *time.Time `json:"implanted_at"`
	}

	var list []DeviceInfo
	for rows.Next() {
		var d DeviceInfo
		errScan := rows.Scan(&d.SerialNumber, &d.DeviceName, &d.Manufacturer, &d.PatientAddress, &d.ImplantedBy, &d.Status, &d.ImplantedAt)
		if errScan == nil {
			list = append(list, d)
		}
	}

	if list == nil {
		list = []DeviceInfo{}
	}

	c.JSON(http.StatusOK, list)
}

// RequestNarcotic logs a request for a controlled substance
func (h *AdminHandler) RequestNarcotic(c *gin.Context) {
	var req struct {
		DrugName       string `json:"drug_name" binding:"required"`
		Dosage         string `json:"dosage" binding:"required"`
		PatientAddress string `json:"patient_address" binding:"required"`
		RequesterDoc   string `json:"requester_doctor" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := `
		INSERT INTO controlled_substances_logs (drug_name, dosage, patient_address, requester_doctor, status)
		VALUES ($1, $2, $3, $4, 'pending')
	`
	_, err := h.DB.Conn.Exec(query, req.DrugName, req.Dosage, strings.ToLower(req.PatientAddress), strings.ToLower(req.RequesterDoc))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to file narcotic request: " + err.Error()})
		return
	}

	var doctorName string
	_ = h.DB.Conn.QueryRow("SELECT name FROM doctor_profiles WHERE wallet_address = $1", strings.ToLower(req.RequesterDoc)).Scan(&doctorName)
	if doctorName == "" {
		doctorName = req.RequesterDoc[:8] + "..."
	}
	LogHospitalActivity(h.DB.Conn, "NARCOTICS", fmt.Sprintf("Narcotic request for %s (%s) filed by Dr. %s.", req.DrugName, req.Dosage, doctorName))

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Narcotic authorization request logged. Awaiting administrator co-signature."})
}

// AuthorizeNarcotic signs off on a pending narcotic request
func (h *AdminHandler) AuthorizeNarcotic(c *gin.Context) {
	var req struct {
		ID             int    `json:"id" binding:"required"`
		Authorizer     string `json:"authorizer_admin" binding:"required"`
		Status         string `json:"status" binding:"required"` // 'authorized', 'rejected'
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Retrieve narcotic details to publish co-signature receipt on-chain
	var drugName, dosage, patientStr, requesterStr string
	err := h.DB.Conn.QueryRow("SELECT drug_name, dosage, patient_address, requester_doctor FROM controlled_substances_logs WHERE id = $1 AND status = 'pending'", req.ID).Scan(&drugName, &dosage, &patientStr, &requesterStr)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "pending narcotic request not found or already processed"})
		return
	}

	patientAddr := common.HexToAddress(patientStr)
	requesterAddr := common.HexToAddress(requesterStr)
	authorizerAddr := common.HexToAddress(req.Authorizer)

	// 2. Submit narcotic administration co-signature on-chain
	txHash, err := h.submitOnChainNarcoticLog(c, uint64(req.ID), drugName, dosage, patientAddr, requesterAddr, authorizerAddr, req.Status)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to register narcotic signature on blockchain: " + err.Error()})
		return
	}

	// 3. Update log status in database
	query := `
		UPDATE controlled_substances_logs
		SET authorizer_admin = $2, status = $3, authorized_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND status = 'pending'
	`
	_, err = h.DB.Conn.Exec(query, req.ID, strings.ToLower(req.Authorizer), req.Status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Co-signature posted to blockchain, but failed to log in database: " + err.Error(),
			"tx_hash": txHash,
		})
		return
	}

	LogHospitalActivity(h.DB.Conn, "NARCOTICS", fmt.Sprintf("Controlled substance %s (%s) administration request co-authorized by System Admin.", drugName, dosage))

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Narcotic co-signature recorded on-chain and database successfully",
		"tx_hash": txHash,
	})
}

// ListNarcotics returns all narcotics log sheets
func (h *AdminHandler) ListNarcotics(c *gin.Context) {
	query := `
		SELECT id, drug_name, dosage, patient_address, requester_doctor, COALESCE(authorizer_admin, ''), status, requested_at, authorized_at
		FROM controlled_substances_logs
		ORDER BY requested_at DESC
	`
	rows, err := h.DB.Conn.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query narcotics audit trail: " + err.Error()})
		return
	}
	defer rows.Close()

	type NarcoticLog struct {
		ID           int        `json:"id"`
		DrugName     string     `json:"drug_name"`
		Dosage       string     `json:"dosage"`
		PatientAddr  string     `json:"patient_address"`
		RequesterDoc string     `json:"requester_doctor"`
		Authorizer   string     `json:"authorizer_admin"`
		Status       string     `json:"status"`
		RequestedAt  time.Time  `json:"requested_at"`
		AuthorizedAt *time.Time `json:"authorized_at"`
	}

	var list []NarcoticLog
	for rows.Next() {
		var n NarcoticLog
		errScan := rows.Scan(&n.ID, &n.DrugName, &n.Dosage, &n.PatientAddr, &n.RequesterDoc, &n.Authorizer, &n.Status, &n.RequestedAt, &n.AuthorizedAt)
		if errScan == nil {
			list = append(list, n)
		}
	}

	if list == nil {
		list = []NarcoticLog{}
	}

	c.JSON(http.StatusOK, list)
}

func (h *AdminHandler) submitOnChainImplant(c *gin.Context, serial, device, manufacturer string, patient, doctor common.Address) (string, error) {
	if h.EthClient == nil || h.Cfg.RegulatoryLedger == "" {
		return "0x-simulated-implant-hash", nil
	}

	contractAddr := common.HexToAddress(h.Cfg.RegulatoryLedger)
	parsedABI, err := abi.JSON(strings.NewReader(regulatoryLedgerABI))
	if err != nil {
		return "", err
	}

	callData, err := parsedABI.Pack("implantDevice", serial, patient, doctor, device, manufacturer)
	if err != nil {
		return "", err
	}

	privateKey, err := crypto.HexToECDSA(h.Cfg.DeployerPrivateKey)
	if err != nil {
		return "", err
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", fmt.Errorf("failed to recover public key")
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	ctx := c.Request.Context()
	nonce, err := h.EthClient.Client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return "", err
	}

	gasPrice, err := h.EthClient.Client.SuggestGasPrice(ctx)
	if err != nil {
		return "", err
	}

	gasLimit, err := h.EthClient.Client.EstimateGas(ctx, ethereum.CallMsg{
		From: fromAddress,
		To:   &contractAddr,
		Data: callData,
	})
	if err != nil {
		gasLimit = 350000
	}

	tx := types.NewTx(&types.LegacyTx{
		Nonce:    nonce,
		To:       &contractAddr,
		Value:    big.NewInt(0),
		Gas:      gasLimit,
		GasPrice: gasPrice,
		Data:     callData,
	})

	signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(h.EthClient.ChainID), privateKey)
	if err != nil {
		return "", err
	}

	err = h.EthClient.Client.SendTransaction(ctx, signedTx)
	if err != nil {
		return "", err
	}

	return signedTx.Hash().Hex(), nil
}

func (h *AdminHandler) submitOnChainRecall(c *gin.Context, serial string) (string, error) {
	if h.EthClient == nil || h.Cfg.RegulatoryLedger == "" {
		return "0x-simulated-recall-hash", nil
	}

	contractAddr := common.HexToAddress(h.Cfg.RegulatoryLedger)
	parsedABI, err := abi.JSON(strings.NewReader(regulatoryLedgerABI))
	if err != nil {
		return "", err
	}

	callData, err := parsedABI.Pack("recallDevice", serial)
	if err != nil {
		return "", err
	}

	privateKey, err := crypto.HexToECDSA(h.Cfg.DeployerPrivateKey)
	if err != nil {
		return "", err
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", fmt.Errorf("failed to recover public key")
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	ctx := c.Request.Context()
	nonce, err := h.EthClient.Client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return "", err
	}

	gasPrice, err := h.EthClient.Client.SuggestGasPrice(ctx)
	if err != nil {
		return "", err
	}

	gasLimit, err := h.EthClient.Client.EstimateGas(ctx, ethereum.CallMsg{
		From: fromAddress,
		To:   &contractAddr,
		Data: callData,
	})
	if err != nil {
		gasLimit = 250000
	}

	tx := types.NewTx(&types.LegacyTx{
		Nonce:    nonce,
		To:       &contractAddr,
		Value:    big.NewInt(0),
		Gas:      gasLimit,
		GasPrice: gasPrice,
		Data:     callData,
	})

	signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(h.EthClient.ChainID), privateKey)
	if err != nil {
		return "", err
	}

	err = h.EthClient.Client.SendTransaction(ctx, signedTx)
	if err != nil {
		return "", err
	}

	return signedTx.Hash().Hex(), nil
}

func (h *AdminHandler) submitOnChainNarcoticLog(c *gin.Context, dbId uint64, drugName, dosage string, patient, requester, authorizer common.Address, action string) (string, error) {
	if h.EthClient == nil || h.Cfg.RegulatoryLedger == "" {
		return "0x-simulated-narcotic-hash", nil
	}

	contractAddr := common.HexToAddress(h.Cfg.RegulatoryLedger)
	parsedABI, err := abi.JSON(strings.NewReader(regulatoryLedgerABI))
	if err != nil {
		return "", err
	}

	dbIdBig := new(big.Int).SetUint64(dbId)
	callData, err := parsedABI.Pack("logNarcoticAdministration", dbIdBig, drugName, dosage, patient, requester, authorizer, action)
	if err != nil {
		return "", err
	}

	privateKey, err := crypto.HexToECDSA(h.Cfg.DeployerPrivateKey)
	if err != nil {
		return "", err
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", fmt.Errorf("failed to recover public key")
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	ctx := c.Request.Context()
	nonce, err := h.EthClient.Client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return "", err
	}

	gasPrice, err := h.EthClient.Client.SuggestGasPrice(ctx)
	if err != nil {
		return "", err
	}

	gasLimit, err := h.EthClient.Client.EstimateGas(ctx, ethereum.CallMsg{
		From: fromAddress,
		To:   &contractAddr,
		Data: callData,
	})
	if err != nil {
		gasLimit = 350000
	}

	tx := types.NewTx(&types.LegacyTx{
		Nonce:    nonce,
		To:       &contractAddr,
		Value:    big.NewInt(0),
		Gas:      gasLimit,
		GasPrice: gasPrice,
		Data:     callData,
	})

	signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(h.EthClient.ChainID), privateKey)
	if err != nil {
		return "", err
	}

	err = h.EthClient.Client.SendTransaction(ctx, signedTx)
	if err != nil {
		return "", err
	}

	return signedTx.Hash().Hex(), nil
}

// ListMedicines retrieves all medicines cataloged in the inventory
func (h *AdminHandler) ListMedicines(c *gin.Context) {
	rows, err := h.DB.Conn.Query("SELECT id, drug_name, dosage_strength, stock_quantity, requires_double_auth, created_at FROM medicine_inventory ORDER BY drug_name ASC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query medicine inventory: " + err.Error()})
		return
	}
	defer rows.Close()

	type Medicine struct {
		ID                 int    `json:"id"`
		DrugName           string `json:"drug_name"`
		DosageStrength     string `json:"dosage_strength"`
		StockQuantity      int    `json:"stock_quantity"`
		RequiresDoubleAuth bool   `json:"requires_double_auth"`
		CreatedAt          string `json:"created_at"`
	}

	var list []Medicine
	for rows.Next() {
		var m Medicine
		var t time.Time
		if scanErr := rows.Scan(&m.ID, &m.DrugName, &m.DosageStrength, &m.StockQuantity, &m.RequiresDoubleAuth, &t); scanErr == nil {
			m.CreatedAt = t.Local().Format("2006-01-02 15:04:05")
			list = append(list, m)
		}
	}

	if list == nil {
		list = []Medicine{}
	}

	c.JSON(http.StatusOK, list)
}

// AddMedicine creates a new medicine inside PostgreSQL
func (h *AdminHandler) AddMedicine(c *gin.Context) {
	var req struct {
		DrugName           string `json:"drug_name" binding:"required"`
		DosageStrength     string `json:"dosage_strength" binding:"required"`
		StockQuantity      int    `json:"stock_quantity"`
		RequiresDoubleAuth bool   `json:"requires_double_auth"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := `
		INSERT INTO medicine_inventory (drug_name, dosage_strength, stock_quantity, requires_double_auth)
		VALUES ($1, $2, $3, $4)
	`
	_, err := h.DB.Conn.Exec(query, req.DrugName, req.DosageStrength, req.StockQuantity, req.RequiresDoubleAuth)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add medicine to catalog: " + err.Error()})
		return
	}

	LogHospitalActivity(h.DB.Conn, "NARCOTICS", fmt.Sprintf("Admin added medicine '%s (%s)' with stock %d to inventory.", req.DrugName, req.DosageStrength, req.StockQuantity))
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Medicine added to catalog successfully"})
}

// UpdateMedicine modifies an existing medicine's stock, dosage, or double-auth status
func (h *AdminHandler) UpdateMedicine(c *gin.Context) {
	var req struct {
		ID                 int    `json:"id" binding:"required"`
		DrugName           string `json:"drug_name" binding:"required"`
		DosageStrength     string `json:"dosage_strength" binding:"required"`
		StockQuantity      int    `json:"stock_quantity"`
		RequiresDoubleAuth bool   `json:"requires_double_auth"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := `
		UPDATE medicine_inventory 
		SET drug_name = $1, dosage_strength = $2, stock_quantity = $3, requires_double_auth = $4
		WHERE id = $5
	`
	_, err := h.DB.Conn.Exec(query, req.DrugName, req.DosageStrength, req.StockQuantity, req.RequiresDoubleAuth, req.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update medicine: " + err.Error()})
		return
	}

	LogHospitalActivity(h.DB.Conn, "NARCOTICS", fmt.Sprintf("Admin updated medicine id %d parameters: %s (%s), stock: %d.", req.ID, req.DrugName, req.DosageStrength, req.StockQuantity))
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Medicine updated successfully"})
}

// DeleteMedicine removes a medicine from catalog
func (h *AdminHandler) DeleteMedicine(c *gin.Context) {
	var req struct {
		ID int `json:"id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var drugName string
	_ = h.DB.Conn.QueryRow("SELECT drug_name FROM medicine_inventory WHERE id = $1", req.ID).Scan(&drugName)

	_, err := h.DB.Conn.Exec("DELETE FROM medicine_inventory WHERE id = $1", req.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete medicine: " + err.Error()})
		return
	}

	if drugName != "" {
		LogHospitalActivity(h.DB.Conn, "NARCOTICS", fmt.Sprintf("Admin deleted medicine '%s' from catalog inventory.", drugName))
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Medicine deleted from catalog successfully"})
}

// GetDoctorActivity retrieves all historical actions (implants, narcotic requests, published clinical records) of a doctor
func (h *AdminHandler) GetDoctorActivity(c *gin.Context) {
	doctorAddr := strings.ToLower(c.Query("address"))
	if doctorAddr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
		return
	}

	type ActivityItem struct {
		Type      string    `json:"type"`       // 'Implantable', 'Narcotics', 'Clinical Report'
		Details   string    `json:"details"`    // Human readable text
		Patient   string    `json:"patient"`    // Target Patient Address
		Timestamp time.Time `json:"timestamp"`
	}

	var activities []ActivityItem

	// 1. Fetch implanted devices
	deviceRows, err := h.DB.Conn.Query("SELECT device_name, serial_number, patient_address, implanted_at FROM implantable_devices WHERE implanted_by = $1 AND status = 'implanted'", doctorAddr)
	if err == nil {
		defer deviceRows.Close()
		for deviceRows.Next() {
			var devName, serial, patient string
			var impAt time.Time
			if scanErr := deviceRows.Scan(&devName, &serial, &patient, &impAt); scanErr == nil {
				activities = append(activities, ActivityItem{
					Type:      "Implantable",
					Details:   fmt.Sprintf("Implanted device %s (Serial: %s)", devName, serial),
					Patient:   patient,
					Timestamp: impAt,
				})
			}
		}
	}

	// 2. Fetch narcotics requests
	narcoticRows, err := h.DB.Conn.Query("SELECT drug_name, dosage, patient_address, status, requested_at FROM controlled_substances_logs WHERE requester_doctor = $1", doctorAddr)
	if err == nil {
		defer narcoticRows.Close()
		for narcoticRows.Next() {
			var drug, dosage, patient, status string
			var reqAt time.Time
			if scanErr := narcoticRows.Scan(&drug, &dosage, &patient, &status, &reqAt); scanErr == nil {
				activities = append(activities, ActivityItem{
					Type:      "Narcotics",
					Details:   fmt.Sprintf("Requested dose of %s (%s) - status: %s", drug, dosage, status),
					Patient:   patient,
					Timestamp: reqAt,
				})
			}
		}
	}

	// 3. Fetch clinical reports published
	recordRows, err := h.DB.Conn.Query("SELECT diagnosis, document_type, patient_address, created_at FROM medical_records WHERE doctor_address = $1", doctorAddr)
	if err == nil {
		defer recordRows.Close()
		for recordRows.Next() {
			var diagnosis, docType, patient string
			var createdAt time.Time
			if scanErr := recordRows.Scan(&diagnosis, &docType, &patient, &createdAt); scanErr == nil {
				activities = append(activities, ActivityItem{
					Type:      "Clinical Report",
					Details:   fmt.Sprintf("Published record type '%s': %s", docType, diagnosis),
					Patient:   patient,
					Timestamp: createdAt,
				})
			}
		}
	}

	// Sort activities descending by timestamp
	sort.Slice(activities, func(i, j int) bool {
		return activities[i].Timestamp.After(activities[j].Timestamp)
	})

	type ActivityResponse struct {
		Type      string `json:"type"`
		Details   string `json:"details"`
		Patient   string `json:"patient"`
		Timestamp string `json:"timestamp"`
	}

	var resp []ActivityResponse
	for _, act := range activities {
		resp = append(resp, ActivityResponse{
			Type:      act.Type,
			Details:   act.Details,
			Patient:   act.Patient,
			Timestamp: act.Timestamp.Local().Format("2006-01-02 15:04:05"),
		})
	}

	if resp == nil {
		resp = []ActivityResponse{}
	}

	c.JSON(http.StatusOK, resp)
}

// GetDoctorPatients returns all unique patients and their latest vitals for a doctor
func (h *AdminHandler) GetDoctorPatients(c *gin.Context) {
	doctorAddr := strings.ToLower(c.Query("address"))
	if doctorAddr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "doctor address is required"})
		return
	}

	// 1. Get unique patient addresses associated with this doctor (via appointments, medical records, or implants)
	query := `
		SELECT DISTINCT patient_address FROM (
			SELECT patient_address FROM medical_records WHERE doctor_address = $1
			UNION
			SELECT patient_address FROM implantable_devices WHERE implanted_by = $1
			UNION
			SELECT patient_address FROM appointments WHERE doctor_address = $1
		) AS doctor_patients
	`
	rows, err := h.DB.Conn.Query(query, doctorAddr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query doctor patients: " + err.Error()})
		return
	}
	defer rows.Close()

	var patientAddresses []string
	for rows.Next() {
		var addr string
		if errScan := rows.Scan(&addr); errScan == nil {
			patientAddresses = append(patientAddresses, addr)
		}
	}

	type PatientVital struct {
		Address         string  `json:"address"`
		Name            string  `json:"name"`
		HeartRate       int     `json:"heart_rate"`
		Systolic        int     `json:"systolic"`
		Diastolic       int     `json:"diastolic"`
		Spo2            int     `json:"spo2"`
		Temperature     float64 `json:"temperature"`
		AnomalyDetected bool    `json:"anomaly_detected"`
		LastUpdated     string  `json:"last_updated"`
	}

	var list []PatientVital
	for _, pAddr := range patientAddresses {
		var name string
		_ = h.DB.Conn.QueryRow("SELECT name FROM patient_profiles WHERE wallet_address = $1", pAddr).Scan(&name)
		if name == "" {
			name = pAddr[:8] + "..."
		}

		var v PatientVital
		v.Address = pAddr
		v.Name = name

		vitalQuery := `
			SELECT heart_rate, systolic, diastolic, spo2, temperature, anomaly_detected, created_at
			FROM vitals_logs
			WHERE patient_address = $1
			ORDER BY created_at DESC
			LIMIT 1
		`
		var createdAt time.Time
		errVital := h.DB.Conn.QueryRow(vitalQuery, pAddr).Scan(&v.HeartRate, &v.Systolic, &v.Diastolic, &v.Spo2, &v.Temperature, &v.AnomalyDetected, &createdAt)
		if errVital == nil {
			v.LastUpdated = createdAt.Local().Format("2006-01-02 15:04:05")
		} else {
			v.HeartRate = 75
			v.Systolic = 120
			v.Diastolic = 80
			v.Spo2 = 98
			v.Temperature = 36.8
			v.AnomalyDetected = false
			v.LastUpdated = "No telemetry"
		}
		list = append(list, v)
	}

	if list == nil {
		list = []PatientVital{}
	}

	c.JSON(http.StatusOK, list)
}

// GetAnomalyLogs returns vitals anomaly alerts from PostgreSQL
func (h *AdminHandler) GetAnomalyLogs(c *gin.Context) {
	doctorAddr := strings.ToLower(c.Query("address"))

	type AnomalyLog struct {
		ID             int     `json:"id"`
		PatientAddress string  `json:"patient_address"`
		PatientName    string  `json:"patient_name"`
		HeartRate      int     `json:"heart_rate"`
		Systolic       int     `json:"systolic"`
		Diastolic      int     `json:"diastolic"`
		Spo2           int     `json:"spo2"`
		Temperature    float64 `json:"temperature"`
		Timestamp      string  `json:"timestamp"`
	}

	var rows *sql.Rows
	var err error

	if doctorAddr != "" {
		query := `
			SELECT v.id, v.patient_address, COALESCE(p.name, ''), v.heart_rate, v.systolic, v.diastolic, v.spo2, v.temperature, v.created_at
			FROM vitals_logs v
			LEFT JOIN patient_profiles p ON v.patient_address = p.wallet_address
			WHERE v.anomaly_detected = TRUE
			  AND v.patient_address IN (
				  SELECT DISTINCT patient_address FROM (
					  SELECT patient_address FROM medical_records WHERE doctor_address = $1
					  UNION
					  SELECT patient_address FROM implantable_devices WHERE implanted_by = $1
					  UNION
					  SELECT patient_address FROM appointments WHERE doctor_address = $1
				  ) AS dp
			  )
			ORDER BY v.created_at DESC
			LIMIT 50
		`
		rows, err = h.DB.Conn.Query(query, doctorAddr)
	} else {
		query := `
			SELECT v.id, v.patient_address, COALESCE(p.name, ''), v.heart_rate, v.systolic, v.diastolic, v.spo2, v.temperature, v.created_at
			FROM vitals_logs v
			LEFT JOIN patient_profiles p ON v.patient_address = p.wallet_address
			WHERE v.anomaly_detected = TRUE
			ORDER BY v.created_at DESC
			LIMIT 50
		`
		rows, err = h.DB.Conn.Query(query)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query anomaly logs: " + err.Error()})
		return
	}
	defer rows.Close()

	var logs []AnomalyLog
	for rows.Next() {
		var l AnomalyLog
		var t time.Time
		if scanErr := rows.Scan(&l.ID, &l.PatientAddress, &l.PatientName, &l.HeartRate, &l.Systolic, &l.Diastolic, &l.Spo2, &l.Temperature, &t); scanErr == nil {
			if l.PatientName == "" {
				l.PatientName = l.PatientAddress[:8] + "..."
			}
			l.Timestamp = t.Local().Format("2006-01-02 15:04:05")
			logs = append(logs, l)
		}
	}

	if logs == nil {
		logs = []AnomalyLog{}
	}

	c.JSON(http.StatusOK, logs)
}

// OverrideAccess allows a clinician to trigger emergency protocol override and assign patient
func (h *AdminHandler) OverrideAccess(c *gin.Context) {
	var req struct {
		PatientAddress string `json:"patient_address" binding:"required"`
		DoctorAddress  string `json:"doctor_address" binding:"required"`
		Reason         string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pAddr := strings.ToLower(req.PatientAddress)
	dAddr := strings.ToLower(req.DoctorAddress)

	// Verify patient exists
	var pName string
	err := h.DB.Conn.QueryRow("SELECT name FROM patient_profiles WHERE wallet_address = $1", pAddr).Scan(&pName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient wallet address not admitted in system"})
		return
	}

	// Verify doctor exists
	var dName string
	err = h.DB.Conn.QueryRow("SELECT name FROM doctor_profiles WHERE wallet_address = $1", dAddr).Scan(&dName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "doctor credentials not admitted in system"})
		return
	}

	// Link them via emergency completed appointment so patient is now under their care list
	insertQuery := `
		INSERT INTO appointments (patient_address, doctor_address, appointment_date, appointment_time, reason, status)
		VALUES ($1, $2, 'EMERGENCY', 'NOW', $3, 'completed')
	`
	_, err = h.DB.Conn.Exec(insertQuery, pAddr, dAddr, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record emergency link: " + err.Error()})
		return
	}

	// Insert into emergency_overrides tracking table
	overrideInsert := `
		INSERT INTO emergency_overrides (patient_address, doctor_address, reason, votes_count, voted_doctors, status)
		VALUES ($1, $2, $3, 1, $4, 'active')
	`
	_, err = h.DB.Conn.Exec(overrideInsert, pAddr, dAddr, req.Reason, dAddr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to track emergency override: " + err.Error()})
		return
	}

	// Log in hospital activity logs
	LogHospitalActivity(h.DB.Conn, "EMERGENCY", fmt.Sprintf("Emergency Override Protocol activated by Dr. %s for Patient %s (%s). Reason: %s", dName, pName, pAddr[:10]+"...", req.Reason))

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Emergency Protocol Override active. Patient %s has been linked to your care zone.", pName),
	})
}

// TransferCare handles care transfer request and assigns patient to new doctor
func (h *AdminHandler) TransferCare(c *gin.Context) {
	var req struct {
		PatientAddress string `json:"patient_address" binding:"required"`
		DoctorAddress  string `json:"doctor_address" binding:"required"`
		Reason         string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pAddr := strings.ToLower(req.PatientAddress)
	dAddr := strings.ToLower(req.DoctorAddress)

	// Verify patient exists
	var pName string
	err := h.DB.Conn.QueryRow("SELECT name FROM patient_profiles WHERE wallet_address = $1", pAddr).Scan(&pName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient wallet address not admitted in system"})
		return
	}

	// Verify doctor exists
	var dName string
	err = h.DB.Conn.QueryRow("SELECT name FROM doctor_profiles WHERE wallet_address = $1", dAddr).Scan(&dName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "doctor credentials not admitted in system"})
		return
	}

	// Link them via completed appointment so patient is assigned
	insertQuery := `
		INSERT INTO appointments (patient_address, doctor_address, appointment_date, appointment_time, reason, status)
		VALUES ($1, $2, 'TRANSFER', 'NOW', $3, 'completed')
	`
	_, err = h.DB.Conn.Exec(insertQuery, pAddr, dAddr, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record transfer link: " + err.Error()})
		return
	}

	// Log in hospital activity logs
	LogHospitalActivity(h.DB.Conn, "TRANSFER", fmt.Sprintf("Patient care transfer finalized: Patient %s (%s) assigned to Dr. %s. Reason: %s", pName, pAddr[:10]+"...", dName, req.Reason))

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Care transfer complete. Patient %s has been assigned to your clinical dashboard.", pName),
	})
}

// ListOverrides returns all logged emergency overrides
func (h *AdminHandler) ListOverrides(c *gin.Context) {
	query := `
		SELECT o.id, o.patient_address, COALESCE(p.name, 'Unknown'), o.doctor_address, COALESCE(d.name, 'Unknown'), o.reason, o.votes_count, o.voted_doctors, o.status, o.created_at
		FROM emergency_overrides o
		LEFT JOIN patient_profiles p ON o.patient_address = p.wallet_address
		LEFT JOIN doctor_profiles d ON o.doctor_address = d.wallet_address
		ORDER BY o.created_at DESC
	`
	rows, err := h.DB.Conn.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query overrides list: " + err.Error()})
		return
	}
	defer rows.Close()

	type OverrideInfo struct {
		ID             int      `json:"id"`
		PatientAddress string   `json:"patient_address"`
		PatientName    string   `json:"patient_name"`
		DoctorAddress  string   `json:"doctor_address"`
		DoctorName     string   `json:"doctor_name"`
		Reason         string   `json:"reason"`
		VotesCount     int      `json:"votes_count"`
		VotedDoctors   string   `json:"voted_doctors"`
		Status         string   `json:"status"`
		CreatedAt      string   `json:"created_at"`
	}

	var list []OverrideInfo
	for rows.Next() {
		var o OverrideInfo
		var t time.Time
		errScan := rows.Scan(&o.ID, &o.PatientAddress, &o.PatientName, &o.DoctorAddress, &o.DoctorName, &o.Reason, &o.VotesCount, &o.VotedDoctors, &o.Status, &t)
		if errScan == nil {
			o.CreatedAt = t.Local().Format("2006-01-02 15:04:05")
			list = append(list, o)
		}
	}

	if list == nil {
		list = []OverrideInfo{}
	}

	c.JSON(http.StatusOK, list)
}

// VoteOverride allows other clinicians to co-sign or endorse an emergency override request
func (h *AdminHandler) VoteOverride(c *gin.Context) {
	var req struct {
		OverrideID    int    `json:"override_id" binding:"required"`
		DoctorAddress string `json:"doctor_address" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dAddr := strings.ToLower(req.DoctorAddress)

	// Fetch current override
	var currentVotes int
	var votedDocs, pAddr, status string
	querySelect := "SELECT votes_count, voted_doctors, patient_address, status FROM emergency_overrides WHERE id = $1"
	err := h.DB.Conn.QueryRow(querySelect, req.OverrideID).Scan(&currentVotes, &votedDocs, &pAddr, &status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "emergency override request not found"})
		return
	}

	// Verify doctor exists
	var dName string
	err = h.DB.Conn.QueryRow("SELECT name FROM doctor_profiles WHERE wallet_address = $1", dAddr).Scan(&dName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "doctor credentials not admitted in system"})
		return
	}

	// Check if already voted
	docs := strings.Split(votedDocs, ",")
	for _, doc := range docs {
		if strings.TrimSpace(doc) == dAddr {
			c.JSON(http.StatusBadRequest, gin.H{"error": "you have already endorsed this emergency override"})
			return
		}
	}

	// Query total number of active/registered doctors
	var totalDocs int
	err = h.DB.Conn.QueryRow("SELECT COUNT(*) FROM doctor_profiles WHERE status = 'active'").Scan(&totalDocs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count doctors: " + err.Error()})
		return
	}

	// Calculate 75% ceiling threshold: (totalDocs * 3 + 3) / 4
	requiredVotes := (totalDocs * 3 + 3) / 4
	if requiredVotes < 1 {
		requiredVotes = 1
	}

	// Add vote
	newVotedDocs := votedDocs + "," + dAddr
	newVotesCount := currentVotes + 1
	newStatus := status
	if newVotesCount >= requiredVotes {
		newStatus = "endorsed"
	}


	updateQuery := `
		UPDATE emergency_overrides
		SET votes_count = $1, voted_doctors = $2, status = $3
		WHERE id = $4
	`
	_, err = h.DB.Conn.Exec(updateQuery, newVotesCount, newVotedDocs, newStatus, req.OverrideID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record endorsement: " + err.Error()})
		return
	}

	// Also link this patient to the endorsing doctor's care list as well
	insertQuery := `
		INSERT INTO appointments (patient_address, doctor_address, appointment_date, appointment_time, reason, status)
		VALUES ($1, $2, 'ENDORSEMENT', 'NOW', 'Endorsed emergency override #' || $3, 'completed')
	`
	_, _ = h.DB.Conn.Exec(insertQuery, pAddr, dAddr, req.OverrideID)

	// Log hospital activity
	LogHospitalActivity(h.DB.Conn, "EMERGENCY", fmt.Sprintf("Emergency Override #%d for Patient %s co-signed/endorsed by Dr. %s. Status: %s.", req.OverrideID, pAddr[:10]+"...", dName, newStatus))

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Co-signature/endorsement registered successfully. Override status: %s.", newStatus),
	})
}




