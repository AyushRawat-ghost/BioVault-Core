"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, LogIn, LogOut, Wallet } from "lucide-react";
import Link from "next/link";

export default function CyberNavbar() {
  const [walletAddress, setWalletAddress] = useState<string>("");

  // Monitor localStorage for changes
  useEffect(() => {
    const checkSession = () => {
      const cached = localStorage.getItem("aeth_wallet");
      setWalletAddress(cached || "");
    };

    // Check on mount
    checkSession();

    // Listen for storage events (e.g. logging in/out in another tab)
    window.addEventListener("storage", checkSession);
    
    // Custom polling check since Next.js routing might not trigger storage event on same window
    const interval = setInterval(checkSession, 1000);

    return () => {
      window.removeEventListener("storage", checkSession);
      clearInterval(interval);
    };
  }, []);

  const handleDisconnect = () => {
    localStorage.removeItem("aeth_wallet");
    localStorage.removeItem("aeth_session");
    localStorage.removeItem("aeth_is_patient");
    setWalletAddress("");
    window.location.reload();
  };

  const triggerLogin = () => {
    // If not on homepage, redirect to home to login, otherwise trigger click on connect button
    if (window.location.pathname !== "/") {
      window.location.href = "/";
    } else {
      // Find and click the login button in page.tsx
      const loginBtn = document.querySelector(".cyber-button") as HTMLButtonElement;
      if (loginBtn) loginBtn.click();
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 border-b border-cyber-blue/30 bg-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="text-cyber-blue"
          >
            <Activity size={28} />
          </motion.div>
          <span className="font-orbitron text-xl tracking-tighter text-cyber-blue">
            ALTERIS <span className="text-cyber-pink">OS</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm uppercase tracking-[0.2em]">
          <Link href="/dashboard" className="hover:text-cyber-blue transition-colors">Records</Link>
          <Link href="/dashboard" className="hover:text-cyber-blue transition-colors">Neural-Link</Link>
          <Link href="/dashboard" className="hover:text-cyber-blue transition-colors">Finance</Link>
        </div>

        {walletAddress ? (
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-green-400 border border-green-500/30 bg-green-950/10 px-3 py-1.5 flex items-center gap-1.5">
              <Wallet size={12} />
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
            <button
              onClick={handleDisconnect}
              className="text-white/40 hover:text-red-400 transition-colors p-2 cursor-pointer"
              title="Disconnect Neural-Link"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={triggerLogin}
            className="border border-cyber-blue/40 hover:border-cyber-blue hover:text-cyber-blue transition-all px-4 py-2 font-orbitron text-xs flex items-center gap-2 cursor-pointer"
          >
            <LogIn size={14} />
            Initialize Session
          </button>
        )}
      </div>
    </nav>
  );
}
