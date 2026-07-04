package ethclient

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

type EthereumClient struct {
	Client  *ethclient.Client
	ChainID *big.Int
}

// Connect dials the RPC URL and retrieves the chain ID
func Connect(rpcURL string) (*EthereumClient, error) {
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("failed to dial RPC: %w", err)
	}

	chainID, err := client.ChainID(context.Background())
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("failed to fetch chain ID: %w", err)
	}

	return &EthereumClient{
		Client:  client,
		ChainID: chainID,
	}, nil
}

// Close closes the underlying client connection
func (e *EthereumClient) Close() {
	if e.Client != nil {
		e.Client.Close()
	}
}

// VerifySignature recovers the signer's address and checks if it matches expectedAddress
func VerifySignature(message string, signatureHex string, expectedAddress string) (bool, error) {
	// Parse hex signature
	signatureHex = strings.TrimPrefix(signatureHex, "0x")
	sigBytes := common.FromHex(signatureHex)
	if len(sigBytes) != 65 {
		return false, errors.New("invalid signature length, must be 65 bytes")
	}

	// Adjust V parameter (MetaMask signs with V = 27 or 28, Go-Ethereum expects V = 0 or 1)
	if sigBytes[64] == 27 || sigBytes[64] == 28 {
		sigBytes[64] -= 27
	}

	// Reconstruct the Ethereum personal sign message hash
	prefix := fmt.Sprintf("\x19Ethereum Signed Message:\n%d", len(message))
	fullMessage := prefix + message
	msgHash := crypto.Keccak256Hash([]byte(fullMessage))

	// Recover the public key
	pubKeyRaw, err := crypto.Ecrecover(msgHash.Bytes(), sigBytes)
	if err != nil {
		return false, fmt.Errorf("failed to recover public key: %w", err)
	}

	pubKey, err := crypto.UnmarshalPubkey(pubKeyRaw)
	if err != nil {
		return false, fmt.Errorf("failed to unmarshal public key: %w", err)
	}

	// Derive the address from public key
	recoveredAddress := crypto.PubkeyToAddress(*pubKey)

	// Compare lowercase addresses
	return strings.ToLower(recoveredAddress.Hex()) == strings.ToLower(expectedAddress), nil
}
