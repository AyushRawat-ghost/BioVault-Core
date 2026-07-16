package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"math/rand"
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

var firstNames = []string{"Aarav", "Aditi", "Amit", "Ananya", "Arjun", "Deepak", "Divya", "Gaurav", "Isha", "Karan", "Kavya", "Rahul", "Riya", "Rohan", "Sanjay", "Shreya", "Siddharth", "Tanvi", "Varun", "Vikram", "Preeti", "Rajesh", "Sunita", "Vijay", "Anjali", "Suresh", "Neha", "Manish", "Pooja", "Alok"}
var lastNames = []string{"Sharma", "Verma", "Gupta", "Mehta", "Patel", "Iyer", "Nair", "Kadam", "Sen", "Joshi", "Rao", "Reddy", "Singh", "Das", "Choudhury", "Bose", "Pillai", "Mishra", "Pandey", "Dubey", "Kapoor", "Khanna", "Malhotra", "Sinha", "Saxena"}
var specializations = []string{"Cardiology", "Neurology", "Pediatrics", "Orthopedics", "Oncology", "Dermatology", "Gastroenterology", "Endocrinology", "Psychiatry", "Ophthalmology"}
var bloodGroups = []string{"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
var allergiesList = []string{"Penicillin", "Sulfa drugs", "Peanuts", "Dust mites", "Pollen", "None", "None", "None"}
var insuranceProviders = []string{"Alteris Care", "HDFC Ergo", "Star Health", "Max Bupa", "ICICI Lombard"}

func getRandomName(r *rand.Rand) string {
	return firstNames[r.Intn(len(firstNames))] + " " + lastNames[r.Intn(len(lastNames))]
}

func main() {
	log.Println("Initializing Bulk Database and Blockchain Seeder...")

	cfg := config.LoadConfig()
	if cfg.PatientRegistry == "" || cfg.DoctorRegistry == "" {
		log.Fatal("PATIENT_REGISTRY_ADDR or DOCTOR_REGISTRY_ADDR is not configured in backend/.env")
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
	defer eth.Close()

	// Connect to Private Key
	privateKey, err := crypto.HexToECDSA(cfg.DeployerPrivateKey)
	if err != nil {
		log.Fatalf("Invalid private key: %v", err)
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Fatal("Error casting public key to ECDSA")
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	ctx := context.Background()

	log.Printf("Using Admin Deployer Address: %s", fromAddress.Hex())

	// Define all 100 Hardhat Accounts provided by the user
	accounts := []string{
		"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Account #0
		"0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account #1
		"0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account #2
		"0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Account #3
		"0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", // Account #4
		"0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", // Account #5
		"0x976EA74026E726554dB657fA54763abd0C3a0aa9", // Account #6
		"0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", // Account #7
		"0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", // Account #8
		"0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", // Account #9
		"0xBcd4042DE499D14e55001CcbB24a551F3b954096", // Account #10
		"0x71bE63f3384f5fb98995898A86B02Fb2426c5788", // Account #11
		"0xFABB0ac9d68B0B445fB7357272Ff202C5651694a", // Account #12
		"0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec", // Account #13
		"0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097", // Account #14
		"0xcd3B766CCDd6AE721141F452C550Ca635964ce71", // Account #15
		"0x2546BcD3c84621e976D8185a91A922aE77ECEc30", // Account #16
		"0xbDA5747bFD65F08deb54cb465eB87D40e51B197E", // Account #17
		"0xdD2FD4581271e230360230F9337D5c0430Bf44C0", // Account #18
		"0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", // Account #19
		"0x09DB0a93B389bEF724429898f539AEB7ac2Dd55f", // Account #20
		"0x02484cb50AAC86Eae85610D6f4Bf026f30f6627D", // Account #21
		"0x08135Da0A343E492FA2d4282F2AE34c6c5CC1BbE", // Account #22
		"0x5E661B79FE2D3F6cE70F5AAC07d8Cd9abb2743F1", // Account #23
		"0x61097BA76cD906d2ba4FD106E757f7Eb455fc295", // Account #24
		"0xDf37F81dAAD2b0327A0A50003740e1C935C70913", // Account #25
		"0x553BC17A05702530097c3677091C5BB47a3a7931", // Account #26
		"0x87BdCE72c06C21cd96219BD8521bDF1F42C78b5e", // Account #27
		"0x40Fc963A729c542424cD800349a7E4Ecc4896624", // Account #28
		"0x9DCCe783B6464611f38631e6C851bf441907c710", // Account #29
		"0x1BcB8e569EedAb4668e55145Cfeaf190902d3CF2", // Account #30
		"0x8263Fce86B1b78F95Ab4dae11907d8AF88f841e7", // Account #31
		"0xcF2d5b3cBb4D7bF04e3F7bFa8e27081B52191f91", // Account #32
		"0x86c53Eb85D0B7548fea5C4B4F82b4205C8f6Ac18", // Account #33
		"0x1aac82773CB722166D7dA0d5b0FA35B0307dD99D", // Account #34
		"0x2f4f06d218E426344CFE1A83D53dAd806994D325", // Account #35
		"0x1003ff39d25F2Ab16dBCc18EcE05a9B6154f65F4", // Account #36
		"0x9eAF5590f2c84912A08de97FA28d0529361Deb9E", // Account #37
		"0x11e8F3eA3C6FcF12EcfF2722d75CEFC539c51a1C", // Account #38
		"0x7D86687F980A56b832e9378952B738b614A99dc6", // Account #39
		"0x9eF6c02FB2ECc446146E05F1fF687a788a8BF76d", // Account #40
		"0x08A2DE6F3528319123b25935C92888B16db8913E", // Account #41
		"0xe141C82D99D85098e03E1a1cC1CdE676556fDdE0", // Account #42
		"0x4b23D303D9e3719D6CDf8d172Ea030F80509ea15", // Account #43
		"0xC004e69C5C04A223463Ff32042dd36DabF63A25a", // Account #44
		"0x5eb15C0992734B5e77c888D713b4FC67b3D679A2", // Account #45
		"0x7Ebb637fd68c523613bE51aad27C35C4DB199B9c", // Account #46
		"0x3c3E2E178C69D4baD964568415a0f0c84fd6320A", // Account #47
		"0x35304262b9E87C00c430149f28dD154995d01207", // Account #48
		"0xD4A1E660C916855229e1712090CcfD8a424A2E33", // Account #49
		"0xEe7f6A930B29d7350498Af97f0F9672EaecbeeFf", // Account #50
		"0x145e2dc5C8238d1bE628F87076A37d4a26a78544", // Account #51
		"0xD6A098EbCc5f8Bd4e174D915C54486B077a34A51", // Account #52
		"0x042a63149117602129B6922ecFe3111168C2C323", // Account #53
		"0xa0EC9eE47802CeB56eb58ce80F3E41630B771b04", // Account #54
		"0xe8B1ff302A740fD2C6e76B620d45508dAEc2DDFf", // Account #55
		"0xAb707cb80e7de7C75d815B1A653433F3EEc44c74", // Account #56
		"0x0d803cdeEe5990f22C2a8DF10A695D2312dA26CC", // Account #57
		"0x1c87Bb9234aeC6aDc580EaE6C8B59558A4502220", // Account #58
		"0x4779d18931B35540F84b0cd0e9633855B84df7b8", // Account #59
		"0xC0543b0b980D8c834CBdF023b2d2A75b5f9D1909", // Account #60
		"0x73B3074ac649A8dc31c2C90a124469456301a30F", // Account #61
		"0x265188114EB5d5536BC8654d8e9710FE72C28c4d", // Account #62
		"0x924Ba5Ce9f91ddED37b4ebf8c0dc82A40202fc0A", // Account #63
		"0x64492E25C30031EDAD55E57cEA599CDB1F06dad1", // Account #64
		"0x262595fa2a3A86adACDe208589614d483e3eF1C0", // Account #65
		"0xDFd99099Fa13541a64AEe9AAd61c0dbf3D32D492", // Account #66
		"0x63c3686EF31C03a641e2Ea8993A91Ea351e5891a", // Account #67
		"0x9394cb5f737Bd3aCea7dcE90CA48DBd42801EE5d", // Account #68
		"0x344dca30F5c5f74F2f13Dc1d48Ad3A9069d13Ad9", // Account #69
		"0xF23E054D8b4D0BECFa22DeEF5632F27f781f8bf5", // Account #70
		"0x6d69F301d1Da5C7818B5e61EECc745b30179C68b", // Account #71
		"0xF0cE7BaB13C99bA0565f426508a7CD8f4C247E5a", // Account #72
		"0x011bD5423C5F77b5a0789E27f922535fd76B688F", // Account #73
		"0xD9065f27e9b706E5F7628e067cC00B288dddbF19", // Account #74
		"0x54ccCeB38251C29b628ef8B00b3cAB97e7cAc7D5", // Account #75
		"0xA1196426b41627ae75Ea7f7409E074BE97367da2", // Account #76
		"0xE74cEf90b6CF1a77FEfAd731713e6f53e575C183", // Account #77
		"0x7Df8Efa6d6F1CB5C4f36315e0AcB82b02Ae8BA40", // Account #78
		"0x9E126C57330FA71556628e0aabd6B6B6783d99fA", // Account #79
		"0x586BA39027A74e8D40E6626f89Ae97bA7f616644", // Account #80
		"0x9A50ed082Cf2fc003152580dcDB320B834fA379E", // Account #81
		"0xbc8183bac3E969042736f7af07f76223D11D2148", // Account #82
		"0x586aF62EAe7F447D14D25f53918814e04d3A5BA4", // Account #83
		"0xCcDd262f272Ee6C226266eEa13eE48D4d932Ce66", // Account #84
		"0xF0eeDDC5e015d4c459590E01Dcc2f2FD1d2baac7", // Account #85
		"0x4edFEDFf17ab9642F8464D6143900903dD21421a", // Account #86
		"0x492C973C16E8aeC46f4d71716E91b05B245377C9", // Account #87
		"0xE5D3ab6883b7e8c35c04675F28BB992Ca1129ee4", // Account #88
		"0x71F280DEA6FC5a03790941Ad72956f545FeB7a52", // Account #89
		"0xE77478D9E136D3643cFc6fef578Abf63F9Ab91B1", // Account #90
		"0x6C8EA11559DFE79Ae3dBDD6A67b47F61b929398f", // Account #91
		"0x48fA7b63049A6F4E7316EB2D9c5BDdA8933BCA2f", // Account #92
		"0x16aDfbeFdEfD488C992086D472A4CA577a0e5e54", // Account #93
		"0x225356FF5d64889D7364Be2c990f93a66298Ee8D", // Account #94
		"0xcBDc0F9a4C38f1e010bD3B6e43598A55D1868c23", // Account #95
		"0xBc5BdceE96b1BC47822C74e6f64186fbA7d686be", // Account #96
		"0x0536896a5e38BbD59F3F369FF3682677965aBD19", // Account #97
		"0xFE0f143FcAD5B561b1eD2AC960278A2F23559Ef9", // Account #98
		"0x98D08079928FcCB30598c6C6382ABfd7dbFaA1cD", // Account #99
	}

	// Designate exactly 10 Accounts as Doctors
	doctorsMap := map[string]bool{
		strings.ToLower("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"): true, // Account #0 (Admin as Doctor)
		strings.ToLower("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"): true, // Account #2
		strings.ToLower("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"): true, // Account #5
		strings.ToLower("0x71bE63f3384f5fb98995898A86B02Fb2426c5788"): true, // Account #11
		strings.ToLower("0x08135Da0A343E492FA2d4282F2AE34c6c5CC1BbE"): true, // Account #22
		strings.ToLower("0x86c53Eb85D0B7548fea5C4B4F82b4205C8f6Ac18"): true, // Account #33
		strings.ToLower("0xC004e69C5C04A223463Ff32042dd36DabF63A25a"): true, // Account #44
		strings.ToLower("0xe8B1ff302A740fD2C6e76B620d45508dAEc2DDFf"): true, // Account #55
		strings.ToLower("0xDFd99099Fa13541a64AEe9AAd61c0dbf3D32D492"): true, // Account #66
		strings.ToLower("0xE74cEf90b6CF1a77FEfAd731713e6f53e575C183"): true, // Account #77
	}

	parsedPatientABI, err := abi.JSON(strings.NewReader(patientRegistryABI))
	if err != nil {
		log.Fatalf("Failed to parse patient ABI: %v", err)
	}

	parsedDoctorABI, err := abi.JSON(strings.NewReader(doctorRegistryABI))
	if err != nil {
		log.Fatalf("Failed to parse doctor ABI: %v", err)
	}

	patientContractAddr := common.HexToAddress(cfg.PatientRegistry)
	doctorContractAddr := common.HexToAddress(cfg.DoctorRegistry)

	// Create random generator seed
	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	doctorsSeeded := 0
	patientsSeeded := 0

	for i, addrStr := range accounts {
		walletAddrLower := strings.ToLower(addrStr)
		walletAddress := common.HexToAddress(addrStr)
		isDoctor := doctorsMap[walletAddrLower]

		if isDoctor {
			// --- SEED DOCTOR ---
			name := getRandomName(r)
			if i == 0 {
				name = "System Admin Gateway"
			} else if i == 2 {
				name = "Dr. Robert Chen"
			} else if i == 5 {
				name = "Dr. Tejaswini Kadam"
			} else {
				name = "Dr. " + name
			}

			spec := specializations[r.Intn(len(specializations))]
			if i == 0 {
				spec = "Administrative Medicine"
			} else if i == 2 {
				spec = "Cardiology"
			} else if i == 5 {
				spec = "Neurology"
			}

			// Check if registered on-chain
			var alreadyRegistered bool
			callData, errPack := parsedDoctorABI.Pack("isDoctor", walletAddress)
			if errPack == nil {
				resBytes, errCall := eth.Client.CallContract(ctx, ethereum.CallMsg{
					To:   &doctorContractAddr,
					Data: callData,
				}, nil)
				if errCall == nil {
					var out []interface{}
					out, err = parsedDoctorABI.Unpack("isDoctor", resBytes)
					if err == nil && len(out) > 0 {
						alreadyRegistered = out[0].(bool)
					}
				}
			}

			if !alreadyRegistered {
				log.Printf("[%d/100] Registering Doctor %s (%s) on-chain...", i+1, name, addrStr)
				txData, errPack := parsedDoctorABI.Pack("addDoctor", walletAddress, name, spec, "ipfs://doctor-profile", fmt.Sprintf("QmdocProfileCID%d", i))
				if errPack == nil {
					errTx := sendTransaction(ctx, eth, fromAddress, privateKey, doctorContractAddr, txData)
					if errTx != nil {
						log.Printf("Failed to register Doctor %s: %v", name, errTx)
					} else {
						log.Printf("✅ Doctor %s registered on-chain successfully!", name)
					}
				}
			} else {
				log.Printf("[%d/100] Doctor %s (%s) already registered on-chain.", i+1, name, addrStr)
			}

			// Save/Insert into PostgreSQL database
			dbQuery := `
				INSERT INTO doctor_profiles (wallet_address, name, specialization, employee_id, contact_number, home_address, status)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				ON CONFLICT (wallet_address) DO UPDATE
				SET name = EXCLUDED.name, specialization = EXCLUDED.specialization
			`
			empID := fmt.Sprintf("EMP-%04d", r.Intn(10000))
			contactNum := fmt.Sprintf("+91-%d", 9000000000+r.Int63n(1000000000))
			homeAddr := fmt.Sprintf("Avenue %d, Block %c, New Delhi", r.Intn(100)+1, rune('A'+r.Intn(26)))
			_, dbErr := database.Conn.Exec(dbQuery, walletAddrLower, name, spec, empID, contactNum, homeAddr, "active")
			if dbErr != nil {
				log.Printf("Failed to save doctor to database: %v", dbErr)
			} else {
				doctorsSeeded++
			}

		} else {
			// --- SEED PATIENT ---
			name := getRandomName(r)
			if i == 1 {
				name = "Alice Vance"
			}

			// Check if registered on-chain
			var alreadyRegistered bool
			callData, errPack := parsedPatientABI.Pack("isPatient", walletAddress)
			if errPack == nil {
				resBytes, errCall := eth.Client.CallContract(ctx, ethereum.CallMsg{
					To:   &patientContractAddr,
					Data: callData,
				}, nil)
				if errCall == nil {
					var out []interface{}
					out, err = parsedPatientABI.Unpack("isPatient", resBytes)
					if err == nil && len(out) > 0 {
						alreadyRegistered = out[0].(bool)
					}
				}
			}

			if !alreadyRegistered {
				log.Printf("[%d/100] Registering Patient %s (%s) on-chain...", i+1, name, addrStr)
				txData, errPack := parsedPatientABI.Pack("addPatient", walletAddress, name, "ipfs://patient-profile")
				if errPack == nil {
					errTx := sendTransaction(ctx, eth, fromAddress, privateKey, patientContractAddr, txData)
					if errTx != nil {
						log.Printf("Failed to register Patient %s: %v", name, errTx)
					} else {
						log.Printf("✅ Patient %s registered on-chain successfully!", name)
					}
				}
			} else {
				log.Printf("[%d/100] Patient %s (%s) already registered on-chain.", i+1, name, addrStr)
			}

			// Save/Insert into PostgreSQL database
			dbQuery := `
				INSERT INTO patient_profiles (wallet_address, name, dob, blood_group, allergies, emergency_contact, status, insurance_provider, insurance_policy_number, insurance_coverage_limit, insurance_policy_status)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
				ON CONFLICT (wallet_address) DO UPDATE
				SET name = EXCLUDED.name
			`
			dob := fmt.Sprintf("%d-%02d-%02d", 1960+r.Intn(50), r.Intn(12)+1, r.Intn(28)+1)
			bg := bloodGroups[r.Intn(len(bloodGroups))]
			allergies := allergiesList[r.Intn(len(allergiesList))]
			emergencyContact := fmt.Sprintf("+91-%d", 9000000000+r.Int63n(1000000000))
			insProvider := insuranceProviders[r.Intn(len(insuranceProviders))]
			insPolicyNum := fmt.Sprintf("POL-ALT-%05d", r.Intn(100000))
			insLimit := 25000.00 + float64(r.Intn(15)*5000)

			_, dbErr := database.Conn.Exec(dbQuery, walletAddrLower, name, dob, bg, allergies, emergencyContact, "active", insProvider, insPolicyNum, insLimit, "Active")
			if dbErr != nil {
				log.Printf("Failed to save patient to database: %v", dbErr)
			} else {
				patientsSeeded++
			}
		}
	}

	log.Printf("Bulk seeding completed: %d Doctors and %d Patients populated in database and blockchain!", doctorsSeeded, patientsSeeded)
}

func sendTransaction(ctx context.Context, eth *ethclient.EthereumClient, fromAddress common.Address, privateKey *ecdsa.PrivateKey, toAddress common.Address, txData []byte) error {
	nonce, err := eth.Client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return fmt.Errorf("failed to get nonce: %w", err)
	}

	gasPrice, err := eth.Client.SuggestGasPrice(ctx)
	if err != nil {
		return fmt.Errorf("failed to get gas price: %w", err)
	}

	tx := types.NewTx(&types.LegacyTx{
		Nonce:    nonce,
		To:       &toAddress,
		Value:    big.NewInt(0),
		Gas:      300000,
		GasPrice: gasPrice,
		Data:     txData,
	})

	signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(eth.ChainID), privateKey)
	if err != nil {
		return fmt.Errorf("failed to sign transaction: %w", err)
	}

	err = eth.Client.SendTransaction(ctx, signedTx)
	if err != nil {
		return fmt.Errorf("failed to send transaction: %w", err)
	}

	// Wait briefly for tx pool confirmation
	time.Sleep(150 * time.Millisecond)
	return nil
}
