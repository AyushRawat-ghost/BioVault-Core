"use client";

import React, { useState, useEffect } from "react";
import { Heart, Activity, Thermometer, ShieldAlert, Award, FileText, Download, LogOut, RefreshCw, User } from "lucide-react";

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

export default function PatientDashboard() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<VitalsLog[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
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

    // 2. Fetch Profile & Initial Data
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        // Fetch Profile
        const profileResp = await fetch(`${API_URL}/api/patient/profile?address=${cachedAddress}`);
        if (profileResp.ok) {
          const profileData = await profileResp.json();
          setProfile(profileData);
        }

        // Fetch Vitals History
        await refreshVitals(cachedAddress);

        // Fetch Records
        const recordsResp = await fetch(`${API_URL}/api/records/list?address=${cachedAddress}`);
        if (recordsResp.ok) {
          const recordsData = await recordsResp.json();
          setRecords(recordsData);
        } else {
          // Mock data for initial render fallback
          setRecords([
            {
              id: 1,
              diagnosis: "Annual Cardiovascular Summary",
              doctor: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
              date: new Date().toLocaleDateString(),
              document_type: "report",
              download_url: "#"
            }
          ]);
        }
      } catch (err) {
        console.error("Dashboard data load failure:", err);
        setError("Network sync failure. Check if Go Gateway is online.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();

    // 3. Real-time Vitals Polling (Every 5 seconds)
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

  // Helper function to build dynamic SVG line charts
  const renderSVGChart = () => {
    if (vitalsHistory.length < 2) {
      return (
        <svg className="w-full h-48 text-white/50 animate-pulse" viewBox="0 0 100 100" preserveAspectRatio="none">
          <text x="50" y="50" fill="currentColor" textAnchor="middle" fontSize="5">Awaiting telemetry packets...</text>
        </svg>
      );
    }

    const width = 600;
    const height = 200;
    const padding = 20;

    // Filter points (reverse history to show chronologically left-to-right)
    const points = [...vitalsHistory].slice(0, 15).reverse();
    
    let values: number[] = [];
    if (selectedMetric === "heart_rate") {
      values = points.map(p => p.heart_rate);
    } else if (selectedMetric === "spo2") {
      values = points.map(p => p.spo2);
    } else if (selectedMetric === "temperature") {
      values = points.map(p => p.temperature);
    } else if (selectedMetric === "blood_pressure") {
      values = points.map(p => p.systolic); // Graph systolic for blood pressure
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
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#ffffff25" strokeDasharray="3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#ffffff25" strokeDasharray="3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ffffff25" />

        {/* Shaded Area */}
        {coords.length > 0 && (
          <path
            d={`${pathData} L ${padding + (points.length - 1) * (width - 2 * padding) / (points.length - 1)},${height - padding} L ${padding},${height - padding} Z`}
            fill="url(#chartGradient)"
          />
        )}
        
        {/* Line Path */}
        <path d={pathData} fill="none" stroke="#00f3ff" strokeWidth="2.5" className="drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]" />

        {/* Data points dots */}
        {coords.map((c, idx) => {
          const [x, y] = c.split(",");
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="4"
              fill="#ff00ff"
              className="cursor-pointer hover:r-6 transition-all"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-rajdhani flex flex-col justify-between overflow-x-hidden">
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-md px-4 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-blue animate-pulse" />
            <span className="font-orbitron text-lg font-black tracking-widest text-cyber-blue">
              ALTERIS <span className="text-cyber-pink">OS</span>
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block font-mono text-xs text-white bg-white/10 border border-white/20 px-3 py-1 rounded">
              {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
            </span>
            <button
              onClick={handleLogout}
              className="border border-white/30 hover:border-red-500/50 hover:text-red-400 p-2 sm:px-4 sm:py-1.5 rounded transition-all flex items-center gap-1.5 text-xs font-orbitron uppercase tracking-widest cursor-pointer text-white"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 z-10">
        
        {/* Profile Card with Avatar */}
        {profile && (
          <div className="p-5 border border-white/10 bg-white/[0.01] backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative">
            <div className="absolute left-0 top-0 h-full w-[3px] bg-cyber-blue" />
            
            <div className="flex items-center gap-4">
              {/* Profile Avatar */}
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-16 h-16 rounded-full border-2 border-cyber-blue object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center text-white/50 shrink-0">
                  <User size={28} />
                </div>
              )}
              
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-cyber-blue font-orbitron font-bold">Welcome, Patient Identity</div>
                <h2 className="text-2xl font-bold tracking-tight text-white">{profile.name || "Initializing Profile..."}</h2>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 text-xs font-mono">
              <div className="bg-white/5 px-3 py-1.5 border border-white/15 rounded">
                <span className="text-white font-semibold">Blood Group:</span> <span className="text-cyber-pink font-bold">{profile.blood_group || "N/A"}</span>
              </div>
              <div className="bg-white/5 px-3 py-1.5 border border-white/15 rounded">
                <span className="text-white font-semibold">DOB:</span> <span className="text-white">{profile.dob || "Pending"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Live Vitals Streaming Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Visualizer Chart Card */}
          <div className="lg:col-span-2 p-6 border border-white/10 bg-white/[0.01] flex flex-col justify-between h-[360px] relative">
            <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
            <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-blue" />
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="text-cyber-blue animate-pulse" size={16} />
                <span className="font-orbitron text-xs tracking-widest uppercase text-white font-bold">Live Telemetry visualizer</span>
              </div>
              
              {/* Metrics Selectors */}
              <div className="flex gap-2 text-[10px] font-orbitron font-bold">
                <button
                  onClick={() => setSelectedMetric("heart_rate")}
                  className={`px-3 py-1 border transition-all cursor-pointer ${selectedMetric === "heart_rate" ? "bg-cyber-blue text-black border-cyber-blue" : "border-white/20 hover:border-white/50 text-white"}`}
                >
                  PULSE
                </button>
                <button
                  onClick={() => setSelectedMetric("spo2")}
                  className={`px-3 py-1 border transition-all cursor-pointer ${selectedMetric === "spo2" ? "bg-cyber-blue text-black border-cyber-blue" : "border-white/20 hover:border-white/50 text-white"}`}
                >
                  SPO2
                </button>
                <button
                  onClick={() => setSelectedMetric("temperature")}
                  className={`px-3 py-1 border transition-all cursor-pointer ${selectedMetric === "temperature" ? "bg-cyber-blue text-black border-cyber-blue" : "border-white/20 hover:border-white/50 text-white"}`}
                >
                  TEMP
                </button>
              </div>
            </div>

            {/* SVG Line Graph */}
            <div className="flex-1 w-full bg-black/60 relative border border-white/5 py-4">
              {renderSVGChart()}
            </div>
            
            <div className="text-[10px] font-mono text-white/50 mt-3 text-right">
              Ingesting active wearable streams on localhost...
            </div>
          </div>

          {/* Individual Telemetry Numbers Card */}
          <div className="grid grid-cols-2 gap-4 h-full">
            
            {/* Heart Rate Card */}
            <div className={`p-4 border flex flex-col justify-between rounded transition-all relative ${latest.anomaly_detected && latest.heart_rate > 130 ? "border-red-500/50 bg-red-950/20 animate-pulse" : "border-white/10 bg-white/[0.01]"}`}>
              <div className="flex justify-between items-start">
                <Heart size={20} className={latest.anomaly_detected && latest.heart_rate > 130 ? "text-red-500 animate-pulse" : "text-cyber-pink"} />
                <span className="text-[10px] font-orbitron tracking-wider text-white font-bold">Pulse</span>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold tracking-tight">{latest.heart_rate} <span className="text-xs text-white/70 font-normal">BPM</span></div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-white/50">Target: 60-100</div>
              </div>
            </div>

            {/* SpO2 Card */}
            <div className={`p-4 border flex flex-col justify-between rounded transition-all relative ${latest.anomaly_detected && latest.spo2 < 90 ? "border-red-500/50 bg-red-950/20 animate-pulse" : "border-white/10 bg-white/[0.01]"}`}>
              <div className="flex justify-between items-start">
                <Activity size={20} className={latest.anomaly_detected && latest.spo2 < 90 ? "text-red-500 animate-pulse" : "text-cyber-blue"} />
                <span className="text-[10px] font-orbitron tracking-wider text-white font-bold">Oxygen</span>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold tracking-tight">{latest.spo2}%</div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-white/50">Target: 95-100%</div>
              </div>
            </div>

            {/* Blood Pressure Card */}
            <div className={`p-4 border flex flex-col justify-between rounded transition-all relative ${latest.anomaly_detected && (latest.systolic > 180 || latest.diastolic > 120) ? "border-red-500/50 bg-red-950/20 animate-pulse" : "border-white/10 bg-white/[0.01]"}`}>
              <div className="flex justify-between items-start">
                <Award size={20} className={latest.anomaly_detected && (latest.systolic > 180 || latest.diastolic > 120) ? "text-red-500 animate-pulse" : "text-cyber-yellow"} />
                <span className="text-[10px] font-orbitron tracking-wider text-white font-bold">Pressure</span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold tracking-tight">{latest.systolic}/{latest.diastolic}</div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-white/50">Target: 120/80</div>
              </div>
            </div>

            {/* Temperature Card */}
            <div className={`p-4 border flex flex-col justify-between rounded transition-all relative ${latest.anomaly_detected && (latest.temperature > 39.5) ? "border-red-500/50 bg-red-950/20 animate-pulse" : "border-white/10 bg-white/[0.01]"}`}>
              <div className="flex justify-between items-start">
                <Thermometer size={20} className={latest.anomaly_detected && (latest.temperature > 39.5) ? "text-red-500 animate-pulse" : "text-cyber-blue"} />
                <span className="text-[10px] font-orbitron tracking-wider text-white font-bold">Temp</span>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-bold tracking-tight">{latest.temperature}°C</div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-white/50">Target: 36.5 - 37.3</div>
              </div>
            </div>

          </div>
        </section>

        {/* Live Anomaly Warning Banner */}
        {latest.anomaly_detected && (
          <div className="p-4 border border-red-500/30 bg-red-950/10 text-red-400 text-xs flex items-start sm:items-center gap-3 relative animate-pulse shrink-0">
            <div className="absolute left-0 top-0 h-full w-[3px] bg-red-500" />
            <ShieldAlert size={18} className="shrink-0" />
            <div className="space-y-0.5">
              <div className="font-orbitron font-bold uppercase tracking-wider text-[10px]">ML Anomalous Event Alert Triggered</div>
              <div className="font-mono text-white font-semibold">{latest.warning || "Vitals outside safe clinical envelope detected."}</div>
            </div>
          </div>
        )}

        {/* Clinical Records List */}
        <section className="p-6 border border-white/10 bg-white/[0.01] relative shrink-0">
          <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-pink" />
          <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-pink" />

          <div className="flex items-center gap-2 mb-6">
            <FileText className="text-cyber-pink" size={16} />
            <h3 className="font-orbitron text-xs tracking-widest uppercase text-white font-bold">On-Chain Clinical Records Vault</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-white pb-3 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2">Document Description</th>
                  <th className="py-3 px-2">Type</th>
                  <th className="py-3 px-2">Issuing Doctor</th>
                  <th className="py-3 px-2">Date Added</th>
                  <th className="py-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-2 font-semibold text-white">{rec.diagnosis}</td>
                    <td className="py-4 px-2 text-white"><span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[9px] rounded uppercase font-orbitron">{rec.document_type || "Report"}</span></td>
                    <td className="py-4 px-2 text-white">{rec.doctor.slice(0, 12)}...{rec.doctor.slice(-8)}</td>
                    <td className="py-4 px-2 text-white">{rec.date}</td>
                    <td className="py-4 px-2 text-right">
                      <a
                        href={rec.download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 bg-cyber-pink/10 hover:bg-cyber-pink text-cyber-pink hover:text-black border border-cyber-pink/30 px-3 py-1.5 text-[10px] font-orbitron uppercase tracking-widest transition-all cursor-pointer font-bold"
                      >
                        <Download size={10} />
                        Download PDF
                      </a>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-white/50">No clinical reports archived in your S3 vault yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* Footer Info */}
      <footer className="w-full border-t border-white/10 bg-black/80 py-4 text-center text-[10px] text-white/50 uppercase tracking-widest z-10 shrink-0">
        ALTERIS OS v1.0.0 — SECURED PATIENT INTERFACE
      </footer>
    </div>
  );
}
