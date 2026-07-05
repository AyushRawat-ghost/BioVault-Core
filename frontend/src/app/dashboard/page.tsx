"use client";

import React, { useState, useEffect } from "react";
import { Heart, Activity, Thermometer, ShieldAlert, Award, FileText, Download, LogOut, RefreshCw, User, Calendar, Cpu, Pill, ShieldCheck, CheckCircle } from "lucide-react";

interface VitalsLog {
  heart_rate: number;
  systolic: number;
  diastolic: number;
  spo2: number;
  temperature: number;
  anomaly_detected: boolean;
  warning: string;
  created_at: string;
}

interface PatientProfile {
  address: string;
  name: string;
  dob: string;
  blood_group: string;
  allergies: string;
  emergency_contact: string;
  avatar_url: string;
  is_profile_empty: boolean;
}

interface MedicalRecord {
  id: number;
  diagnosis: string;
  doctor: string;
  date: string;
  document_type: string;
  download_url: string;
}

interface DoctorInfo {
  address: string;
  name: string;
  specialization: string;
}

interface Appointment {
  id: number;
  doctor_address: string;
  appointment_date: string;
  appointment_time: string;
  reason: string;
  status: string;
  doctor_name: string;
  specialization: string;
}

interface Implant {
  serial_number: string;
  device_name: string;
  manufacturer: string;
  implanted_at: string;
  status: string;
  surgeon_name: string;
  battery_life: number;
}

interface RxItem {
  id: number;
  drug_name: string;
  dosage: string;
  prescriber: string;
  date: string;
  type: string;
  status: string;
}

interface Claim {
  id: number;
  claim_id: number | null;
  insurer_address: string;
  amount_requested: number;
  amount_approved: number;
  status: string;
  claim_cid: string;
  date: string;
}

interface InsuranceData {
  provider: string;
  policy_number: string;
  limit: number;
  status: string;
  claims: Claim[];
}

