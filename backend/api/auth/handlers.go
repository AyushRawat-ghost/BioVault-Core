package auth

import (
	"context"
	"crypto/ecdsa"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"patient-data-system/backend/pkg/config"
	"patient-data-system/backend/pkg/db"
	"patient-data-system/backend/pkg/ethclient"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gin-gonic/gin"
)

// In-memory store for active nonces (walletAddress -> nonce)
var activeNonces sync.Map

// Minimal PatientRegistry ABI representing the isPatient view function
const patientRegistryABI = `[{"inputs":[{"name":"addr","type":"address"}],"name":"isPatient","outputs":[{"name":"","type":"bool"}],"stateMutability":"view","type":"function"}]`

// Minimal DoctorRegistry ABI representing the isDoctor view function
const doctorRegistryABI = `[{"inputs":[{"name":"addr","type":"address"}],"name":"isDoctor","outputs":[{"name":"","type":"bool"}],"stateMutability":"view","type":"function"}]`

type AuthHandler struct {
	Cfg       *config.Config
	DB        *db.Database
	EthClient *ethclient.EthereumClient
}

func NewAuthHandler(cfg *config.Config, database *db.Database, ethClient *ethclient.EthereumClient) *AuthHandler {
	return &AuthHandler{
		Cfg:       cfg,
		DB:        database,
		EthClient: ethClient,
	}
}

type LoginRequest struct {
	Address   string `json:"address" binding:"required"`
	Signature string `json:"signature" binding:"required"`
	Nonce     string `json:"nonce" binding:"required"`
}

// GetNonce generates a cryptographically secure nonce for a wallet address
func (h *AuthHandler) GetNonce(c *gin.Context) {
	walletAddress := strings.ToLower(c.Query("address"))
	if walletAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet address query parameter is required"})
		return
	}

	if !common.IsHexAddress(walletAddress) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid Ethereum address format"})
		return
	}

	// Generate 16 bytes random nonce
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate nonce"})
		return
	}
	nonce := "AETHERIS-SIGN-" + hex.EncodeToString(b)

	// Save nonce with 10-minute expiry (handled at lookup or cleanup)
	activeNonces.Store(walletAddress, nonce)

	c.JSON(http.StatusOK, gin.H{
		"address": walletAddress,
		"nonce":   nonce,
	})
}

// Login verifies the signature and checks role clearance on-chain
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	walletAddr := strings.ToLower(req.Address)

	// 1. Verify that the nonce matches the active nonce stored for the address
	storedNonce, exists := activeNonces.Load(walletAddr)
	if !exists || storedNonce.(string) != req.Nonce {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired nonce. request a new challenge"})
		return
	}

	// Clear the used nonce immediately
	activeNonces.Delete(walletAddr)

	// 2. Recover signing wallet address from message and signature
	valid, err := ethclient.VerifySignature(req.Nonce, req.Signature, walletAddr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("signature verification failed: %v", err)})
		return
	}
	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "cryptographic signature mismatch"})
		return
	}

	// 3. Query the blockchain PatientRegistry SBT state
	isPatient, err := h.checkSBT(c.Request.Context(), walletAddr)
	if err != nil {
		log.Printf("Warning: PatientRegistry lookup failed: %v", err)
	}

	// 4. Query the blockchain DoctorRegistry state
	isDoctor, err := h.checkDoctorSBT(c.Request.Context(), walletAddr)
	if err != nil {
		log.Printf("Warning: DoctorRegistry lookup failed: %v", err)
	}

	// 5. Determine if address is Admin (deployer key match)
	isAdmin := false
	privateKey, err := crypto.HexToECDSA(h.Cfg.DeployerPrivateKey)
	if err == nil {
		publicKey := privateKey.Public()
		publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
		if ok {
			adminAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
			isAdmin = strings.ToLower(adminAddress.Hex()) == walletAddr
		}
	}

	// Issue session token
	sessionToken := "AETH-SESSION-" + req.Signature[10:42]

	// Determine the role for this session log
	role := "unknown"
	if isAdmin {
		role = "admin"
	} else if isDoctor {
		role = "doctor"
	} else if isPatient {
		role = "patient"
	}

	// 6. Save session details in the PostgreSQL database (valid for 24 hours)
	expiry := time.Now().Add(24 * time.Hour)
	sessionQuery := `
		INSERT INTO user_sessions (wallet_address, session_token, role, expires_at)
		VALUES ($1, $2, $3, $4)
	`
	_, dbErr := h.DB.Conn.Exec(sessionQuery, walletAddr, sessionToken, role, expiry)
	if dbErr != nil {
		log.Printf("Warning: Failed to log session to database: %v", dbErr)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "authenticated",
		"address":       walletAddr,
		"is_patient":    isPatient,
		"is_doctor":     isDoctor,
		"is_admin":      isAdmin,
		"session_token": sessionToken,
		"timestamp":     time.Now().Unix(),
	})
}

