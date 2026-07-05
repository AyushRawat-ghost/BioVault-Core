package main

import (
	"context"
	"crypto/ecdsa"
	"log"
	"math/big"
	"strings"
	"time"

	"patient-data-system/backend/pkg/config"
	"patient-data-system/backend/pkg/db"
	"patient-data-system/backend/pkg/ethclient"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
)

const patientRegistryABI = `[
	{"inputs":[{"name":"_addr","type":"address"}],"name":"isPatient","outputs":[{"name":"","type":"bool"}],"stateMutability":"view","type":"function"},
	{"inputs":[{"name":"patient","type":"address"},{"name":"name","type":"string"},{"name":"ipfsProfile","type":"string"}],"name":"addPatient","outputs":[],"stateMutability":"nonpayable","type":"function"}
]`

const doctorRegistryABI = `[
	{"inputs":[{"name":"_addr","type":"address"}],"name":"isDoctor","outputs":[{"name":"","type":"bool"}],"stateMutability":"view","type":"function"},
	{"inputs":[{"name":"doctor","type":"address"},{"name":"name","type":"string"},{"name":"specialization","type":"string"},{"name":"ipfsProfile","type":"string"},{"name":"profileCID","type":"string"}],"name":"addDoctor","outputs":[],"stateMutability":"nonpayable","type":"function"}
]`

