package records

import (
	"bytes"
	"context"
	"crypto/ecdsa"
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
)

// Minimal MedicalRecord ABI representing the addRecord function
const medicalRecordWriteABI = `[{"inputs":[{"name":"_patient","type":"address"},{"name":"_cid","type":"string"}],"name":"addRecord","outputs":[],"stateMutability":"nonpayable","type":"function"}]`

type RecordsHandler struct {
	Cfg       *config.Config
	DB        *db.Database
	EthClient *ethclient.EthereumClient
}

func NewRecordsHandler(cfg *config.Config, database *db.Database, ethClient *ethclient.EthereumClient) *RecordsHandler {
	return &RecordsHandler{
		Cfg:       cfg,
		DB:        database,
		EthClient: ethClient,
	}
}

// UploadRecord handles file upload (PDF/Image) to S3 and registers it in blockchain + Postgres
func (h *RecordsHandler) UploadRecord(c *gin.Context) {
	patientAddrStr := strings.ToLower(c.PostForm("patient_address"))
	diagnosis := c.PostForm("diagnosis")
	docType := strings.ToLower(c.PostForm("document_type")) // "prescription", "report", etc.

	if patientAddrStr == "" || diagnosis == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "patient_address and diagnosis are required fields"})
		return
	}

	if !common.IsHexAddress(patientAddrStr) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient address format"})
		return
	}

	// Read multipart file
	fileHeader, err := c.FormFile("record")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file file upload 'record' is required: " + err.Error()})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open upload file: " + err.Error()})
		return
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file bytes: " + err.Error()})
		return
	}

	// 1. Determine S3 Key prefix folder
	folder := "reports"
	if docType == "prescription" {
		folder = "prescriptions"
	}
	
	timestamp := time.Now().Unix()
	ext := filepath.Ext(fileHeader.Filename)
	s3Key := fmt.Sprintf("%s/%s/%d_record%s", folder, patientAddrStr, timestamp, ext)

	ctx := c.Request.Context()

	// 2. Upload bytes to S3
	s3URL, err := h.uploadToS3(ctx, s3Key, fileBytes)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to upload document to S3 vault: " + err.Error()})
		return
	}

	// 3. Register on-chain (using backend Admin signer key)
	txHash, err := h.submitOnChainRecordRegistration(c, common.HexToAddress(patientAddrStr), s3Key)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "file uploaded to S3, but failed to index on blockchain: " + err.Error()})
		return
	}

	// 4. Save metadata in Postgres medical_records table
	// We get doctor address from the transaction signer configured in env (since the backend signs the transaction)
	doctorAddrStr := h.getAdminAddress()

	insertQuery := `
		INSERT INTO medical_records (patient_address, doctor_address, diagnosis, document_type, s3_key)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, dbErr := h.DB.Conn.Exec(insertQuery, patientAddrStr, doctorAddrStr, diagnosis, docType, s3Key)
	if dbErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "File uploaded and registered on-chain, but failed to save database log: " + dbErr.Error(),
			"tx_hash": txHash,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"message":   "Clinical record uploaded, registered, and logged successfully",
		"s3_url":    s3URL,
		"s3_key":    s3Key,
		"tx_hash":   txHash,
		"timestamp": timestamp,
	})
}

// UploadAvatar handles uploading patient profile photo to S3 Profile-photos/
func (h *RecordsHandler) UploadAvatar(c *gin.Context) {
	patientAddrStr := strings.ToLower(c.PostForm("patient_address"))
	if patientAddrStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "patient_address form field is required"})
		return
	}

	if !common.IsHexAddress(patientAddrStr) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient address format"})
		return
	}

	fileHeader, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "image file 'avatar' is required"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open upload image: " + err.Error()})
		return
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read image bytes: " + err.Error()})
		return
	}

	// Use exactly Profile-photos/ prefix as matching S3 folder name
	s3Key := fmt.Sprintf("Bio-Information/Profile-photos/%s.png", patientAddrStr)
	ctx := c.Request.Context()

	s3URL, err := h.uploadToS3(ctx, s3Key, fileBytes)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to upload avatar to S3: " + err.Error()})
		return
	}

	// Update PostgreSQL database row - check if patient exists first, otherwise update doctor
	var exists bool
	_ = h.DB.Conn.QueryRow("SELECT EXISTS(SELECT 1 FROM patient_profiles WHERE wallet_address = $1)", patientAddrStr).Scan(&exists)

	var updateQuery string
	if exists {
		updateQuery = `UPDATE patient_profiles SET avatar_url = $1 WHERE wallet_address = $2`
	} else {
		updateQuery = `UPDATE doctor_profiles SET avatar_url = $1 WHERE wallet_address = $2`
	}

	_, dbErr := h.DB.Conn.Exec(updateQuery, s3URL, patientAddrStr)
	if dbErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "avatar uploaded to S3, but database log failed: " + dbErr.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":     "success",
		"avatar_url": s3URL,
	})
}

// GetRecordsList retrieves patient medical records, generating S3 pre-signed download links
func (h *RecordsHandler) GetRecordsList(c *gin.Context) {
	patientAddrStr := strings.ToLower(c.Query("address"))
	if patientAddrStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address query parameter is required"})
		return
	}

	if !common.IsHexAddress(patientAddrStr) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid Ethereum address format"})
		return
	}

	// 1. Fetch metadata list from Postgres
	query := `
		SELECT id, diagnosis, doctor_address, document_type, s3_key, created_at 
		FROM medical_records 
		WHERE patient_address = $1 
		ORDER BY created_at DESC
	`
	rows, err := h.DB.Conn.Query(query, patientAddrStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query medical records: " + err.Error()})
		return
	}
	defer rows.Close()

	type RecordResponse struct {
		ID           int    `json:"id"`
		Diagnosis    string `json:"diagnosis"`
		Doctor       string `json:"doctor"`
		DocType      string `json:"document_type"`
		Date         string `json:"date"`
		DownloadURL  string `json:"download_url"`
	}

	ctx := c.Request.Context()
	var recordsList []RecordResponse

	// 2. Loop through records and generate S3 pre-signed download link for each
	for rows.Next() {
		var id int
		var diagnosis, doctor, docType, s3Key string
		var createdAt time.Time

		if scanErr := rows.Scan(&id, &diagnosis, &doctor, &docType, &s3Key, &createdAt); scanErr == nil {
			downloadURL, signErr := h.getPresignedDownloadURL(ctx, s3Key)
			if signErr != nil {
				// Fallback to static URL if signing fails
				downloadURL = fmt.Sprintf("https://%s.s3.amazonaws.com/%s", h.Cfg.AWSS3Bucket, s3Key)
			}

			recordsList = append(recordsList, RecordResponse{
				ID:          id,
				Diagnosis:   diagnosis,
				Doctor:      doctor,
				DocType:     docType,
				Date:        createdAt.Format("2006-01-02"),
				DownloadURL: downloadURL,
			})
		}
	}

	if recordsList == nil {
		recordsList = []RecordResponse{}
	}

	c.JSON(http.StatusOK, recordsList)
}

// --- HELPER AWS S3 UTILITIES ---

func (h *RecordsHandler) uploadToS3(ctx context.Context, key string, fileBytes []byte) (string, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		return "", fmt.Errorf("unable to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg)

	_, err = client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: &h.Cfg.AWSS3Bucket,
		Key:    &key,
		Body:   bytes.NewReader(fileBytes),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload object to S3: %w", err)
	}

	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = os.Getenv("AWS_DEFAULT_REGION")
	}
	if region == "" {
		region = "us-east-1" // Fallback region
	}

	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", h.Cfg.AWSS3Bucket, region, key)
	return url, nil
}

func (h *RecordsHandler) getPresignedDownloadURL(ctx context.Context, key string) (string, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		return "", err
	}

	client := s3.NewFromConfig(awsCfg)
	presignClient := s3.NewPresignClient(client)

	req, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: &h.Cfg.AWSS3Bucket,
		Key:    &key,
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		return "", err
	}

	return req.URL, nil
}

// --- HELPER CONTRACT UTILITIES ---

func (h *RecordsHandler) submitOnChainRecordRegistration(c *gin.Context, patient common.Address, s3Key string) (string, error) {
	if h.EthClient == nil {
		return "0x-offline-simulate-hash", nil
	}

	// MedicalRecord contract address
	contractAddrStr := os.Getenv("MEDICAL_RECORD_ADDR")
	if contractAddrStr == "" {
		return "", fmt.Errorf("MEDICAL_RECORD_ADDR is not configured in backend environment")
	}
	contractAddr := common.HexToAddress(contractAddrStr)

	parsedABI, err := abi.JSON(strings.NewReader(medicalRecordWriteABI))
	if err != nil {
		return "", err
	}

	// Pack call inputs: addRecord(address patient, string cid)
	callData, err := parsedABI.Pack("addRecord", patient, s3Key)
	if err != nil {
		return "", err
	}

	// Parse admin/doctor private key
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

func (h *RecordsHandler) getAdminAddress() string {
	privateKey, err := crypto.HexToECDSA(h.Cfg.DeployerPrivateKey)
	if err == nil {
		publicKey := privateKey.Public()
		publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
		if ok {
			adminAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
			return strings.ToLower(adminAddress.Hex())
		}
	}
	return "0x0000000000000000000000000000000000000000"
}
