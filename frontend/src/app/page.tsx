"use client";

import React, { useState, useEffect } from "react";
import CyberNavbar from "@/components/CyberNavbar";
import { Activity, Shield, Key, Heart, Users, ShieldAlert, Wallet, AlertCircle, Lock } from "lucide-react";
import { BrowserProvider } from "ethers";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [session, setSession] = useState<any>(null);
  const [activeRole, setActiveRole] = useState<"patient" | "provider" | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    const cachedAddress = localStorage.getItem("aeth_wallet");
    const cachedToken = localStorage.getItem("aeth_session");
    if (cachedAddress && cachedToken) {
      setWalletAddress(cachedAddress);
      setSession({ session_token: cachedToken });
    }
  }, []);

  const handleLogin = async (role: "patient" | "provider") => {
    setError("");
    setIsConnecting(true);
    setActiveRole(role);

    if (!(window as any).ethereum) {
      setError("MetaMask is not detected. Please install the MetaMask extension to sign in.");
      setIsConnecting(false);
      return;
    }

    try {
      // 1. Request Wallet Sync
      const provider = new BrowserProvider((window as any).ethereum);
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0].toLowerCase();
      setWalletAddress(address);

      // 2. Fetch Nonce Challenge from Go Backend
      const nonceResp = await fetch(`${API_URL}/api/auth/nonce?address=${address}`);
      if (!nonceResp.ok) {
        throw new Error("Failed to retrieve authentication challenge from server");
      }
      const nonceData = await nonceResp.json();
      const nonce = nonceData.nonce;

      // 3. Cryptographic Sign
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(nonce);

      // 4. Submit Verification
      const loginResp = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: address,
          signature: signature,
          nonce: nonce,
        }),
      });

      if (!loginResp.ok) {
        const errData = await loginResp.json();
        throw new Error(errData.error || "Authentication rejected");
      }

      const loginData = await loginResp.json();

      // Enforce role clearance checks
      if (role === "patient" && !loginData.is_patient) {
        throw new Error("Access Denied: Your wallet is not registered as a patient in Alteris OS.");
      }
      if (role === "provider" && !loginData.is_doctor && !loginData.is_admin) {
        throw new Error("Access Denied: Your wallet does not possess doctor or administrator clearance.");
      }

      // 5. Store Session Details
      localStorage.setItem("aeth_wallet", address);
      localStorage.setItem("aeth_session", loginData.session_token);
      localStorage.setItem("aeth_is_patient", String(loginData.is_patient));
      localStorage.setItem("aeth_is_admin", String(loginData.is_admin));
      localStorage.setItem("aeth_is_doctor", String(loginData.is_doctor));
      
      setSession(loginData);

      // Redirect depending on role
      setTimeout(() => {
        if (role === "patient") {
          window.location.href = "/dashboard";
        } else {
          window.location.href = "/admin/dashboard"; // Future provider/admin console
        }
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Connection refused by host. Please ensure backend is running.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem("aeth_wallet");
    localStorage.removeItem("aeth_session");
    localStorage.removeItem("aeth_is_patient");
    setWalletAddress("");
    setSession(null);
    setActiveRole(null);
  };

  return (
    <div className="relative min-h-screen bg-black text-white font-rajdhani overflow-hidden flex flex-col justify-between">
      <CyberNavbar />
      
      {/* Background Matrix/Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f0ff03_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff03_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyber-blue/10 blur-[150px] rounded-full pointer-events-none" />
      
      {/* Central Login Container */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 px-4 pb-12 z-10 max-w-4xl mx-auto w-full">
        
        {/* Core Header */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-cyber-blue/30 bg-cyber-blue/5 text-cyber-blue text-xs uppercase tracking-widest font-orbitron">
            <Activity size={12} className="animate-pulse" />
            Medical Portal Online
          </div>
          <h1 className="text-4xl md:text-5xl font-orbitron font-black tracking-tight text-white">
            WELCOME TO <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-blue to-cyber-pink">ALTERIS OS</span>
          </h1>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            A secure blockchain-based ecosystem. Access your medical identity, record indexes, and real-time vitals vault.
          </p>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div className="w-full max-w-2xl mb-6 p-4 border border-red-500/30 bg-red-950/10 text-red-400 text-xs flex items-center gap-3 relative">
            <div className="absolute left-0 top-0 h-full w-[3px] bg-red-500" />
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic Connected Session Block */}
        {session && (
          <div className="w-full max-w-2xl mb-8 p-5 border border-green-500/30 bg-green-950/5 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 relative">
            <div className="absolute left-0 top-0 h-full w-[3px] bg-green-500" />
            <div className="text-center sm:text-left">
              <div className="text-[10px] text-green-400 font-orbitron uppercase tracking-widest">Connection Active</div>
              <div className="text-sm font-mono text-white/80">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => window.location.href = localStorage.getItem("aeth_is_patient") === "true" ? "/dashboard" : "/admin/dashboard"}
                className="flex-1 sm:flex-initial bg-cyber-blue text-black font-orbitron font-bold px-6 py-2.5 text-xs uppercase tracking-wider hover:bg-cyber-blue/80 transition-all cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                onClick={handleDisconnect}
                className="border border-white/20 hover:border-red-500/30 hover:text-red-400 px-4 py-2.5 text-[10px] font-orbitron uppercase tracking-wider transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Two Portal Options */}
        {!session && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
            
            {/* Patient Portal Card */}
            <div className="p-8 border border-white/10 bg-white/[0.01] hover:border-cyber-blue/40 transition-all group relative backdrop-blur-sm flex flex-col justify-between h-[280px]">
              <div className="absolute top-0 left-0 w-4 h-[2px] bg-cyber-blue group-hover:w-12 transition-all" />
              <div className="absolute top-0 left-0 w-[2px] h-4 bg-cyber-blue group-hover:h-12 transition-all" />
              
              <div className="space-y-4">
                <div className="inline-flex p-3 border border-cyber-blue/20 bg-cyber-blue/5 text-cyber-blue">
                  <Heart size={20} />
                </div>
                <h2 className="font-orbitron text-lg tracking-widest text-white group-hover:text-cyber-blue transition-colors">
                  PATIENT PORTAL
                </h2>
                <p className="text-sm text-white/50 leading-relaxed">
                  View your medical history, check consent access logs, and monitor real-time vital telemetries.
                </p>
              </div>

              <button
                onClick={() => handleLogin("patient")}
                disabled={isConnecting}
                className="w-full mt-6 bg-cyber-blue/10 hover:bg-cyber-blue text-cyber-blue hover:text-black border border-cyber-blue/30 py-3 font-orbitron font-bold text-xs tracking-wider uppercase transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Wallet size={14} />
                {isConnecting && activeRole === "patient" ? "Connecting..." : "Patient Sign In"}
              </button>
            </div>

            {/* Provider Portal Card */}
            <div className="p-8 border border-white/10 bg-white/[0.01] hover:border-cyber-pink/40 transition-all group relative backdrop-blur-sm flex flex-col justify-between h-[280px]">
              <div className="absolute top-0 left-0 w-4 h-[2px] bg-cyber-pink group-hover:w-12 transition-all" />
              <div className="absolute top-0 left-0 w-[2px] h-4 bg-cyber-pink group-hover:h-12 transition-all" />
              
              <div className="space-y-4">
                <div className="inline-flex p-3 border border-cyber-pink/20 bg-cyber-pink/5 text-cyber-pink">
                  <Users size={20} />
                </div>
                <h2 className="font-orbitron text-lg tracking-widest text-white group-hover:text-cyber-pink transition-colors">
                  PROVIDER CONSOLE
                </h2>
                <p className="text-sm text-white/50 leading-relaxed">
                  Admit patients, upload record indexes, issue prescriptions, and approve clinical overrides.
                </p>
              </div>

              <button
                onClick={() => handleLogin("provider")}
                disabled={isConnecting}
                className="w-full mt-6 bg-cyber-pink/10 hover:bg-cyber-pink text-cyber-pink hover:text-black border border-cyber-pink/30 py-3 font-orbitron font-bold text-xs tracking-wider uppercase transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Key size={14} />
                {isConnecting && activeRole === "provider" ? "Connecting..." : "Provider Sign In"}
              </button>
            </div>

          </div>
        )}
      </main>

      {/* Trust Badges Footer */}
      <footer className="w-full border-t border-white/10 bg-black/80 py-4 text-center text-[10px] text-white/40 uppercase tracking-widest z-10 shrink-0">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>ALTERIS OS v1.0.0</span>
          <div className="flex gap-6">
            <span className="flex items-center gap-1"><Shield size={10} className="text-cyber-blue" /> SBT Protected</span>
            <span className="flex items-center gap-1"><Lock size={10} className="text-cyber-pink" /> End-to-End Encrypted</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
