const hre = require("hardhat");

async function main() {
  // Address of your deployed PatientRegistry contract
  const patientRegistryAddress = "0x9A676e781A523b5d0C0e43731313A708CB607508";
  
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
