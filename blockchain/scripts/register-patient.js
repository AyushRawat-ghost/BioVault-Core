const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function getEnv(key) {
  const dotenvPath = path.resolve(__dirname, "../../backend/.env");
  if (fs.existsSync(dotenvPath)) {
    const lines = fs.readFileSync(dotenvPath, "utf8").split("\n");
    for (const line of lines) {
      const parts = line.split("=");
      if (parts[0] && parts[0].trim() === key) {
        return parts[1].trim();
      }
    }
  }
  return process.env[key];
}

async function main() {
  // Read PatientRegistry address dynamically from backend/.env
  const patientRegistryAddress = getEnv("PATIENT_REGISTRY_ADDR");
  if (!patientRegistryAddress) {
    throw new Error("PATIENT_REGISTRY_ADDR is not configured in backend/.env");
  }
  
  // Account #1 from your Hardhat accounts to act as the Patient
  const patientAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  console.log(`Registering patient ${patientAddress} on contract ${patientRegistryAddress}...`);
  
  const patientRegistry = await hre.ethers.getContractAt("PatientRegistry", patientRegistryAddress);
  
  // Check if patient is already registered
  const isPat = await patientRegistry.isPatient(patientAddress);
  if (!isPat) {
    console.log(`Registering patient ${patientAddress}...`);
    const tx = await patientRegistry.addPatient(
      patientAddress,
      "Alice Vance",               // name
      "ipfs://patient-profile-cid"  // ipfsProfile
    );
    await tx.wait();
    console.log(`✅ Registered patient ${patientAddress} successfully!`);
  } else {
    console.log(`ℹ️ Patient ${patientAddress} is already registered.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
