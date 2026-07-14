const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying full healthcare system with account:", deployer.address);

  // --- STAGE 1: IDENTITY & REGISTRIES ---
  const DoctorRegistry = await hre.ethers.getContractFactory("DoctorRegistry");
  const doctorRegistry = await DoctorRegistry.deploy();
  await doctorRegistry.waitForDeployment();
  const drAddr = await doctorRegistry.getAddress();
  console.log("✅ DoctorRegistry:", drAddr);

  const PatientRegistry = await hre.ethers.getContractFactory("PatientRegistry");
  const patientRegistry = await PatientRegistry.deploy();
  await patientRegistry.waitForDeployment();
  const ptAddr = await patientRegistry.getAddress();
  console.log("✅ PatientRegistry:", ptAddr);

  const InsurerRegistry = await hre.ethers.getContractFactory("InsurerRegistry");
  const insurerRegistry = await InsurerRegistry.deploy();
  await insurerRegistry.waitForDeployment();
  const insAddr = await insurerRegistry.getAddress();
  console.log("✅ InsurerRegistry:", insAddr);

  // --- STAGE 2: CLINICAL SERVICES ---
  const Telemedicine = await hre.ethers.getContractFactory("Telemedicine");
  const telemedicine = await Telemedicine.deploy(drAddr, ptAddr);
  await telemedicine.waitForDeployment();
  const teleAddr = await telemedicine.getAddress();
  console.log("✅ Telemedicine:", teleAddr);

  const PrescriptionManager = await hre.ethers.getContractFactory("PrescriptionManager");
  const prescription = await PrescriptionManager.deploy(teleAddr);
  await prescription.waitForDeployment();
  const rxAddr = await prescription.getAddress();
  console.log("✅ PrescriptionManager:", rxAddr);

  const HospitalServices = await hre.ethers.getContractFactory("HospitalServices");
  const hospital = await HospitalServices.deploy(drAddr, ptAddr, insAddr);
  await hospital.waitForDeployment();
  const hospAddr = await hospital.getAddress();
  console.log("✅ HospitalServices:", hospAddr);

  // --- STAGE 3: INFRASTRUCTURE & ACCESS ---
  const AccessRequest = await hre.ethers.getContractFactory("AccessRequest");
  const access = await AccessRequest.deploy(drAddr, ptAddr);
  await access.waitForDeployment();
  const accAddr = await access.getAddress();
  console.log("✅ AccessRequest:", accAddr);

  const MedicalRecord = await hre.ethers.getContractFactory("MedicalRecord");
  const medicalRecord = await MedicalRecord.deploy(drAddr, ptAddr, accAddr);
  await medicalRecord.waitForDeployment();
  const medAddr = await medicalRecord.getAddress();
  console.log("✅ MedicalRecord:", medAddr);

  const EmergencyProtocol = await hre.ethers.getContractFactory("EmergencyProtocol");
  const emergency = await EmergencyProtocol.deploy(drAddr);
  await emergency.waitForDeployment();
  const emAddr = await emergency.getAddress();
  console.log("✅ EmergencyProtocol:", emAddr);

  const Insurance = await hre.ethers.getContractFactory("Insurance");
  const insurance = await Insurance.deploy(ptAddr, insAddr);
  await insurance.waitForDeployment();
  const insuranceAddr = await insurance.getAddress();
  console.log("✅ Insurance:", insuranceAddr);

  const BillingContract = await hre.ethers.getContractFactory("BillingContract");
  const billing = await BillingContract.deploy(drAddr, ptAddr);
  await billing.waitForDeployment();
  const billAddr = await billing.getAddress();
  console.log("✅ BillingContract:", billAddr);

  const RegulatoryLedger = await hre.ethers.getContractFactory("RegulatoryLedger");
  const regulatoryLedger = await RegulatoryLedger.deploy(drAddr);
  await regulatoryLedger.waitForDeployment();
  const regLedgerAddr = await regulatoryLedger.getAddress();
  console.log("✅ RegulatoryLedger:", regLedgerAddr);

  // ─────────────────────────────────────────────
  // AUTO-UPDATE backend/.env
  // ─────────────────────────────────────────────
  const backendEnvPath = path.resolve(__dirname, "../../backend/.env");

  if (fs.existsSync(backendEnvPath)) {
    let envContent = fs.readFileSync(backendEnvPath, "utf8");

    const replacements = {
      PATIENT_REGISTRY_ADDR: ptAddr,
      DOCTOR_REGISTRY_ADDR:  drAddr,
      INSURANCE_ADDR:        insuranceAddr,
      TELEMEDICINE_ADDR:     teleAddr,
      EMERGENCY_PROTOCOL_ADDR: emAddr,
      REGULATORY_LEDGER_ADDR:  regLedgerAddr,
      MEDICAL_RECORD_ADDR:     medAddr,
    };

    for (const [key, value] of Object.entries(replacements)) {
      envContent = envContent.replace(
        new RegExp(`^${key}=.*$`, "m"),
        `${key}=${value}`
      );
    }

    fs.writeFileSync(backendEnvPath, envContent, "utf8");
    console.log("\n✅ backend/.env auto-updated with new contract addresses.");
  } else {
    console.warn("\n⚠️  backend/.env not found — skipping auto-update.");
  }

  // ─────────────────────────────────────────────
  // AUTO-UPDATE frontend/.env.local
  // ─────────────────────────────────────────────
  const frontendEnvPath = path.resolve(__dirname, "../../frontend/.env.local");

  if (fs.existsSync(frontendEnvPath)) {
    let feContent = fs.readFileSync(frontendEnvPath, "utf8");

    const feReplacements = {
      NEXT_PUBLIC_TELEMEDICINE:    teleAddr,
      NEXT_PUBLIC_PRESCRIPTION:    rxAddr,
      NEXT_PUBLIC_DOCTOR_REGISTRY: drAddr,
    };

    for (const [key, value] of Object.entries(feReplacements)) {
      feContent = feContent.replace(
        new RegExp(`^${key}=.*$`, "m"),
        `${key}=${value}`
      );
    }

    fs.writeFileSync(frontendEnvPath, feContent, "utf8");
    console.log("✅ frontend/.env.local auto-updated with new contract addresses.");
  } else {
    console.warn("⚠️  frontend/.env.local not found — skipping auto-update.");
  }

  console.log("\n🎉 All contracts deployed and .env files updated. Restart backend to apply.\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});