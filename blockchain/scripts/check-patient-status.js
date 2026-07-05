const hre = require("hardhat");

async function main() {
  const patientRegistryAddress = "0x9A676e781A523b5d0C0e43731313A708CB607508";
  const patientAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  console.log(`Checking isPatient status for ${patientAddress} on contract ${patientRegistryAddress}...`);
  const patientRegistry = await hre.ethers.getContractAt("PatientRegistry", patientRegistryAddress);
  
  const status = await patientRegistry.isPatient(patientAddress);
  console.log(`On-chain isPatient returned: ${status}`);

  const owner = await patientRegistry.owner();
  console.log(`Contract Owner: ${owner}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