func main() {
	log.Println("Initializing Blockchain Patient & Doctor Registry Sync Tool...")

	cfg := config.LoadConfig()
	if cfg.PatientRegistry == "" || cfg.DoctorRegistry == "" {
		log.Fatal("PATIENT_REGISTRY_ADDR or DOCTOR_REGISTRY_ADDR is not configured")
	}

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Conn.Close()

	eth, err := ethclient.Connect(cfg.RPCURL)
	if err != nil {
		log.Fatalf("Failed to connect to Ethereum RPC: %v", err)
	}

	// Connect to Private Key
	privateKey, err := crypto.HexToECDSA(cfg.DeployerPrivateKey)
	if err != nil {
		log.Fatalf("Invalid private key: %v", err)
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Fatal("error casting public key to ECDSA")
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	ctx := context.Background()

	// ==========================================
	// 1. SYNC PATIENTS
	// ==========================================
	rowsPatients, err := database.Conn.Query("SELECT wallet_address, name FROM patient_profiles")
	if err != nil {
		log.Fatalf("Failed to query patient profiles: %v", err)
	}
	defer rowsPatients.Close()

	type Patient struct {
		Address string
		Name    string
	}

	var patients []Patient
	for rowsPatients.Next() {
		var p Patient
		if err := rowsPatients.Scan(&p.Address, &p.Name); err == nil {
			patients = append(patients, p)
		}
	}
	log.Printf("Found %d patients in PostgreSQL database.", len(patients))

	parsedPatientABI, err := abi.JSON(strings.NewReader(patientRegistryABI))
	if err != nil {
		log.Fatalf("Failed to parse patient registry ABI: %v", err)
	}

	patientContractAddr := common.HexToAddress(cfg.PatientRegistry)

	for _, p := range patients {
		patientAddr := common.HexToAddress(p.Address)

		var isRegistered bool
		callData, err := parsedPatientABI.Pack("isPatient", patientAddr)
		if err == nil {
			resBytes, errCall := eth.Client.CallContract(ctx, ethereum.CallMsg{
				To:   &patientContractAddr,
				Data: callData,
			}, nil)
			if errCall == nil {
				var out []interface{}
				out, err = parsedPatientABI.Unpack("isPatient", resBytes)
				if err == nil && len(out) > 0 {
					isRegistered = out[0].(bool)
				}
			}
		}

		if isRegistered {
			log.Printf("Patient %s (%s) is already registered on-chain. Skipping.", p.Name, p.Address)
			continue
		}

		log.Printf("Registering patient %s (%s) on-chain...", p.Name, p.Address)

		txData, err := parsedPatientABI.Pack("addPatient", patientAddr, p.Name, "ipfs://soulbound-identity-profile")
		if err != nil {
			log.Printf("Failed to pack addPatient: %v", err)
			continue
		}

		nonce, err := eth.Client.PendingNonceAt(ctx, fromAddress)
		if err != nil {
			log.Printf("Failed to get nonce: %v", err)
			continue
		}

		gasPrice, err := eth.Client.SuggestGasPrice(ctx)
		if err != nil {
			log.Printf("Failed to get gas price: %v", err)
			continue
		}

		tx := types.NewTx(&types.LegacyTx{
			Nonce:    nonce,
			To:       &patientContractAddr,
			Value:    big.NewInt(0),
			Gas:      300000,
			GasPrice: gasPrice,
			Data:     txData,
		})

		signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(eth.ChainID), privateKey)
		if err != nil {
			log.Printf("Failed to sign transaction: %v", err)
			continue
		}

		err = eth.Client.SendTransaction(ctx, signedTx)
		if err != nil {
			log.Printf("Failed to send transaction: %v", err)
			continue
		}

		log.Printf("Transaction sent! Hash: %s. Waiting for confirmation...", signedTx.Hash().Hex())
		time.Sleep(1 * time.Second)
	}

	// ==========================================
	// 2. SYNC DOCTORS
	// ==========================================
	rowsDoctors, err := database.Conn.Query("SELECT wallet_address, name, specialization FROM doctor_profiles")
	if err != nil {
		log.Fatalf("Failed to query doctor profiles: %v", err)
	}
	defer rowsDoctors.Close()

	type Doctor struct {
		Address        string
		Name           string
		Specialization string
	}

	var doctors []Doctor
	for rowsDoctors.Next() {
		var d Doctor
		if err := rowsDoctors.Scan(&d.Address, &d.Name, &d.Specialization); err == nil {
			doctors = append(doctors, d)
		}
	}
	log.Printf("Found %d doctors in PostgreSQL database.", len(doctors))

	parsedDoctorABI, err := abi.JSON(strings.NewReader(doctorRegistryABI))
	if err != nil {
		log.Fatalf("Failed to parse doctor registry ABI: %v", err)
	}

	doctorContractAddr := common.HexToAddress(cfg.DoctorRegistry)

	for _, d := range doctors {
		doctorAddr := common.HexToAddress(d.Address)

		var isRegistered bool
		callData, err := parsedDoctorABI.Pack("isDoctor", doctorAddr)
		if err == nil {
			resBytes, errCall := eth.Client.CallContract(ctx, ethereum.CallMsg{
				To:   &doctorContractAddr,
				Data: callData,
			}, nil)
			if errCall == nil {
				var out []interface{}
				out, err = parsedDoctorABI.Unpack("isDoctor", resBytes)
				if err == nil && len(out) > 0 {
					isRegistered = out[0].(bool)
				}
			}
		}

		if isRegistered {
			log.Printf("Doctor %s (%s) is already registered on-chain. Skipping.", d.Name, d.Address)
			continue
		}

		log.Printf("Registering doctor %s (%s) on-chain...", d.Name, d.Address)

		txData, err := parsedDoctorABI.Pack("addDoctor", doctorAddr, d.Name, d.Specialization, "ipfs://doctor-identity-profile", "QmdocProfileCID12345")
		if err != nil {
			log.Printf("Failed to pack addDoctor: %v", err)
			continue
		}

		nonce, err := eth.Client.PendingNonceAt(ctx, fromAddress)
		if err != nil {
			log.Printf("Failed to get nonce: %v", err)
			continue
		}

		gasPrice, err := eth.Client.SuggestGasPrice(ctx)
		if err != nil {
			log.Printf("Failed to get gas price: %v", err)
			continue
		}

		tx := types.NewTx(&types.LegacyTx{
			Nonce:    nonce,
			To:       &doctorContractAddr,
			Value:    big.NewInt(0),
			Gas:      300000,
			GasPrice: gasPrice,
			Data:     txData,
		})

		signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(eth.ChainID), privateKey)
		if err != nil {
			log.Printf("Failed to sign transaction: %v", err)
			continue
		}

		err = eth.Client.SendTransaction(ctx, signedTx)
		if err != nil {
			log.Printf("Failed to send transaction: %v", err)
			continue
		}

		log.Printf("Transaction sent! Hash: %s. Waiting for confirmation...", signedTx.Hash().Hex())
		time.Sleep(1 * time.Second)
	}

	log.Println("Blockchain sync completed successfully!")
}
