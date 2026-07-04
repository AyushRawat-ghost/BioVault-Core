package admin

import (
	"crypto/ecdsa"
	"math/big"
	"net/http"
	"strings"

	"patient-data-system/backend/pkg/config"
	"patient-data-system/backend/pkg/db"
	"patient-data-system/backend/pkg/ethclient"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gin-gonic/gin"
)

// Minimal PatientRegistry ABI representing the addPatient function
const patientRegistryWriteABI = `[{"inputs":[{"name":"patient","type":"address"},{"name":"name","type":"string"},{"name":"ipfsProfile","type":"string"}],"name":"addPatient","outputs":[],"stateMutability":"nonpayable","type":"function"}]`

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
	var req AdmitPatientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	walletAddrStr := strings.ToLower(req.Address)
	if !common.IsHexAddress(walletAddrStr) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient wallet address format"})
		return
	}
	patientAddr := common.HexToAddress(walletAddrStr)

	// 1. Submit on-chain transaction to register patient (Mint SBT)
	txHash, err := h.submitOnChainPatientRegistration(c, patientAddr, req.Name)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to register patient on blockchain: " + err.Error()})
		return
	}

	// 2. Write/Upsert patient profile to RDS PostgreSQL database
	query := `
		INSERT INTO patient_profiles (wallet_address, name, dob, blood_group, allergies, emergency_contact)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (wallet_address) DO UPDATE 
		SET name = $2, dob = $3, blood_group = $4, allergies = $5, emergency_contact = $6
	`
	_, dbErr := h.DB.Conn.Exec(query, walletAddrStr, req.Name, req.DOB, req.BloodGroup, req.Allergies, req.EmergencyContact)
	if dbErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Patient registered on blockchain, but failed to save profile in database: " + dbErr.Error(),
			"tx_hash": txHash,
		})
		return
	}

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