export default function PatientDashboard() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<VitalsLog[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  
  // Tab Management
  const [activeTab, setActiveTab] = useState<"dashboard" | "records" | "appointments" | "care" | "insurance">("dashboard");
  
  // Sub-tab Management
  const [careSubTab, setCareSubTab] = useState<"implants" | "prescriptions">("implants");
  const [insuranceSubTab, setInsuranceSubTab] = useState<"claiming" | "viewing" | "editing">("claiming");

  // New modules states
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [implants, setImplants] = useState<Implant[]>([]);
  const [prescriptions, setPrescriptions] = useState<RxItem[]>([]);
  const [insurance, setInsurance] = useState<InsuranceData | null>(null);

  // Booking Form Inputs
  const [bookingDoctor, setBookingDoctor] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>("");
  const [bookingTime, setBookingTime] = useState<string>("");
  const [bookingReason, setBookingReason] = useState<string>("");
  const [bookingSuccess, setBookingSuccess] = useState<string>("");
  const [bookingError, setBookingError] = useState<string>("");

  // Claim Filing Form Inputs
  const [claimInsurer, setClaimInsurer] = useState<string>("");
  const [claimAmount, setClaimAmount] = useState<string>("");
  const [claimCID, setClaimCID] = useState<string>("");
  const [claimSuccess, setClaimSuccess] = useState<string>("");
  const [claimError, setClaimError] = useState<string>("");

  // Claim Editing Form Inputs
  const [editClaimId, setEditClaimId] = useState<string>("");
  const [editClaimAmount, setEditClaimAmount] = useState<string>("");
  const [editClaimCID, setEditClaimCID] = useState<string>("");
  const [editSuccess, setEditSuccess] = useState<string>("");
  const [editError, setEditError] = useState<string>("");

  const [selectedMetric, setSelectedMetric] = useState<"heart_rate" | "spo2" | "temperature" | "blood_pressure">("heart_rate");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    // 1. Session Verification
    const cachedAddress = localStorage.getItem("aeth_wallet");
    const cachedToken = localStorage.getItem("aeth_session");
    if (!cachedAddress || !cachedToken) {
      window.location.href = "/";
      return;
    }
    setWalletAddress(cachedAddress);

    // 2. Fetch Profile & Tab Data
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        // Fetch Profile
        const profileResp = await fetch(`${API_URL}/api/patient/profile?address=${cachedAddress}`);
        if (profileResp.ok) {
          const profileData = await profileResp.json();
          setProfile(profileData);
        }

        // Fetch Doctors for Booking Dropdown
        const doctorsResp = await fetch(`${API_URL}/api/admin/doctors`);
        if (doctorsResp.ok) {
          const doctorsData = await doctorsResp.json();
          setDoctors(doctorsData);
        }

        // Fetch Vitals History
        await refreshVitals(cachedAddress);

        // Fetch other tab logs
        await refreshRecords(cachedAddress);
        await refreshAppointments(cachedAddress);
        await refreshImplants(cachedAddress);
        await refreshPrescriptions(cachedAddress);
        await refreshInsurance(cachedAddress);

      } catch (err) {
        console.error("Dashboard data load failure:", err);
        setError("Network sync failure. Check if Go Gateway is online.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();

    // 3. Vitals Polling
    const interval = setInterval(() => {
      refreshVitals(cachedAddress);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const refreshVitals = async (address: string) => {
    try {
      const vitalsResp = await fetch(`${API_URL}/api/vitals/history?address=${address}`);
      if (vitalsResp.ok) {
        const vitalsData = await vitalsResp.json();
        setVitalsHistory(vitalsData);
      }
    } catch (e) {
      console.log("Vitals poll failure:", e);
    }
  };

  const refreshRecords = async (address: string) => {
    try {
      const recordsResp = await fetch(`${API_URL}/api/records/list?address=${address}`);
      if (recordsResp.ok) {
        const recordsData = await recordsResp.json();
        setRecords(recordsData);
      }
    } catch (e) {
      console.log("Records load failure:", e);
    }
  };

  const refreshAppointments = async (address: string) => {
    try {
      const resp = await fetch(`${API_URL}/api/patient/appointments?address=${address}`);
      if (resp.ok) {
        const data = await resp.json();
        setAppointments(data);
      }
    } catch (e) {
      console.log("Appointments load failure:", e);
    }
  };

  const refreshImplants = async (address: string) => {
    try {
      const resp = await fetch(`${API_URL}/api/patient/implants?address=${address}`);
      if (resp.ok) {
        const data = await resp.json();
        setImplants(data);
      }
    } catch (e) {
      console.log("Implants load failure:", e);
    }
  };

  const refreshPrescriptions = async (address: string) => {
    try {
      const resp = await fetch(`${API_URL}/api/patient/prescriptions?address=${address}`);
      if (resp.ok) {
        const data = await resp.json();
        setPrescriptions(data);
      }
    } catch (e) {
      console.log("Prescriptions load failure:", e);
    }
  };

  const refreshInsurance = async (address: string) => {
    try {
      const resp = await fetch(`${API_URL}/api/patient/insurance?address=${address}`);
      if (resp.ok) {
        const data = await resp.json();
        setInsurance(data);
      }
    } catch (e) {
      console.log("Insurance load failure:", e);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSuccess("");
    setBookingError("");

    if (!bookingDoctor || !bookingDate || !bookingTime || !bookingReason) {
      setBookingError("Please complete all fields.");
      return;
    }

    try {
      const resp = await fetch(`${API_URL}/api/patient/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_address: walletAddress,
          doctor_address: bookingDoctor,
          appointment_date: bookingDate,
          appointment_time: bookingTime,
          reason: bookingReason
        })
      });

      if (resp.ok) {
        setBookingSuccess("Your consultation has been scheduled successfully!");
        setBookingDoctor("");
        setBookingDate("");
        setBookingTime("");
        setBookingReason("");
        await refreshAppointments(walletAddress);
      } else {
        const errData = await resp.json();
        setBookingError(errData.error || "Failed to book appointment.");
      }
    } catch (err) {
      setBookingError("Server connection error.");
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimSuccess("");
    setClaimError("");

    if (!claimInsurer || !claimAmount) {
      setClaimError("Insurer and Amount requested are required.");
      return;
    }

    try {
      const resp = await fetch(`${API_URL}/api/patient/insurance/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_address: walletAddress,
          insurer_address: claimInsurer,
          amount_requested: parseFloat(claimAmount),
          claim_cid: claimCID || "ipfs://placeholder-claim-data",
          claim_id: Math.floor(Math.random() * 1000) + 1
        })
      });

      if (resp.ok) {
        setClaimSuccess("Insurance claim logged successfully and pending review.");
        setClaimInsurer("");
        setClaimAmount("");
        setClaimCID("");
        await refreshInsurance(walletAddress);
      } else {
        const errData = await resp.json();
        setClaimError(errData.error || "Failed to submit claim.");
      }
    } catch (err) {
      setClaimError("Server connection error.");
    }
  };

  const handleSelectEditClaim = (claimIdStr: string) => {
    setEditClaimId(claimIdStr);
    setEditSuccess("");
    setEditError("");

    if (!claimIdStr || !insurance) {
      setEditClaimAmount("");
      setEditClaimCID("");
      return;
    }

    const claim = insurance.claims.find(c => c.id.toString() === claimIdStr);
    if (claim) {
      setEditClaimAmount(claim.amount_requested.toString());
      setEditClaimCID(claim.claim_cid);
    }
  };

  const handleUpdateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSuccess("");
    setEditError("");

    if (!editClaimId || !editClaimAmount) {
      setEditError("Please select a claim and specify the amount.");
      return;
    }

    try {
      const resp = await fetch(`${API_URL}/api/patient/insurance/claim/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: parseInt(editClaimId),
          amount_requested: parseFloat(editClaimAmount),
          claim_cid: editClaimCID || "ipfs://placeholder-claim-data"
        })
      });

      if (resp.ok) {
        setEditSuccess("Claim details updated successfully!");
        await refreshInsurance(walletAddress);
      } else {
        const errData = await resp.json();
        setEditError(errData.error || "Failed to update claim.");
      }
    } catch (err) {
      setEditError("Server connection error.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("aeth_wallet");
    localStorage.removeItem("aeth_session");
    localStorage.removeItem("aeth_is_patient");
    localStorage.removeItem("aeth_is_admin");
    localStorage.removeItem("aeth_is_doctor");
    window.location.href = "/";
  };

  const getLatestVital = (): VitalsLog => {
    if (vitalsHistory.length > 0) {
      return vitalsHistory[0];
    }
    return {
      heart_rate: 75,
      systolic: 120,
      diastolic: 80,
      spo2: 98,
      temperature: 36.8,
      anomaly_detected: false,
      warning: "Nominal",
      created_at: new Date().toISOString()
    };
  };

  const latest = getLatestVital();

  const renderSVGChart = () => {
    if (vitalsHistory.length < 2) {
      return (
        <svg className="w-full h-48 text-white/50 animate-pulse" viewBox="0 0 100 100" preserveAspectRatio="none">
          <text x="50" y="50" fill="currentColor" textAnchor="middle" fontSize="5">Awaiting telemetry packets...</text>
        </svg>
      );
    }

    const width = 600;
    const height = 240;
    const padding = 20;

    const points = [...vitalsHistory].slice(0, 15).reverse();
    
    let values: number[] = [];
    if (selectedMetric === "heart_rate") {
      values = points.map(p => p.heart_rate);
    } else if (selectedMetric === "spo2") {
      values = points.map(p => p.spo2);
    } else if (selectedMetric === "temperature") {
      values = points.map(p => p.temperature);
    } else if (selectedMetric === "blood_pressure") {
      values = points.map(p => p.systolic);
    }

    const maxVal = Math.max(...values, selectedMetric === "spo2" ? 100 : 120) * 1.1;
    const minVal = Math.min(...values, selectedMetric === "temperature" ? 35 : 50) * 0.9;
    const range = maxVal - minVal;

    const coords = points.map((p, idx) => {
      const val = selectedMetric === "heart_rate" ? p.heart_rate 
                : selectedMetric === "spo2" ? p.spo2 
                : selectedMetric === "temperature" ? p.temperature 
                : p.systolic;
      
      const x = padding + (idx * (width - 2 * padding) / (points.length - 1));
      const y = height - padding - ((val - minVal) * (height - 2 * padding) / range);
      return `${x},${y}`;
    });

    const pathData = `M ${coords.join(" L ")}`;

    return (
      <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f3ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00f3ff" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#ffffff25" strokeDasharray="3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#ffffff25" strokeDasharray="3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ffffff25" />

        {coords.length > 0 && (
          <path
            d={`${pathData} L ${padding + (points.length - 1) * (width - 2 * padding) / (points.length - 1)},${height - padding} L ${padding},${height - padding} Z`}
            fill="url(#chartGradient)"
          />
        )}
        
        <path d={pathData} fill="none" stroke="#00f3ff" strokeWidth="2.5" className="drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]" />

        {coords.map((c, idx) => {
          const [x, y] = c.split(",");
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="5"
              fill="#ff00ff"
              className="cursor-pointer hover:r-7 transition-all"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-rajdhani flex flex-col md:flex-row overflow-x-hidden">
      
      {/* Left Side Navigation Panel - Far Left, Docked Edge-To-Edge (Matches Admin Panel layout) */}
      <aside className="w-full md:w-80 bg-black/95 md:h-screen border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between shrink-0 sticky top-0 z-50">
        
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo and Branding Header */}
          <div className="p-6 border-b border-white/10 flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyber-pink animate-pulse" />
              <span className="font-orbitron text-lg font-black tracking-widest text-cyber-blue">
                ALTERIS <span className="text-cyber-pink">OS</span>
              </span>
            </div>
            <div className="text-[10px] font-orbitron uppercase text-cyber-pink font-black tracking-wider bg-cyber-pink/5 border border-cyber-pink/20 px-2.5 py-1 rounded w-fit">
              PATIENT INTERFACE
            </div>
          </div>

          {/* Profile Welcome Detail */}
          {profile && (
            <div className="p-6 border-b border-white/10 flex items-center gap-3 shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-14 h-14 rounded-full border border-cyber-pink object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full border border-dashed border-white/20 flex items-center justify-center text-white/40 shrink-0">
                  <User size={24} />
                </div>
              )}
              <div className="truncate">
                <div className="text-[9px] uppercase tracking-widest text-white/40 font-orbitron font-bold">Welcome Patient</div>
                <h4 className="font-bold text-sm text-white truncate font-orbitron">{profile.name || "Initializing..."}</h4>
              </div>
            </div>
          )}

          {/* Sidebar Navigation Options */}
          <nav className="flex-1 p-4 space-y-2 font-orbitron font-bold text-xs">
            <div className="pb-1 text-[10px] font-orbitron uppercase text-white/40 tracking-widest font-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-blue" />
              <span>System Workspaces</span>
            </div>

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "dashboard" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
            >
              <Activity size={15} />
              <span>Dashboard</span>
            </button>
            
            <button
              onClick={() => setActiveTab("records")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "records" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
            >
              <FileText size={15} />
              <span>Clinical Vault</span>
            </button>

            <button
              onClick={() => setActiveTab("appointments")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "appointments" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
            >
              <Calendar size={15} />
              <span>Consultations</span>
            </button>

            <button
              onClick={() => setActiveTab("care")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "care" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
            >
              <Cpu size={15} />
              <span>Clinical Care & Assets</span>
            </button>

            <button
              onClick={() => setActiveTab("insurance")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "insurance" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
            >
              <ShieldCheck size={15} />
              <span>Insurance Management</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Panel */}
        <div className="p-4 border-t border-white/10 space-y-3 shrink-0">
          <div className="font-mono text-[9px] text-white/60 bg-white/5 px-3 py-2 border border-white/10 rounded break-all select-all">
            {walletAddress}
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full border border-white/30 hover:border-red-500/50 hover:text-red-400 py-3 rounded transition-all flex items-center justify-center gap-2 text-xs font-orbitron uppercase tracking-widest cursor-pointer text-white font-black"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Right Area - Covers entire rest of page, fluid full-width */}
      <main className="flex-1 p-6 sm:p-10 space-y-8 overflow-y-auto w-full">
        
        {/* Dashboard Tab Content */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 w-full">
            
            {/* Profile Overview Banner - Full Width */}
            {profile && (
              <div className="p-8 border border-white/10 bg-white/[0.01] backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative w-full">
                <div className="absolute left-0 top-0 h-full w-[4px] bg-cyber-blue" />
                
                <div className="flex items-center gap-5">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="w-20 h-20 rounded-full border-2 border-cyber-blue object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/50 shrink-0">
                      <User size={36} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="text-xs uppercase tracking-widest text-cyber-blue font-orbitron font-bold">Patient Portal Greeting</div>
                    <h2 className="text-4xl font-extrabold tracking-tight text-white font-orbitron">{profile.name || "Initializing..."}</h2>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-6 text-sm font-mono">
                  <div className="bg-white/5 px-4 py-2 border border-white/10 rounded">
                    <span className="text-white/50">Blood Group:</span> <span className="text-cyber-pink font-extrabold">{profile.blood_group || "N/A"}</span>
                  </div>
                  <div className="bg-white/5 px-4 py-2 border border-white/10 rounded">
                    <span className="text-white/50">DOB:</span> <span className="text-white font-bold">{profile.dob || "Pending"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Vitals Telemetry Visualizer */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 w-full">
              
              {/* Visualizer SVG Line Chart */}
              <div className="xl:col-span-2 p-8 border border-white/10 bg-white/[0.01] flex flex-col justify-between h-[450px] relative w-full">
                <div className="absolute top-0 left-0 w-12 h-[2px] bg-cyber-blue" />
                <div className="absolute top-0 left-0 w-[2px] h-12 bg-cyber-blue" />
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Activity className="text-cyber-blue animate-pulse" size={20} />
                    <span className="font-orbitron text-sm tracking-widest uppercase text-white font-extrabold">Vitals Telemetry streaming</span>
                  </div>
                  
                  <div className="flex gap-2.5 text-xs font-orbitron font-bold">
                    <button
                      onClick={() => setSelectedMetric("heart_rate")}
                      className={`px-4 py-2 border transition-all cursor-pointer ${selectedMetric === "heart_rate" ? "bg-cyber-blue text-black border-cyber-blue" : "border-white/20 hover:border-white/50 text-white"}`}
                    >
                      PULSE
                    </button>
                    <button
                      onClick={() => setSelectedMetric("spo2")}
                      className={`px-4 py-2 border transition-all cursor-pointer ${selectedMetric === "spo2" ? "bg-cyber-blue text-black border-cyber-blue" : "border-white/20 hover:border-white/50 text-white"}`}
                    >
                      SPO2
                    </button>
                    <button
                      onClick={() => setSelectedMetric("temperature")}
                      className={`px-4 py-2 border transition-all cursor-pointer ${selectedMetric === "temperature" ? "bg-cyber-blue text-black border-cyber-blue" : "border-white/20 hover:border-white/50 text-white"}`}
                    >
                      TEMP
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full bg-black/60 relative border border-white/5 py-4">
                  {renderSVGChart()}
                </div>
                
                <div className="text-xs font-mono text-white/40 mt-4 text-right">
                  Syncing bio-telemetry wearables on localhost...
                </div>
              </div>

              {/* Individual Vitals Values */}
              <div className="grid grid-cols-2 gap-6 h-full w-full">
                
                <div className={`p-6 border flex flex-col justify-between rounded transition-all relative ${latest.anomaly_detected && latest.heart_rate > 130 ? "border-red-500/50 bg-red-950/20 animate-pulse" : "border-white/10 bg-white/[0.01]"}`}>
                  <div className="flex justify-between items-start">
                    <Heart size={28} className={latest.anomaly_detected && latest.heart_rate > 130 ? "text-red-500 animate-pulse" : "text-cyber-pink"} />
                    <span className="text-xs font-orbitron tracking-wider text-white/50 font-bold uppercase">Pulse</span>
                  </div>
                  <div className="space-y-1 mt-4">
                    <div className="text-6xl font-extrabold tracking-tight">{latest.heart_rate} <span className="text-sm text-white/70 font-normal">BPM</span></div>
                    <div className="text-xs font-mono uppercase tracking-wider text-white/40">Target: 60-100</div>
                  </div>
                </div>

                <div className={`p-6 border flex flex-col justify-between rounded transition-all relative ${latest.anomaly_detected && latest.spo2 < 90 ? "border-red-500/50 bg-red-950/20 animate-pulse" : "border-white/10 bg-white/[0.01]"}`}>
                  <div className="flex justify-between items-start">
                    <Activity size={28} className={latest.anomaly_detected && latest.spo2 < 90 ? "text-red-500 animate-pulse" : "text-cyber-blue"} />
                    <span className="text-xs font-orbitron tracking-wider text-white/50 font-bold uppercase">Oxygen</span>
                  </div>
                  <div className="space-y-1 mt-4">
                    <div className="text-6xl font-extrabold tracking-tight">{latest.spo2}%</div>
                    <div className="text-xs font-mono uppercase tracking-wider text-white/40">Target: 95-100%</div>
                  </div>
                </div>

                <div className={`p-6 border flex flex-col justify-between rounded transition-all relative ${latest.anomaly_detected && (latest.systolic > 180 || latest.diastolic > 120) ? "border-red-500/50 bg-red-950/20 animate-pulse" : "border-white/10 bg-white/[0.01]"}`}>
                  <div className="flex justify-between items-start">
                    <Award size={28} className={latest.anomaly_detected && (latest.systolic > 180 || latest.diastolic > 120) ? "text-red-500 animate-pulse" : "text-cyber-yellow"} />
                    <span className="text-xs font-orbitron tracking-wider text-white/50 font-bold uppercase">Pressure</span>
                  </div>
                  <div className="space-y-1 mt-4">
                    <div className="text-5xl font-extrabold tracking-tight">{latest.systolic}/{latest.diastolic}</div>
                    <div className="text-xs font-mono uppercase tracking-wider text-white/40">Target: 120/80</div>
                  </div>
                </div>

                <div className={`p-6 border flex flex-col justify-between rounded transition-all relative ${latest.anomaly_detected && (latest.temperature > 39.5) ? "border-red-500/50 bg-red-950/20 animate-pulse" : "border-white/10 bg-white/[0.01]"}`}>
                  <div className="flex justify-between items-start">
                    <Thermometer size={28} className={latest.anomaly_detected && (latest.temperature > 39.5) ? "text-red-500 animate-pulse" : "text-cyber-blue"} />
                    <span className="text-xs font-orbitron tracking-wider text-white/50 font-bold uppercase">Temp</span>
                  </div>
                  <div className="space-y-1 mt-4">
                    <div className="text-6xl font-extrabold tracking-tight">{latest.temperature}°C</div>
                    <div className="text-xs font-mono uppercase tracking-wider text-white/40">Target: 36.5 - 37.3</div>
                  </div>
                </div>

              </div>
            </div>

            {latest.anomaly_detected && (
              <div className="p-5 border border-red-500/30 bg-red-950/10 text-red-400 text-sm flex items-start sm:items-center gap-4 relative animate-pulse shrink-0 w-full">
                <div className="absolute left-0 top-0 h-full w-[4px] bg-red-500" />
                <ShieldAlert size={24} className="shrink-0" />
                <div className="space-y-1">
                  <div className="font-orbitron font-extrabold uppercase tracking-wider text-xs">ML Anomalous Bio-Envelope Event Triggered</div>
                  <div className="font-mono text-white font-bold text-sm">{latest.warning || "Vitals outside safe clinical envelope detected."}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clinical Vault Tab Content */}
        {activeTab === "records" && (
          <div className="p-8 border border-white/10 bg-white/[0.01] relative rounded w-full">
            <div className="absolute top-0 left-0 w-12 h-[2px] bg-cyber-pink" />
            <div className="absolute top-0 left-0 w-[2px] h-12 bg-cyber-pink" />

            <div className="flex items-center gap-3 mb-8">
              <FileText className="text-cyber-pink" size={20} />
              <h3 className="font-orbitron text-sm tracking-widest uppercase text-white font-extrabold">On-Chain Clinical Records Vault</h3>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-white/60 pb-3 uppercase tracking-wider text-xs">
                    <th className="py-4 px-3">Document Description</th>
                    <th className="py-4 px-3">Type</th>
                    <th className="py-4 px-3">Issuing Doctor</th>
                    <th className="py-4 px-3">Date Added</th>
                    <th className="py-4 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-5 px-3 font-semibold text-white text-base">{rec.diagnosis}</td>
                      <td className="py-5 px-3 text-white">
                        <span className="px-3 py-1 bg-white/5 border border-white/10 text-xs rounded uppercase font-orbitron font-bold">
                          {rec.document_type || "Report"}
                        </span>
                      </td>
                      <td className="py-5 px-3 text-white text-sm">{rec.doctor}</td>
                      <td className="py-5 px-3 text-white text-sm">{rec.date}</td>
                      <td className="py-5 px-3 text-right">
                        <a
                          href={rec.download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 bg-cyber-pink/10 hover:bg-cyber-pink text-cyber-pink hover:text-black border border-cyber-pink/30 px-5 py-3 text-xs font-orbitron uppercase tracking-widest transition-all cursor-pointer font-bold rounded"
                        >
                          <Download size={12} />
                          Download PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-white/50 text-sm">No clinical reports archived in your S3 vault yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Consultations Tab Content */}
        {activeTab === "appointments" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 w-full">
            
            {/* Booking Form Card */}
            <div className="xl:col-span-1 p-8 border border-white/10 bg-white/[0.01] rounded relative h-fit w-full">
              <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
              <div className="absolute top-0 left-0 w-[2px] h-12 bg-cyber-blue" />
              
              <h4 className="font-orbitron text-sm text-white font-extrabold flex items-center gap-2 mb-6 uppercase tracking-widest">
                <Calendar size={18} className="text-cyber-blue" />
                <span>Book Consultation</span>
              </h4>

              <form onSubmit={handleBookAppointment} className="space-y-5 text-sm">
                <div>
                  <label className="block text-xs uppercase font-extrabold text-white/60 font-orbitron mb-2">Select Physician</label>
                  <select
                    value={bookingDoctor}
                    onChange={(e) => setBookingDoctor(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3.5 text-sm rounded focus:outline-none focus:border-cyber-blue text-white"
                  >
                    <option value="">-- Choose Doctor --</option>
                    {doctors.map((d) => (
                      <option key={d.address} value={d.address}>
                        {d.name} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase font-extrabold text-white/60 font-orbitron mb-2">Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3.5 text-sm rounded focus:outline-none focus:border-cyber-blue text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-extrabold text-white/60 font-orbitron mb-2">Time Slot</label>
                  <input
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3.5 text-sm rounded focus:outline-none focus:border-cyber-blue text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-extrabold text-white/60 font-orbitron mb-2">Consultation Reason</label>
                  <textarea
                    value={bookingReason}
                    onChange={(e) => setBookingReason(e.target.value)}
                    placeholder="Symptoms or follow-up details..."
                    rows={4}
                    className="w-full bg-black border border-white/20 p-3.5 text-sm rounded focus:outline-none focus:border-cyber-blue text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyber-blue hover:bg-cyber-blue/80 text-black font-orbitron py-3.5 text-sm font-bold uppercase tracking-widest transition-all cursor-pointer rounded"
                >
                  Confirm Booking
                </button>
              </form>

              {bookingSuccess && (
                <div className="mt-5 p-3 bg-green-950/20 border border-green-500/30 text-green-400 text-sm rounded font-mono">
                  {bookingSuccess}
                </div>
              )}
              {bookingError && (
                <div className="mt-5 p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-sm rounded font-mono">
                  {bookingError}
                </div>
              )}
            </div>

            {/* Booking History Ledger */}
            <div className="xl:col-span-2 p-8 border border-white/10 bg-white/[0.01] rounded relative w-full">
              <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-pink" />
              <div className="absolute top-0 left-0 w-[2px] h-12 bg-cyber-pink" />

              <h4 className="font-orbitron text-sm text-white font-extrabold flex items-center gap-2 mb-6 uppercase tracking-widest">
                <Activity size={18} className="text-cyber-pink" />
                <span>Scheduled Consultations</span>
              </h4>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-white/60 pb-3 uppercase tracking-wider text-xs">
                      <th className="py-3">Physician</th>
                      <th className="py-3">Specialization</th>
                      <th className="py-3">Schedule</th>
                      <th className="py-3">Reason</th>
                      <th className="py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white">
                    {appointments.map((app) => (
                      <tr key={app.id} className="hover:bg-white/[0.02]">
                        <td className="py-4 font-semibold text-base">{app.doctor_name}</td>
                        <td className="py-4 text-white/70">{app.specialization}</td>
                        <td className="py-4 text-cyber-blue font-bold">{app.appointment_date} @ {app.appointment_time}</td>
                        <td className="py-4 truncate max-w-[200px]">{app.reason}</td>
                        <td className="py-4 text-right">
                          <span className={`px-3 py-1 border text-xs rounded uppercase font-orbitron font-extrabold ${app.status === "scheduled" ? "bg-cyan-950/20 border-cyan-500/40 text-cyan-400" : "bg-white/5 border-white/10 text-white/50"}`}>
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {appointments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-white/40 text-sm">No consultations currently scheduled.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Clinical Care & Assets Tab (Umbrella for Cybernetics & Prescriptions) */}
        {activeTab === "care" && (
          <div className="space-y-6 w-full">
            
            {/* Top Sub-tab Navigation */}
            <div className="flex border-b border-white/10 pb-4 gap-4 font-orbitron font-bold text-sm shrink-0">
              <button
                onClick={() => setCareSubTab("implants")}
                className={`px-6 py-3 border rounded transition-all cursor-pointer ${careSubTab === "implants" ? "bg-cyber-blue/10 border-cyber-blue text-cyber-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                Cybernetic Implants
              </button>
              <button
                onClick={() => setCareSubTab("prescriptions")}
                className={`px-6 py-3 border rounded transition-all cursor-pointer ${careSubTab === "prescriptions" ? "bg-cyber-blue/10 border-cyber-blue text-cyber-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                Active Prescriptions
              </button>
            </div>

            {careSubTab === "implants" && (
              <div className="p-8 border border-white/10 bg-white/[0.01] relative rounded w-full">
                <div className="absolute top-0 left-0 w-12 h-[2px] bg-cyber-pink" />
                <div className="absolute top-0 left-0 w-[2px] h-12 bg-cyber-pink" />

                <div className="flex items-center gap-3 mb-8">
                  <Cpu className="text-cyber-pink" size={20} />
                  <h3 className="font-orbitron text-sm tracking-widest uppercase text-white font-extrabold">Implanted Cybernetic Assets & Telemetry</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                  {implants.map((imp) => (
                    <div key={imp.serial_number} className={`p-6 border rounded relative flex flex-col justify-between h-[250px] ${imp.status === "recalled" ? "border-red-500/50 bg-red-950/10 animate-pulse" : "border-white/10 bg-black/40"}`}>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs uppercase font-extrabold text-cyber-pink font-orbitron">{imp.manufacturer}</div>
                          <h4 className="text-xl font-bold text-white font-orbitron mt-1">{imp.device_name}</h4>
                        </div>
                        <span className={`px-3 py-1 border text-xs rounded uppercase font-orbitron font-extrabold ${imp.status === "recalled" ? "bg-red-500 text-black border-red-500" : "bg-green-950/20 border-green-500/40 text-green-400"}`}>
                          {imp.status === "recalled" ? "RECALLED" : "NOMINAL"}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm font-mono">
                        <div className="flex justify-between"><span className="text-white/50">Serial ID:</span> <span className="font-semibold text-white">{imp.serial_number}</span></div>
                        <div className="flex justify-between"><span className="text-white/50">Implantation Date:</span> <span className="text-white">{imp.implanted_at}</span></div>
                        <div className="flex justify-between"><span className="text-white/50">Surgeon:</span> <span className="text-white">{imp.surgeon_name}</span></div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-white/50">Energy Cell Level</span>
                          <span className={imp.battery_life < 20 ? "text-red-400 font-bold animate-pulse" : "text-cyber-blue font-bold"}>
                            {imp.battery_life}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <div
                            className={`h-full transition-all ${imp.battery_life < 20 ? "bg-red-500 animate-pulse" : "bg-cyber-blue"}`}
                            style={{ width: `${imp.battery_life}%` }}
                          />
                        </div>
                      </div>

                      {imp.status === "recalled" && (
                        <div className="absolute inset-0 bg-red-950/25 backdrop-blur-[1px] flex flex-col justify-center items-center text-center p-6 text-white">
                          <ShieldAlert size={44} className="text-red-500 animate-bounce" />
                          <h5 className="font-orbitron font-extrabold text-red-500 text-sm mt-3">CRITICAL DEVICE RECALL ISSUE</h5>
                          <p className="text-xs text-white/95 font-mono mt-1.5 max-w-[280px]">Please contact Alteris OS admin immediately at 911-RECALL-ALERT.</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {implants.length === 0 && (
                    <div className="col-span-2 py-10 text-center text-white/40 font-mono text-sm">No active cybernetic implants registered.</div>
                  )}
                </div>
              </div>
            )}

            {careSubTab === "prescriptions" && (
              <div className="p-8 border border-white/10 bg-white/[0.01] relative rounded w-full">
                <div className="absolute top-0 left-0 w-12 h-[2px] bg-cyber-blue" />
                <div className="absolute top-0 left-0 w-[2px] h-12 bg-cyber-blue" />

                <div className="flex items-center gap-3 mb-8">
                  <Pill className="text-cyber-blue" size={20} />
                  <h3 className="font-orbitron text-sm tracking-widest uppercase text-white font-extrabold">Active Rx & Controlled Substances Queue</h3>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-sm font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-white/60 pb-3 uppercase tracking-wider text-xs">
                        <th className="py-3">Medication / Substance</th>
                        <th className="py-3">Dosage Instructions</th>
                        <th className="py-3">Prescribing Physician</th>
                        <th className="py-3">Date Prescribed</th>
                        <th className="py-3">Classification</th>
                        <th className="py-3 text-right">Regulatory Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white">
                      {prescriptions.map((rx) => (
                        <tr key={rx.id} className="hover:bg-white/[0.02]">
                          <td className="py-4 font-semibold text-white text-base">{rx.drug_name}</td>
                          <td className="py-4 text-white/70 text-sm">{rx.dosage}</td>
                          <td className="py-4 text-white/70 text-sm">{rx.prescriber}</td>
                          <td className="py-4 text-cyber-blue text-sm">{rx.date}</td>
                          <td className="py-4">
                            <span className={`px-3 py-1 text-xs rounded font-orbitron font-extrabold border ${rx.type === "Controlled Substance" ? "bg-red-950/20 border-red-500/30 text-red-400" : "bg-white/5 border-white/10 text-white/60"}`}>
                              {rx.type}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <span className={`px-3 py-1 border text-xs rounded font-orbitron font-extrabold ${rx.status === "Authorized" ? "bg-green-950/20 border-green-500/40 text-green-400" : rx.status === "Rejected" ? "bg-red-950/20 border-red-500/40 text-red-400" : "bg-yellow-950/20 border-yellow-500/40 text-cyber-yellow animate-pulse"}`}>
                              {rx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {prescriptions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-white/40 text-sm">No active medication records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Insurance Management Tab (Split into Claiming, Viewing, and Editing sub-tabs) */}
        {activeTab === "insurance" && (
          <div className="space-y-6 w-full">
            
            {/* Policy Summary Card - Always visible at top */}
            {insurance && (
              <div className="p-6 border border-white/10 bg-white/[0.01] rounded relative w-full text-white">
                <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-pink" />
                <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-pink" />
                <div className="flex flex-col md:flex-row justify-between gap-4 font-mono text-sm items-start md:items-center">
                  <div>
                    <span className="text-xs uppercase text-white/50 block">Insurance Carrier</span>
                    <span className="text-base font-bold text-white font-orbitron">{insurance.provider}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase text-white/50 block">Policy Identification #</span>
                    <span className="text-base font-bold text-white">{insurance.policy_number}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase text-white/50 block">On-Chain Policy Cap</span>
                    <span className="text-xl font-extrabold text-cyber-blue font-orbitron">${insurance.limit.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase text-white/50 block">Coverage Status</span>
                    <span className="px-2 py-0.5 bg-green-950/20 border border-green-500/40 text-green-400 text-[10px] rounded font-orbitron font-extrabold uppercase">
                      {insurance.status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Top Sub-tab Navigation */}
            <div className="flex border-b border-white/10 pb-4 gap-4 font-orbitron font-bold text-sm shrink-0">
              <button
                onClick={() => setInsuranceSubTab("claiming")}
                className={`px-6 py-3 border rounded transition-all cursor-pointer ${insuranceSubTab === "claiming" ? "bg-cyber-blue/10 border-cyber-blue text-cyber-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                Claiming
              </button>
              <button
                onClick={() => setInsuranceSubTab("viewing")}
                className={`px-6 py-3 border rounded transition-all cursor-pointer ${insuranceSubTab === "viewing" ? "bg-cyber-blue/10 border-cyber-blue text-cyber-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                Viewing Claims
              </button>
              <button
                onClick={() => setInsuranceSubTab("editing")}
                className={`px-6 py-3 border rounded transition-all cursor-pointer ${insuranceSubTab === "editing" ? "bg-cyber-blue/10 border-cyber-blue text-cyber-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                Editing Claims
              </button>
            </div>

            {/* Sub-tab: Claiming (File Claim Form) */}
            {insuranceSubTab === "claiming" && (
              <div className="p-8 border border-white/10 bg-white/[0.01] rounded relative w-full text-white max-w-2xl">
                <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
                <div className="absolute top-0 left-0 w-[2px] h-12 bg-cyber-blue" />

                <h4 className="font-orbitron text-sm text-white font-extrabold flex items-center gap-2 mb-6 uppercase tracking-widest">
                  <Award size={18} className="text-cyber-blue" />
                  <span>File Insurance Claim</span>
                </h4>

                <form onSubmit={handleSubmitClaim} className="space-y-5">
                  <div>
                    <label className="block text-xs uppercase font-extrabold text-white/60 font-orbitron mb-2">Carrier Wallet Address</label>
                    <input
                      type="text"
                      value={claimInsurer}
                      onChange={(e) => setClaimInsurer(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-black border border-white/20 p-3.5 text-sm rounded focus:outline-none focus:border-cyber-blue text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-extrabold text-white/60 font-orbitron mb-2">Claim Amount Requested ($)</label>
                    <input
                      type="number"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value)}
                      placeholder="5000"
                      className="w-full bg-black border border-white/20 p-3.5 text-sm rounded focus:outline-none focus:border-cyber-blue text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-extrabold text-white/60 font-orbitron mb-2">Supporting Document CID (IPFS)</label>
                    <input
                      type="text"
                      value={claimCID}
                      onChange={(e) => setClaimCID(e.target.value)}
                      placeholder="ipfs://QmClaimProofDocs..."
                      className="w-full bg-black border border-white/20 p-3.5 text-sm rounded focus:outline-none focus:border-cyber-blue text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-cyber-blue hover:bg-cyber-blue/80 text-black font-orbitron py-3.5 text-sm font-bold uppercase tracking-widest transition-all cursor-pointer rounded"
                  >
                    Submit Claim SBT
                  </button>
                </form>

                {claimSuccess && (
                  <div className="mt-5 p-3 bg-green-950/20 border border-green-500/30 text-green-400 text-sm rounded font-mono">
                    {claimSuccess}
                  </div>
                )}
                {claimError && (
                  <div className="mt-5 p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-sm rounded font-mono">
                    {claimError}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab: Viewing (Claim Ledger table) */}
            {insuranceSubTab === "viewing" && (
              <div className="p-8 border border-white/10 bg-white/[0.01] rounded relative w-full text-white">
                <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-pink" />
                <div className="absolute top-0 left-0 w-[2px] h-12 bg-cyber-pink" />

                <h4 className="font-orbitron text-sm text-white font-extrabold flex items-center gap-2 mb-6 uppercase tracking-widest">
                  <Activity size={18} className="text-cyber-pink" />
                  <span>Claim History Ledger</span>
                </h4>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-sm font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-white/60 pb-3 uppercase tracking-wider text-xs">
                        <th className="py-3">Claim ID</th>
                        <th className="py-3">Date Submitted</th>
                        <th className="py-3">Carrier Address</th>
                        <th className="py-3">Requested</th>
                        <th className="py-3">Approved Payout</th>
                        <th className="py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white">
                      {insurance && insurance.claims.map((claim) => (
                        <tr key={claim.id} className="hover:bg-white/[0.02]">
                          <td className="py-4 font-semibold text-white text-base">
                            {claim.claim_id ? `Claim #${claim.claim_id}` : `Local #${claim.id}`}
                          </td>
                          <td className="py-4 text-white/70 text-sm">{claim.date.slice(0, 10)}</td>
                          <td className="py-4 text-sm truncate max-w-[150px]">{claim.insurer_address}</td>
                          <td className="py-4 font-extrabold text-cyber-blue text-base">${claim.amount_requested.toLocaleString()}</td>
                          <td className="py-4 font-extrabold text-green-400 text-base">${claim.amount_approved.toLocaleString()}</td>
                          <td className="py-4 text-right">
                            <span className={`px-3 py-1 border text-xs rounded font-orbitron font-extrabold uppercase ${claim.status === "approved" || claim.status === "Approved" ? "bg-green-950/20 border-green-500/40 text-green-400" : claim.status === "rejected" || claim.status === "Rejected" ? "bg-red-950/20 border-red-500/40 text-red-400" : "bg-yellow-950/20 border-yellow-500/40 text-cyber-yellow animate-pulse"}`}>
                              {claim.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!insurance || insurance.claims.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-white/40 text-sm">No insurance claims filed to date.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-tab: Editing (Edit Pending Claim details) */}
            {insuranceSubTab === "editing" && (
              <div className="p-8 border border-white/10 bg-white/[0.01] rounded relative w-full text-white max-w-2xl">
                <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
                <div className="absolute top-0 left-0 w-[2px] h-12 bg-cyber-blue" />

                <h4 className="font-orbitron text-sm text-white font-extrabold flex items-center gap-2 mb-6 uppercase tracking-widest">
                  <ShieldAlert size={18} className="text-cyber-blue" />
                  <span>Modify Pending Claim</span>
                </h4>

                <form onSubmit={handleUpdateClaim} className="space-y-5">
                  <div>
                    <label className="block text-xs uppercase font-extrabold text-white/60 font-orbitron mb-2">Select Pending Claim</label>
                    <select
                      value={editClaimId}
                      onChange={(e) => handleSelectEditClaim(e.target.value)}
                      className="w-full bg-black border border-white/20 p-3.5 text-sm rounded focus:outline-none focus:border-cyber-blue text-white"
                    >
                      <option value="">-- Choose Claim --</option>
                      {insurance && insurance.claims
                        .filter(c => c.status.toLowerCase() === "pending")
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            Claim ID: {c.claim_id ? `#${c.claim_id}` : `Local #${c.id}`} (${c.amount_requested.toLocaleString()}) - {c.date.slice(0,10)}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  {editClaimId && (
                    <>
                      <div>
                        <label className="block text-xs uppercase font-extrabold text-white/60 font-orbitron mb-2">Modify Claim Amount Requested ($)</label>
                        <input
                          type="number"
                          value={editClaimAmount}
                          onChange={(e) => setEditClaimAmount(e.target.value)}
                          placeholder="5000"
                          className="w-full bg-black border border-white/20 p-3.5 text-sm rounded focus:outline-none focus:border-cyber-blue text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs uppercase font-extrabold text-white/60 font-orbitron mb-2">Modify Supporting Document CID</label>
                        <input
                          type="text"
                          value={editClaimCID}
                          onChange={(e) => setEditClaimCID(e.target.value)}
                          placeholder="ipfs://QmClaimProofDocs..."
                          className="w-full bg-black border border-white/20 p-3.5 text-sm rounded focus:outline-none focus:border-cyber-blue text-white"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-cyber-blue hover:bg-cyber-blue/80 text-black font-orbitron py-3.5 text-sm font-bold uppercase tracking-widest transition-all cursor-pointer rounded"
                      >
                        Save Claim Modifications
                      </button>
                    </>
                  )}

                  {!editClaimId && (
                    <div className="text-white/40 text-sm font-mono">Select a pending claim above to begin editing. Only claims in "pending" status can be modified.</div>
                  )}
                </form>

                {editSuccess && (
                  <div className="mt-5 p-3 bg-green-950/20 border border-green-500/30 text-green-400 text-sm rounded font-mono">
                    {editSuccess}
                  </div>
                )}
                {editError && (
                  <div className="mt-5 p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-sm rounded font-mono">
                    {editError}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>

    </div>
  );
}
