const hre = require("hardhat");

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
  // Many of these require the registries to verify permissions
  const Telemedicine = await hre.ethers.getContractFactory("Telemedicine");
  const telemedicine = await Telemedicine.deploy(drAddr, ptAddr); // Passing Doctor and Patient Registries
  await telemedicine.waitForDeployment();
  const teleAddr = await telemedicine.getAddress();
  console.log("✅ Telemedicine:", teleAddr);

  const PrescriptionManager = await hre.ethers.getContractFactory("PrescriptionManager");
  const prescription = await PrescriptionManager.deploy(teleAddr); // Passing Telemedicine Address
  await telemedicine.waitForDeployment();
  const rxAddr = await prescription.getAddress();
  console.log("✅ PrescriptionManager:", rxAddr);

  const HospitalServices = await hre.ethers.getContractFactory("HospitalServices");
  const hospital = await HospitalServices.deploy(drAddr, ptAddr, insAddr); // Passing Doctor, Patient, and Insurer Registries
  await hospital.waitForDeployment();
  const hospAddr = await hospital.getAddress();
  console.log("✅ HospitalServices:", hospAddr);

  // --- STAGE 3: INFRASTRUCTURE & ACCESS ---
  const AccessRequest = await hre.ethers.getContractFactory("AccessRequest");
  const access = await AccessRequest.deploy(drAddr, ptAddr); // Passing Doctor and Patient Registries
  await access.waitForDeployment();
  const accAddr = await access.getAddress();
  console.log("✅ AccessRequest:", accAddr);

  const MedicalRecord = await hre.ethers.getContractFactory("MedicalRecord");
  const medicalRecord = await MedicalRecord.deploy(drAddr, ptAddr, accAddr); // Passing Doctor Registry, Patient Registry, and AccessRequest Address
  await medicalRecord.waitForDeployment();
  const medAddr = await medicalRecord.getAddress();
  console.log("✅ MedicalRecord:", medAddr);

  const EmergencyProtocol = await hre.ethers.getContractFactory("EmergencyProtocol");
  const emergency = await EmergencyProtocol.deploy(drAddr);
  await emergency.waitForDeployment();
  const emAddr = await emergency.getAddress();
  console.log("✅ EmergencyProtocol:", emAddr);

  const Insurance = await hre.ethers.getContractFactory("Insurance");
  const insurance = await Insurance.deploy(ptAddr, insAddr); // Passing Patient and Insurer Registries
  await insurance.waitForDeployment();
  const insuranceAddr = await insurance.getAddress();
  console.log("✅ Insurance:", insuranceAddr);

  const BillingContract = await hre.ethers.getContractFactory("BillingContract");
  const billing = await BillingContract.deploy(drAddr, ptAddr); // Passing Doctor and Patient Registries
  await billing.waitForDeployment();
  const billAddr = await billing.getAddress();
  console.log("✅ BillingContract:", billAddr);

  console.log("\n--- UPDATED BACKEND .env VALUES ---");
  console.log(`PATIENT_REGISTRY_ADDR=${ptAddr}`);
  console.log(`DOCTOR_REGISTRY_ADDR=${drAddr}`);
  console.log(`INSURANCE_ADDR=${insuranceAddr}`);
  console.log(`TELEMEDICINE_ADDR=${teleAddr}`);
  console.log(`EMERGENCY_PROTOCOL_ADDR=${emAddr}`);

  console.log("\n--- UPDATED FRONTEND .env VALUES ---");
  console.log(`NEXT_PUBLIC_TELEMEDICINE=${teleAddr}`);
  console.log(`NEXT_PUBLIC_PRESCRIPTION=${rxAddr}`);
  console.log(`NEXT_PUBLIC_DOCTOR_REGISTRY=${drAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});