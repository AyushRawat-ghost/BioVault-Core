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
  // Read DoctorRegistry address dynamically from backend/.env
  const doctorRegistryAddress = getEnv("DOCTOR_REGISTRY_ADDR");
  if (!doctorRegistryAddress) {
    throw new Error("DOCTOR_REGISTRY_ADDR is not configured in backend/.env");
  }
  
  // Account #2 to act as the Doctor
  const doctorAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

  console.log(`Registering doctor ${doctorAddress} on contract ${doctorRegistryAddress}...`);
  
  const doctorRegistry = await hre.ethers.getContractAt("DoctorRegistry", doctorRegistryAddress);
  
  // 1. Register Account #2 as Doctor
  const isDoc1 = await doctorRegistry.isDoctor(doctorAddress);
  if (!isDoc1) {
    console.log(`Registering doctor ${doctorAddress}...`);
    const tx1 = await doctorRegistry.addDoctor(
      doctorAddress,
      "Dr. Robert Chen",            // name
      "Cardiology",                 // specialization
      "ipfs://doctor-profile-details", // ipfsProfile
      "QmdocProfileCID12345"        // profileCID
    );
    await tx1.wait();
    console.log(`✅ Registered doctor ${doctorAddress} successfully!`);
  } else {
    console.log(`ℹ️ Doctor ${doctorAddress} is already registered.`);
  }

  // 2. Register Account #0 (Admin/Backend) as Doctor too
  const adminAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const isDoc2 = await doctorRegistry.isDoctor(adminAddress);
  if (!isDoc2) {
    console.log(`Registering admin ${adminAddress} as Doctor...`);
    const tx2 = await doctorRegistry.addDoctor(
      adminAddress,
      "System Admin Gateway",            // name
      "Administrative Medicine",        // specialization
      "ipfs://admin-profile-details",    // ipfsProfile
      "QmadminProfileCID12345"          // profileCID
    );
    await tx2.wait();
    console.log(`✅ Registered admin ${adminAddress} as Doctor successfully!`);
  } else {
    console.log(`ℹ️ Admin ${adminAddress} is already registered as Doctor.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
