const http = require("http");

const GATEWAY_URL = "http://localhost:5000";
const FALLBACK_PATIENT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

console.log("=========================================");
console.log(" ALTERIS OS: DYNAMIC IoT WEARABLE SIMULATOR");
console.log(" Discovering active patient feeds from DB...");
console.log("=========================================\n");

let activePatients = [FALLBACK_PATIENT];
let activeIntervals = {};

// Fetch the list of admitted patients from the Go backend
function fetchActivePatients() {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/patients',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let body = "";
    res.on("data", (chunk) => body += chunk);
    res.on("end", () => {
      try {
        const patients = JSON.parse(body);
        const addresses = patients.map(p => p.address.toLowerCase());
        
        if (addresses.length > 0) {
          updateStreamingPool(addresses);
        } else {
          updateStreamingPool([FALLBACK_PATIENT.toLowerCase()]);
        }
      } catch (e) {
        // Fallback if parsing fails
        updateStreamingPool([FALLBACK_PATIENT.toLowerCase()]);
      }
    });
  });

  req.on("error", (err) => {
    console.log(`[Simulator Info] Waiting for Go gateway to boot up... (Error: ${err.message})`);
    updateStreamingPool([FALLBACK_PATIENT.toLowerCase()]);
  });

  req.end();
}

function updateStreamingPool(newAddresses) {
  // 1. Remove intervals for patients that are no longer in the list
  Object.keys(activeIntervals).forEach(addr => {
    if (!newAddresses.includes(addr)) {
      clearInterval(activeIntervals[addr]);
      delete activeIntervals[addr];
      console.log(`➖ Stopped vital stream for patient: ${addr}`);
    }
  });

  // 2. Start intervals for newly discovered patients
  newAddresses.forEach(addr => {
    if (!activeIntervals[addr]) {
      console.log(`➕ Initialized dynamic telemetry stream for patient: ${addr}`);
      // Stream immediately, then every 5 seconds
      streamVitalsForAddress(addr);
      activeIntervals[addr] = setInterval(() => streamVitalsForAddress(addr), 5000);
    }
  });

  activePatients = newAddresses;
}

function generateVitals(patientAddress) {
  const generateAnomaly = Math.random() < 0.12;

  let heart_rate = Math.floor(Math.random() * (95 - 65 + 1)) + 65; // Nominal: 65-95 bpm
  let systolic = Math.floor(Math.random() * (130 - 110 + 1)) + 110; // Nominal: 110-130 mmHg
  let diastolic = Math.floor(Math.random() * (85 - 70 + 1)) + 70; // Nominal: 70-85 mmHg
  let spo2 = Math.floor(Math.random() * (100 - 95 + 1)) + 95; // Nominal: 95-100%
  let temperature = parseFloat((Math.random() * (37.3 - 36.4) + 36.4).toFixed(1)); // Nominal: 36.4 - 37.3 C

  if (generateAnomaly) {
    const anomalyType = Math.floor(Math.random() * 4);
    switch (anomalyType) {
      case 0:
        spo2 = Math.floor(Math.random() * (89 - 82 + 1)) + 82;
        console.log(`[${patientAddress.slice(0, 8)}] ⚠️  Injecting Hypoxia Anomaly...`);
        break;
      case 1:
        heart_rate = Math.floor(Math.random() * (155 - 135 + 1)) + 135;
        console.log(`[${patientAddress.slice(0, 8)}] ⚠️  Injecting Tachycardia Anomaly...`);
        break;
      case 2:
        systolic = Math.floor(Math.random() * (195 - 182 + 1)) + 182;
        diastolic = Math.floor(Math.random() * (125 - 121 + 1)) + 121;
        console.log(`[${patientAddress.slice(0, 8)}] ⚠️  Injecting Hypertensive Crisis Anomaly...`);
        break;
      case 3:
        temperature = parseFloat((Math.random() * (40.5 - 39.7) + 39.7).toFixed(1));
        console.log(`[${patientAddress.slice(0, 8)}] ⚠️  Injecting Severe Fever Anomaly...`);
        break;
    }
  }

  return {
    patient_address: patientAddress,
    heart_rate,
    systolic,
    diastolic,
    spo2,
    temperature
  };
}

function streamVitalsForAddress(patientAddress) {
  const payload = JSON.stringify(generateVitals(patientAddress));
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/vitals/stream',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    let responseBody = "";
    res.on("data", (chunk) => responseBody += chunk);
    res.on("end", () => {
      try {
        const parsed = JSON.parse(responseBody);
        const timestamp = new Date().toLocaleTimeString();
        if (parsed.anomaly_detected) {
          console.log(`[${timestamp}] 🔴 [${patientAddress.slice(0, 8)}...] ANOMALY ALERT! ML: "${parsed.warning}"`);
        } else {
          console.log(`[${timestamp}] 🟢 [${patientAddress.slice(0, 8)}...] Nominal vital signs received`);
        }
      } catch (e) {
        // Silent error
      }
    });
  });

  req.on("error", () => {
    // Silent fail if Go gateway offline
  });

  req.write(payload);
  req.end();
}

// 1. Fetch patient list immediately and start streams
fetchActivePatients();

// 2. Poll the patient registry list every 15 seconds to discover new admissions
setInterval(fetchActivePatients, 15000);
