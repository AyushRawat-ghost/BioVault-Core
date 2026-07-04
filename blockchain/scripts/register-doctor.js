const hre = require("hardhat");

async function main() {
  // Address of your deployed DoctorRegistry contract
  const doctorRegistryAddress = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
  
  // Account #2 to act as the Doctor
  const doctorAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

  console.log(`Registering doctor ${doctorAddress} on contract ${doctorRegistryAddress}...`);
  
  const doctorRegistry = await hre.ethers.getContractAt("DoctorRegistry", doctorRegistryAddress);
  
  // Call addDoctor (Admin only)
  const tx = await doctorRegistry.addDoctor(
    doctorAddress,
    "Dr. Robert Chen",            // name
    "Cardiology",                 // specialization
    "ipfs://doctor-profile-details", // ipfsProfile
    "QmdocProfileCID12345"        // profileCID
  );
  
  await tx.wait();
  console.log(`✅ Registered doctor ${doctorAddress} successfully!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
