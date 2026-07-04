package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	RPCURL             string
	PatientRegistry    string
	DoctorRegistry     string
	DatabaseURL        string
	DeployerPrivateKey string
}

func LoadConfig() *Config {
	// Attempt to load from .env file
	_ = godotenv.Load()

	return &Config{
		Port:               getEnv("PORT", "5000"),
		RPCURL:             getEnv("RPC_URL", "http://127.0.0.1:8545"),
		PatientRegistry:    os.Getenv("PATIENT_REGISTRY_ADDR"),
		DoctorRegistry:     os.Getenv("DOCTOR_REGISTRY_ADDR"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		DeployerPrivateKey: os.Getenv("DEPLOYER_PRIVATE_KEY"),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
