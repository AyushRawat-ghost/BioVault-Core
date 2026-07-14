/**
 * register-all.js
 * ─────────────────────────────────────────────────────
 * Registers ALL test Hardhat accounts on-chain in one shot.
 * Run this every time after deploying contracts on a fresh node.
 *
 * Usage:
 *   npx hardhat run scripts/register-all.js --network localhost
 */

const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");

// ── Read a key from backend/.env ──────────────────────
function getEnv(key) {
  const dotenvPath = path.resolve(__dirname, "../../backend/.env");
  if (fs.existsSync(dotenvPath)) {
    for (const line of fs.readFileSync(dotenvPath, "utf8").split("\n")) {
      const [k, ...rest] = line.split("=");
      if (k && k.trim() === key) return rest.join("=").trim();
    }
  }
  return process.env[key];
}

// ── Hardhat test accounts ─────────────────────────────
// Account #0  = Admin / Deployer (0xf39Fd6...)
// Account #1  = Patient 1       (0x70997...)
// Account #2  = Doctor 1        (0x3C44C...)
// Account #3  = Patient 2       (0x90F79...)
// Account #4  = Patient 3       (0x15d34...)
// Account #5  = Doctor 2        (0x9965...)
// Account #6  = Patient 4       (0x976E...)

const PATIENTS = [
  { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", name: "Alice Vance" },
  { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", name: "Bob Mehta" },
  { address: "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65", name: "Priya Iyer" },
  { address: "0x976ea74026e726554db657fa54763abd0c3a0aa9", name: "Deepak Nair" },
];

const DOCTORS = [
  { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", name: "Dr. Robert Chen",       specialization: "Cardiology",         cid: "QmdocChenCID" },
  { address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", name: "Dr. Tejaswini Kadam",   specialization: "Neurology",          cid: "QmdocKadamCID" },
  { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", name: "System Admin Gateway",  specialization: "Administrative",    cid: "QmadminCID" },
];

async function main() {
  const patientRegistryAddr = getEnv("PATIENT_REGISTRY_ADDR");
  const doctorRegistryAddr  = getEnv("DOCTOR_REGISTRY_ADDR");

  if (!patientRegistryAddr || !doctorRegistryAddr) {
    throw new Error("Missing PATIENT_REGISTRY_ADDR or DOCTOR_REGISTRY_ADDR in backend/.env — run deploy.js first!");
  }

  console.log("═══════════════════════════════════════════════════");
  console.log("  ALTERIS OS — Bulk Registration Script");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  PatientRegistry : ${patientRegistryAddr}`);
  console.log(`  DoctorRegistry  : ${doctorRegistryAddr}`);
  console.log("───────────────────────────────────────────────────\n");

  const patientRegistry = await hre.ethers.getContractAt("PatientRegistry", patientRegistryAddr);
  const doctorRegistry  = await hre.ethers.getContractAt("DoctorRegistry",  doctorRegistryAddr);

  // ── Register Patients ─────────────────────────────
  console.log("📋 Registering Patients...");
  for (const p of PATIENTS) {
    try {
      const addr = hre.ethers.getAddress(p.address);
      const already = await patientRegistry.isPatient(addr);
      if (already) {
        console.log(`  ℹ️  [SKIP] ${p.name} (${addr.slice(0,10)}...) — already registered`);
        continue;
      }
      const tx = await patientRegistry.addPatient(addr, p.name, "ipfs://patient-profile");
      await tx.wait();
      console.log(`  ✅ ${p.name} (${addr.slice(0,10)}...) — registered`);
    } catch (e) {
      console.log(`  ❌ ${p.name} — FAILED: ${e.message}`);
    }
  }

  // ── Register Doctors ─────────────────────────────
  console.log("\n🩺 Registering Doctors...");
  for (const d of DOCTORS) {
    try {
      const addr = hre.ethers.getAddress(d.address);
      const already = await doctorRegistry.isDoctor(addr);
      if (already) {
        console.log(`  ℹ️  [SKIP] ${d.name} (${addr.slice(0,10)}...) — already registered`);
        continue;
      }
      const tx = await doctorRegistry.addDoctor(
        addr, d.name, d.specialization, "ipfs://doctor-profile", d.cid
      );
      await tx.wait();
      console.log(`  ✅ ${d.name} (${addr.slice(0,10)}...) — registered`);
    } catch (e) {
      console.log(`  ❌ ${d.name} — FAILED: ${e.message}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  ✅ Registration complete! You can log in now.");
  console.log("═══════════════════════════════════════════════════\n");
  console.log("  MetaMask private keys (Hardhat Account #0–6):");
  console.log("  #0 Admin  : 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("  #1 Patient: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  console.log("  #2 Doctor : 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
  console.log("  #5 Doctor : 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