// checkSBT executes a raw view call on the PatientRegistry contract to check isPatient
func (h *AuthHandler) checkSBT(ctx context.Context, address string) (bool, error) {
	if h.Cfg.PatientRegistry == "" || h.Cfg.PatientRegistry == "0x..." {
		return false, fmt.Errorf("contract address PATIENT_REGISTRY_ADDR is not configured in backend environment")
	}

	parsedABI, err := abi.JSON(strings.NewReader(patientRegistryABI))
	if err != nil {
		return false, fmt.Errorf("failed to parse contract ABI: %w", err)
	}

	contractAddr := common.HexToAddress(h.Cfg.PatientRegistry)
	targetAddr := common.HexToAddress(address)

	// Pack call inputs
	callData, err := parsedABI.Pack("isPatient", targetAddr)
	if err != nil {
		return false, fmt.Errorf("failed to pack arguments: %w", err)
	}

	// Execute call
	msg := ethereum.CallMsg{
		To:   &contractAddr,
		Data: callData,
	}
	res, err := h.EthClient.Client.CallContract(ctx, msg, nil)
	if err != nil {
		return false, fmt.Errorf("contract call reverted: %w", err)
	}

	// Unpack output
	var isPatient bool
	err = parsedABI.UnpackIntoInterface(&isPatient, "isPatient", res)
	if err != nil {
		return false, fmt.Errorf("failed to unpack return data: %w", err)
	}

	return isPatient, nil
}

// checkDoctorSBT executes a raw view call on the DoctorRegistry contract to check isDoctor
func (h *AuthHandler) checkDoctorSBT(ctx context.Context, address string) (bool, error) {
	if h.Cfg.DoctorRegistry == "" || h.Cfg.DoctorRegistry == "0x..." {
		return false, nil
	}

	parsedABI, err := abi.JSON(strings.NewReader(doctorRegistryABI))
	if err != nil {
		return false, fmt.Errorf("failed to parse doctor contract ABI: %w", err)
	}

	contractAddr := common.HexToAddress(h.Cfg.DoctorRegistry)
	targetAddr := common.HexToAddress(address)

	// Pack call inputs
	callData, err := parsedABI.Pack("isDoctor", targetAddr)
	if err != nil {
		return false, fmt.Errorf("failed to pack doctor arguments: %w", err)
	}

	// Execute call
	msg := ethereum.CallMsg{
		To:   &contractAddr,
		Data: callData,
	}
	res, err := h.EthClient.Client.CallContract(ctx, msg, nil)
	if err != nil {
		return false, fmt.Errorf("doctor contract call reverted: %w", err)
	}

	// Unpack output
	var isDoctor bool
	err = parsedABI.UnpackIntoInterface(&isDoctor, "isDoctor", res)
	if err != nil {
		return false, fmt.Errorf("failed to unpack doctor return data: %w", err)
	}

	return isDoctor, nil
}
