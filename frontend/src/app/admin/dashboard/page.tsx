"use client";

import React, { useState, useEffect } from "react";
import { UserPlus, Upload, ShieldAlert, Users, LogOut, CheckCircle, Activity, RefreshCw, FileText, Camera, Stethoscope, Landmark, CreditCard, Shield, Edit, Heart, Eye, Terminal, FileCode, PlusCircle, List } from "lucide-react";

interface PatientInfo {
  address: string;
  name: string;
  avatar_url?: string;
  status?: string;
  blood_group?: string;
}

interface DoctorInfo {
  address: string;
  name: string;
  specialization: string;
  avatar_url?: string;
  status?: string;
}

interface HospitalKPIs {
  total_patients: number;
  beds_occupied: number;
  discharged: number;
  deceased: number;
  active_doctors: number;
}

export default function ProviderDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isDoctor, setIsDoctor] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  
  const [admittedPatients, setAdmittedPatients] = useState<PatientInfo[]>([]);
  const [doctorsList, setDoctorsList] = useState<DoctorInfo[]>([]);
  const [kpis, setKpis] = useState<HospitalKPIs>({
    total_patients: 0,
    beds_occupied: 0,
    discharged: 0,
    deceased: 0,
    active_doctors: 0
  });

  // Sidebar Tabs State: kpis | admit | admit-doc | modify | regulatory | upload | readme-logs | request-assets | transfer-override
  const [activeTab, setActiveTab] = useState<"kpis" | "admit" | "admit-doc" | "modify" | "regulatory" | "upload" | "readme-logs" | "request-assets" | "transfer-override">("kpis");

  // Modify Tab Sub-Tab: patient | doctor
  const [modifySubTab, setModifySubTab] = useState<"patient" | "doctor">("patient");

  // Regulatory Tab Sub-Tab: implant | narcotics
  const [regSubTab, setRegSubTab] = useState<"implant" | "narcotics" | "medicines">("implant");

  // Form States - Admit Patient
  const [admitAddress, setAdmitAddress] = useState<string>("");
  const [admitName, setAdmitName] = useState<string>("");
  const [admitDOB, setAdmitDOB] = useState<string>("");
  const [admitBloodGroup, setAdmitBloodGroup] = useState<string>("A+");
  const [admitAllergies, setAdmitAllergies] = useState<string>("");
  const [admitEmergency, setAdmitEmergency] = useState<string>("");
  const [admitAadhaarNum, setAdmitAadhaarNum] = useState<string>("");
  const [admitPanNum, setAdmitPanNum] = useState<string>("");
  const [admitAvatar, setAdmitAvatar] = useState<File | null>(null);
  const [admitAadhaarFile, setAdmitAadhaarFile] = useState<File | null>(null);
  const [admitPanFile, setAdmitPanFile] = useState<File | null>(null);
  const [isAdmitting, setIsAdmitting] = useState<boolean>(false);
  const [admitTx, setAdmitTx] = useState<string>("");

  // Form States - Admit Doctor
  const [admitDocAddress, setAdmitDocAddress] = useState<string>("");
  const [admitDocName, setAdmitDocName] = useState<string>("");
  const [admitDocSpecialization, setAdmitDocSpecialization] = useState<string>("Cardiology");
  const [admitDocAadhaarNum, setAdmitDocAadhaarNum] = useState<string>("");
  const [admitDocPanNum, setAdmitDocPanNum] = useState<string>("");
  const [admitDocEmpID, setAdmitDocEmpID] = useState<string>("");
  const [admitDocContact, setAdmitDocContact] = useState<string>("");
  const [admitDocHome, setAdmitDocHome] = useState<string>("");
  const [admitDocAadhaarFile, setAdmitDocAadhaarFile] = useState<File | null>(null);
  const [admitDocPanFile, setAdmitDocPanFile] = useState<File | null>(null);
  const [admitDocAvatar, setAdmitDocAvatar] = useState<File | null>(null);
  const [isAdmittingDoc, setIsAdmittingDoc] = useState<boolean>(false);
  const [admitDocTx, setAdmitDocTx] = useState<string>("");

  // Form States - Modify Patient Profile
  const [editPatientAddress, setEditPatientAddress] = useState<string>("");
  const [editPatientName, setEditPatientName] = useState<string>("");
  const [editPatientDOB, setEditPatientDOB] = useState<string>("");
  const [editPatientBloodGroup, setEditPatientBloodGroup] = useState<string>("A+");
  const [editPatientAllergies, setEditPatientAllergies] = useState<string>("");
  const [editPatientEmergency, setEditPatientEmergency] = useState<string>("");
  const [editPatientAadhaarNum, setEditPatientAadhaarNum] = useState<string>("");
  const [editPatientPanNum, setEditPatientPanNum] = useState<string>("");
  const [editPatientStatus, setEditPatientStatus] = useState<string>("active");
  const [editPatientAadhaarFile, setEditPatientAadhaarFile] = useState<File | null>(null);
  const [editPatientPanFile, setEditPatientPanFile] = useState<File | null>(null);
  const [isSavingPatient, setIsSavingPatient] = useState<boolean>(false);

  // Form States - Modify Doctor Profile
  const [editDocAddress, setEditDocAddress] = useState<string>("");
  const [editDocName, setEditDocName] = useState<string>("");
  const [editDocSpecialization, setEditDocSpecialization] = useState<string>("Cardiology");
  const [editDocEmpID, setEditDocEmpID] = useState<string>("");
  const [editDocContact, setEditDocContact] = useState<string>("");
  const [editDocHome, setEditDocHome] = useState<string>("");
  const [editDocAadhaarNum, setEditDocAadhaarNum] = useState<string>("");
  const [editDocPanNum, setEditDocPanNum] = useState<string>("");
  const [editDocStatus, setEditDocStatus] = useState<string>("active");
  const [editDocAadhaarFile, setEditDocAadhaarFile] = useState<File | null>(null);
  const [editDocPanFile, setEditDocPanFile] = useState<File | null>(null);
  const [editDocAvatar, setEditDocAvatar] = useState<File | null>(null);
  const [isSavingDoc, setIsSavingDoc] = useState<boolean>(false);

  // Form States - Regulatory Implantable Tracking
  const [deviceList, setDeviceList] = useState<any[]>([]);
  const [regDeviceName, setRegDeviceName] = useState<string>("");
  const [regSerialNumber, setRegSerialNumber] = useState<string>("");
  const [regManufacturer, setRegManufacturer] = useState<string>("");
  const [isRegisteringDevice, setIsRegisteringDevice] = useState<boolean>(false);

  const [impSerialNumber, setImpSerialNumber] = useState<string>("");
  const [impPatientAddr, setImpPatientAddr] = useState<string>("");
  const [impDoctorAddr, setImpDoctorAddr] = useState<string>("");
  const [isLoggingImplant, setIsLoggingImplant] = useState<boolean>(false);
  const [recalledDeviceAlert, setRecalledDeviceAlert] = useState<any | null>(null);

  // Form States - Regulatory Narcotics Logs
  const [narcoticLogs, setNarcoticLogs] = useState<any[]>([]);
  const [hospitalLogs, setHospitalLogs] = useState<any[]>([]);
  const [patientStatusFilter, setPatientStatusFilter] = useState<string>("all");
  const [patientReports, setPatientReports] = useState<any[]>([]);
  const [doctorActivity, setDoctorActivity] = useState<any[]>([]);
  const [reqDrugName, setReqDrugName] = useState<string>("Morphine");
  const [reqDosage, setReqDosage] = useState<string>("5mg");
  const [reqPatientAddr, setReqPatientAddr] = useState<string>("");
  const [reqDoctorAddr, setReqDoctorAddr] = useState<string>("");
  const [isRequestingNarcotic, setIsRequestingNarcotic] = useState<boolean>(false);

  // Form States - Regulatory Medicine Inventory
  const [medicineList, setMedicineList] = useState<any[]>([]);
  const [addMedName, setAddMedName] = useState<string>("");
  const [addMedDosage, setAddMedDosage] = useState<string>("");
  const [addMedStock, setAddMedStock] = useState<number>(0);
  const [addMedDoubleAuth, setAddMedDoubleAuth] = useState<boolean>(true);
  const [isAddingMed, setIsAddingMed] = useState<boolean>(false);

  const [editMedID, setEditMedID] = useState<number | null>(null);
  const [editMedName, setEditMedName] = useState<string>("");
  const [editMedDosage, setEditMedDosage] = useState<string>("");
  const [editMedStock, setEditMedStock] = useState<number>(0);
  const [editMedDoubleAuth, setEditMedDoubleAuth] = useState<boolean>(true);
  const [isSavingMed, setIsSavingMed] = useState<boolean>(false);

  // Form States - Record Upload
  const [uploadTargetAddress, setUploadTargetAddress] = useState<string>("");
  const [uploadDiagnosis, setUploadDiagnosis] = useState<string>("");
  const [uploadDocType, setUploadDocType] = useState<string>("report"); 
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadTx, setUploadTx] = useState<string>("");

  // Doctor Specific States
  const [doctorPatients, setDoctorPatients] = useState<any[]>([]);
  const [doctorAnomalies, setDoctorAnomalies] = useState<any[]>([]);
  const [requestAssetTab, setRequestAssetTab] = useState<"meds" | "equipments">("meds");
  const [overrideList, setOverrideList] = useState<any[]>([]);
  const [isVoting, setIsVoting] = useState<number | null>(null);
  const [transferOverrideSubTab, setTransferOverrideSubTab] = useState<"override" | "transfer" | "queue">("override");

  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    const cachedAddress = localStorage.getItem("aeth_wallet");
    const cachedToken = localStorage.getItem("aeth_session");
    const cachedIsAdmin = localStorage.getItem("aeth_is_admin") === "true";
    const cachedIsDoctor = localStorage.getItem("aeth_is_doctor") === "true";

    if (!cachedAddress || !cachedToken || (!cachedIsAdmin && !cachedIsDoctor)) {
      window.location.href = "/";
      return;
    }

    setWalletAddress(cachedAddress);
    setIsAdmin(cachedIsAdmin);
    setIsDoctor(cachedIsDoctor);

    // Initial Fetch Core Data
    fetchPatients();
    fetchDoctors();
    fetchKPIs();
    fetchDevices();
    fetchNarcotics();
    fetchHospitalLogs();
    fetchMedicines();

    if (cachedIsDoctor) {
      fetchDoctorPatients(cachedAddress);
      fetchDoctorAnomalies(cachedAddress);
      fetchOverrides();
      const interval = setInterval(() => {
        fetchDoctorPatients(cachedAddress);
        fetchDoctorAnomalies(cachedAddress);
        fetchOverrides();
      }, 5000);
      return () => clearInterval(interval);
    }

    if (cachedIsAdmin) {
      fetchOverrides();
      const adminInterval = setInterval(() => {
        fetchOverrides();
      }, 10000);
      return () => clearInterval(adminInterval);
    }
  }, []);

  const fetchDoctorPatients = async (address: string) => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/doctor/patients?address=${address}`);
      if (resp.ok) {
        const data = await resp.json();
        setDoctorPatients(data);
      }
    } catch (e) {
      console.log("Failed to fetch doctor patients", e);
    }
  };

  const fetchDoctorAnomalies = async (address: string) => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/anomaly-logs?address=${address}`);
      if (resp.ok) {
        const data = await resp.json();
        setDoctorAnomalies(data);
      }
    } catch (e) {
      console.log("Failed to fetch doctor anomalies", e);
    }
  };

  const fetchOverrides = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/doctor/override-list`);
      if (resp.ok) {
        const data = await resp.json();
        setOverrideList(data);
      }
    } catch (e) {
      console.log("Failed to fetch overrides list", e);
    }
  };


  const fetchPatients = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/patients`);
      if (resp.ok) {
        const list = await resp.json();
        setAdmittedPatients(list);
        if (list.length > 0 && !uploadTargetAddress) {
          setUploadTargetAddress(list[0].address);
        }
      }
    } catch (e) {
      console.log("Failed to fetch patients list", e);
    }
  };

  const fetchDoctors = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/doctors`);
      if (resp.ok) {
        const list = await resp.json();
        setDoctorsList(list);
      }
    } catch (e) {
      console.log("Failed to fetch doctors list", e);
    }
  };

  const fetchKPIs = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/kpis`);
      if (resp.ok) {
        const data = await resp.json();
        setKpis(data);
      }
    } catch (e) {
      console.log("Failed to fetch hospital KPIs", e);
    }
  };

  const fetchDevices = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/regulatory/devices`);
      if (resp.ok) {
        const list = await resp.json();
        setDeviceList(list);
      }
    } catch (e) {
      console.log("Failed to fetch devices", e);
    }
  };

  const fetchNarcotics = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/regulatory/narcotics`);
      if (resp.ok) {
        const list = await resp.json();
        setNarcoticLogs(list);
      }
    } catch (e) {
      console.log("Failed to fetch narcotics logs", e);
    }
  };

  const fetchHospitalLogs = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/logs`);
      if (resp.ok) {
        const list = await resp.json();
        setHospitalLogs(list);
      }
    } catch (e) {
      console.log("Failed to fetch hospital logs", e);
    }
  };

  const fetchMedicines = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/regulatory/medicines`);
      if (resp.ok) {
        const list = await resp.json();
        setMedicineList(list);
      }
    } catch (e) {
      console.log("Failed to fetch medicines list", e);
    }
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsAddingMed(true);
    try {
      const resp = await fetch(`${API_URL}/api/admin/regulatory/medicines/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drug_name: addMedName,
          dosage_strength: addMedDosage,
          stock_quantity: Number(addMedStock),
          requires_double_auth: addMedDoubleAuth
        })
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to add medicine");
      }
      setSuccessMsg(`Medicine '${addMedName}' successfully cataloged!`);
      setAddMedName("");
      setAddMedDosage("");
      setAddMedStock(0);
      setAddMedDoubleAuth(true);
      await fetchMedicines();
      await fetchHospitalLogs();
    } catch (err: any) {
      setError(err.message || "Failed to catalog medicine");
    } finally {
      setIsAddingMed(false);
    }
  };

  const handleUpdateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editMedID === null) return;
    setError("");
    setSuccessMsg("");
    setIsSavingMed(true);
    try {
      const resp = await fetch(`${API_URL}/api/admin/regulatory/medicines/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editMedID,
          drug_name: editMedName,
          dosage_strength: editMedDosage,
          stock_quantity: Number(editMedStock),
          requires_double_auth: editMedDoubleAuth
        })
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to update medicine details");
      }
      setSuccessMsg(`Medicine parameters updated successfully!`);
      setEditMedID(null); // Close modal
      await fetchMedicines();
      await fetchHospitalLogs();
    } catch (err: any) {
      setError(err.message || "Failed to save medicine changes");
    } finally {
      setIsSavingMed(false);
    }
  };

  const handleDeleteMedicine = async (id: number) => {
    if (!window.confirm("Are you sure you want to remove this medicine from catalog?")) return;
    setError("");
    setSuccessMsg("");
    try {
      const resp = await fetch(`${API_URL}/api/admin/regulatory/medicines/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to delete medicine");
      }
      setSuccessMsg(`Medicine deleted from catalog.`);
      await fetchMedicines();
      await fetchHospitalLogs();
    } catch (err: any) {
      setError(err.message || "Failed to delete medicine");
    }
  };

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAdmitTx("");
    setIsAdmitting(true);
    setSuccessMsg("");

    try {
      const formData = new FormData();
      formData.append("address", admitAddress);
      formData.append("name", admitName);
      formData.append("dob", admitDOB);
      formData.append("blood_group", admitBloodGroup);
      formData.append("allergies", admitAllergies);
      formData.append("emergency_contact", admitEmergency);
      formData.append("aadhaar_number", admitAadhaarNum);
      formData.append("pan_number", admitPanNum);

      if (admitAadhaarFile) formData.append("aadhaar_file", admitAadhaarFile);
      if (admitPanFile) formData.append("pan_file", admitPanFile);

      const resp = await fetch(`${API_URL}/api/admin/patient/admit`, {
        method: "POST",
        body: formData
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "Admission transaction rejected by blockchain");
      }

      const data = await resp.json();
      setAdmitTx(data.tx_hash);
      let success = `Patient ${admitName} admitted on-chain successfully! off-chain IDs securely archived.`;

      if (admitAvatar) {
        const avatarData = new FormData();
        avatarData.append("patient_address", admitAddress);
        avatarData.append("avatar", admitAvatar);
        const avatarResp = await fetch(`${API_URL}/api/patient/avatar`, {
          method: "POST",
          body: avatarData
        });
        if (avatarResp.ok) {
          success += " Profile photo synced successfully.";
        }
      }

      setSuccessMsg(success);
      setAdmitAddress("");
      setAdmitName("");
      setAdmitDOB("");
      setAdmitAllergies("");
      setAdmitEmergency("");
      setAdmitAadhaarNum("");
      setAdmitPanNum("");
      setAdmitAvatar(null);
      setAdmitAadhaarFile(null);
      setAdmitPanFile(null);

      await fetchPatients();
      await fetchKPIs();
      await fetchHospitalLogs();
    } catch (err: any) {
      setError(err.message || "Failed to submit admission details");
    } finally {
      setIsAdmitting(false);
    }
  };

  const handleAdmitDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAdmitDocTx("");
    setIsAdmittingDoc(true);
    setSuccessMsg("");

    try {
      const formData = new FormData();
      formData.append("address", admitDocAddress);
      formData.append("name", admitDocName);
      formData.append("specialization", admitDocSpecialization);
      formData.append("aadhaar_number", admitDocAadhaarNum);
      formData.append("pan_number", admitDocPanNum);
      formData.append("employee_id", admitDocEmpID);
      formData.append("contact_number", admitDocContact);
      formData.append("home_address", admitDocHome);

      if (admitDocAadhaarFile) formData.append("aadhaar_file", admitDocAadhaarFile);
      if (admitDocPanFile) formData.append("pan_file", admitDocPanFile);

      const resp = await fetch(`${API_URL}/api/admin/doctor/admit`, {
        method: "POST",
        body: formData
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "Doctor admission transaction rejected by blockchain");
      }

      const data = await resp.json();
      setAdmitDocTx(data.tx_hash);
      
      let success = `Doctor ${admitDocName} admitted successfully! Soulbound credentials issued.`;

      if (admitDocAvatar) {
        const avatarData = new FormData();
        avatarData.append("patient_address", admitDocAddress); // Endpoint expects patient_address
        avatarData.append("avatar", admitDocAvatar);
        const avatarResp = await fetch(`${API_URL}/api/patient/avatar`, {
          method: "POST",
          body: avatarData
        });
        if (avatarResp.ok) {
          success += " Profile photo synced successfully.";
        }
      }

      setSuccessMsg(success);
      
      setAdmitDocAddress("");
      setAdmitDocName("");
      setAdmitDocAadhaarNum("");
      setAdmitDocPanNum("");
      setAdmitDocEmpID("");
      setAdmitDocContact("");
      setAdmitDocHome("");
      setAdmitDocAadhaarFile(null);
      setAdmitDocPanFile(null);
      setAdmitDocAvatar(null);

      await fetchDoctors();
      await fetchKPIs();
      await fetchHospitalLogs();
    } catch (err: any) {
      setError(err.message || "Failed to admit doctor");
    } finally {
      setIsAdmittingDoc(false);
    }
  };

  const handleLoadPatientDetails = async (addr: string) => {
    if (!addr) return;
    setEditPatientAddress(addr);
    setPatientReports([]); // Reset report list
    try {
      const resp = await fetch(`${API_URL}/api/admin/patient/details?address=${addr}`);
      if (resp.ok) {
        const p = await resp.json();
        setEditPatientName(p.name);
        setEditPatientDOB(p.dob);
        setEditPatientBloodGroup(p.blood_group);
        setEditPatientAllergies(p.allergies);
        setEditPatientEmergency(p.emergency_contact);
        setEditPatientAadhaarNum(p.aadhaar_number);
        setEditPatientPanNum(p.pan_number);
        setEditPatientStatus(p.status);
      }

      // Fetch diagnostic reports list
      const reportsResp = await fetch(`${API_URL}/api/records/list?address=${addr}`);
      if (reportsResp.ok) {
        const list = await reportsResp.json();
        setPatientReports(list);
      }
    } catch (e) {
      console.log("Failed to load patient details or reports", e);
    }
  };

  const handleLoadDoctorDetails = async (addr: string) => {
    if (!addr) return;
    setEditDocAddress(addr);
    setDoctorActivity([]); // Reset activity
    try {
      const resp = await fetch(`${API_URL}/api/admin/doctor/details?address=${addr}`);
      if (resp.ok) {
        const d = await resp.json();
        setEditDocName(d.name);
        setEditDocSpecialization(d.specialization);
        setEditDocEmpID(d.employee_id);
        setEditDocContact(d.contact_number);
        setEditDocHome(d.home_address);
        setEditDocAadhaarNum(d.aadhaar_number);
        setEditDocPanNum(d.pan_number);
        setEditDocStatus(d.status);
      }

      // Fetch doctor assignment and activity logs
      const actResp = await fetch(`${API_URL}/api/admin/doctor/activity?address=${addr}`);
      if (actResp.ok) {
        const list = await actResp.json();
        setDoctorActivity(list);
      }
    } catch (e) {
      console.log("Failed to load doctor details or activity", e);
    }
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSavingPatient(true);
    setSuccessMsg("");

    try {
      const formData = new FormData();
      formData.append("address", editPatientAddress);
      formData.append("name", editPatientName);
      formData.append("dob", editPatientDOB);
      formData.append("blood_group", editPatientBloodGroup);
      formData.append("allergies", editPatientAllergies);
      formData.append("emergency_contact", editPatientEmergency);
      formData.append("aadhaar_number", editPatientAadhaarNum);
      formData.append("pan_number", editPatientPanNum);
      formData.append("status", editPatientStatus);

      if (editPatientAadhaarFile) formData.append("aadhaar_file", editPatientAadhaarFile);
      if (editPatientPanFile) formData.append("pan_file", editPatientPanFile);

      const resp = await fetch(`${API_URL}/api/admin/patient/update`, {
        method: "POST",
        body: formData
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "Failed to update patient profile");
      }

      setSuccessMsg(`Patient profile for ${editPatientName} updated successfully!`);
      setEditPatientAadhaarFile(null);
      setEditPatientPanFile(null);
      setEditPatientAddress(""); // Close edit modal
      await fetchPatients();
      await fetchKPIs();
      await fetchHospitalLogs();
    } catch (err: any) {
      setError(err.message || "Failed to save profile changes");
    } finally {
      setIsSavingPatient(false);
    }
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSavingDoc(true);
    setSuccessMsg("");

    try {
      const formData = new FormData();
      formData.append("address", editDocAddress);
      formData.append("name", editDocName);
      formData.append("specialization", editDocSpecialization);
      formData.append("employee_id", editDocEmpID);
      formData.append("contact_number", editDocContact);
      formData.append("home_address", editDocHome);
      formData.append("aadhaar_number", editDocAadhaarNum);
      formData.append("pan_number", editDocPanNum);
      formData.append("status", editDocStatus);

      if (editDocAadhaarFile) formData.append("aadhaar_file", editDocAadhaarFile);
      if (editDocPanFile) formData.append("pan_file", editDocPanFile);

      const resp = await fetch(`${API_URL}/api/admin/doctor/update`, {
        method: "POST",
        body: formData
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "Failed to update doctor profile");
      }

      let success = `Doctor profile for ${editDocName} updated successfully!`;

      if (editDocAvatar) {
        const avatarData = new FormData();
        avatarData.append("patient_address", editDocAddress); // Endpoint expects patient_address
        avatarData.append("avatar", editDocAvatar);
        const avatarResp = await fetch(`${API_URL}/api/patient/avatar`, {
          method: "POST",
          body: avatarData
        });
        if (avatarResp.ok) {
          success += " Profile photo updated successfully.";
        }
      }

      setSuccessMsg(success);
      setEditDocAadhaarFile(null);
      setEditDocPanFile(null);
      setEditDocAvatar(null);
      setEditDocAddress(""); // Close edit modal
      await fetchDoctors();
      await fetchKPIs();
      await fetchHospitalLogs();
    } catch (err: any) {
      setError(err.message || "Failed to save doctor profile changes");
    } finally {
      setIsSavingDoc(false);
    }
  };

  // Option C: Implantable Device Asset Ledger Handlers
  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsRegisteringDevice(true);

    try {
      const resp = await fetch(`${API_URL}/api/admin/regulatory/devices/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serial_number: regSerialNumber,
          device_name: regDeviceName,
          manufacturer: regManufacturer
        })
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "Failed to register device");
      }

      setSuccessMsg(`Device serial ${regSerialNumber} registered in inventory!`);
      setRegDeviceName("");
      setRegSerialNumber("");
      setRegManufacturer("");
      await fetchDevices();
      await fetchHospitalLogs();
    } catch (err: any) {
      setError(err.message || "Failed to register device");
    } finally {
      setIsRegisteringDevice(false);
    }
  };

  const handleImplantDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsLoggingImplant(true);

    try {
      const resp = await fetch(`${API_URL}/api/admin/regulatory/devices/implant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serial_number: impSerialNumber,
          patient_address: impPatientAddr,
          implanted_by: impDoctorAddr
        })
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "Failed to log implantation");
      }

      setSuccessMsg(`Implantation successfully mapped to patient ledger!`);
      setImpSerialNumber("");
      setImpPatientAddr("");
      setImpDoctorAddr("");
      await fetchDevices();
      await fetchHospitalLogs();
    } catch (err: any) {
      setError(err.message || "Failed to log implantation");
    } finally {
      setIsLoggingImplant(false);
    }
  };

  const handleRecallDevice = async (serial: string) => {
    setError("");
    setSuccessMsg("");
    setRecalledDeviceAlert(null);

    try {
      const resp = await fetch(`${API_URL}/api/admin/regulatory/devices/recall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial_number: serial })
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "Failed to execute recall");
      }

      setSuccessMsg(`Device ${serial} flagged as RECALLED. Patient alert triggered.`);
      
      const deviceObj = deviceList.find(d => d.serial_number === serial);
      if (deviceObj && deviceObj.patient_address) {
        const patientResp = await fetch(`${API_URL}/api/admin/patient/details?address=${deviceObj.patient_address}`);
        if (patientResp.ok) {
          const pat = await patientResp.json();
          setRecalledDeviceAlert({
            serial: serial,
            name: deviceObj.device_name,
            patientName: pat.name,
            patientPhone: pat.emergency_contact,
            patientBlood: pat.blood_group,
            patientDOB: pat.dob
          });
        }
      }

      await fetchDevices();
      await fetchHospitalLogs();
    } catch (err: any) {
      setError(err.message || "Failed to recall device");
    }
  };

  // Option C: Controlled Substances (Narcotics) Handlers
  const handleRequestNarcotic = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsRequestingNarcotic(true);

    try {
      const resp = await fetch(`${API_URL}/api/admin/regulatory/narcotics/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drug_name: reqDrugName,
          dosage: reqDosage,
          patient_address: reqPatientAddr,
          requester_doctor: reqDoctorAddr
        })
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "Failed to request narcotic");
      }

      setSuccessMsg(`Narcotic authorization request logged! Awaiting co-signature.`);
      setReqPatientAddr("");
      setReqDoctorAddr("");
      await fetchNarcotics();
      await fetchHospitalLogs();
    } catch (err: any) {
      setError(err.message || "Failed to submit narcotic request");
    } finally {
      setIsRequestingNarcotic(false);
    }
  };

  const handleAuthorizeNarcotic = async (id: number, status: "authorized" | "rejected") => {
    setError("");
    setSuccessMsg("");

    try {
      const resp = await fetch(`${API_URL}/api/admin/regulatory/narcotics/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          authorizer_admin: walletAddress,
          status
        })
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "Failed to authorize narcotic");
      }

      setSuccessMsg(`Narcotic request co-authorization completed!`);
      await fetchNarcotics();
      await fetchKPIs();
      await fetchHospitalLogs();
    } catch (err: any) {
      setError(err.message || "Failed to co-authorize narcotic request");
    }
  };

  const handleUploadRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUploadTx("");
    setSuccessMsg("");
    
    if (!uploadFile) {
      setError("Please select a PDF file to upload.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("patient_address", uploadTargetAddress);
      formData.append("diagnosis", uploadDiagnosis);
      formData.append("document_type", uploadDocType);
      formData.append("record", uploadFile);

      const resp = await fetch(`${API_URL}/api/records/upload`, {
        method: "POST",
        body: formData
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "File upload or blockchain registration failed");
      }

      const data = await resp.json();
      setUploadTx(data.tx_hash);
      setSuccessMsg(`Document uploaded successfully to S3 under folder "${uploadDocType}s/" and registered on-chain!`);
      setUploadDiagnosis("");
      setUploadFile(null);
    } catch (err: any) {
      setError(err.message || "Failed to upload medical record to server.");
    } finally {
      setIsUploading(false);
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

  return (
    <div className="min-h-screen bg-black text-white font-rajdhani flex flex-col md:flex-row overflow-x-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-black/95 md:h-screen border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between shrink-0 sticky top-0 z-50">
        
        {/* Logo and Identity */}
        <div className="p-6 border-b border-white/10 flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-pink animate-pulse" />
            <span className="font-orbitron text-lg font-black tracking-widest text-cyber-blue">
              ALTERIS <span className="text-cyber-pink">OS</span>
            </span>
          </div>
          <div className="text-[10px] font-orbitron uppercase text-cyber-pink font-black tracking-wider bg-cyber-pink/5 border border-cyber-pink/20 px-2.5 py-1 rounded w-fit">
            ROLE: {isAdmin ? "ADMINISTRATOR" : "CLINICAL DOCTOR"}
          </div>
        </div>

        {/* Sidebar Vertical Links */}
        <nav className="flex-1 p-4 space-y-2.5 font-orbitron font-bold text-xs">
          
          {/* Category: Overview */}
          <div className="pb-1 text-[10px] font-orbitron uppercase text-white/40 tracking-widest font-black flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-blue" />
            <span>Clinical Overview</span>
          </div>

          <button
            onClick={() => setActiveTab("kpis")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "kpis" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
          >
            <Activity size={15} />
            <span>{isAdmin ? "Hospital KPIs" : "Patient KPIs"}</span>
          </button>
          
          {/* Category: Patient Section */}
          <div className="pt-4 pb-1 text-[10px] font-orbitron uppercase text-white/40 tracking-widest font-black flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-blue" />
            <span>Patient Section</span>
          </div>

          {isAdmin && (
            <button
              onClick={() => setActiveTab("admit")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "admit" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
            >
              <UserPlus size={15} />
              <span>Admit Patient</span>
            </button>
          )}

          <button
            onClick={() => { setActiveTab("modify"); setModifySubTab("patient"); }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "modify" && modifySubTab === "patient" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
          >
            <Edit size={15} />
            <span>Modify Patient</span>
          </button>

          <button
            onClick={() => setActiveTab("upload")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "upload" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
          >
            <Upload size={15} />
            <span>Upload Documents</span>
          </button>

          {/* Category: Doctor Section - Admin only */}
          {isAdmin && (
            <>
              <div className="pt-4 pb-1 text-[10px] font-orbitron uppercase text-white/40 tracking-widest font-black flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-pink" />
                <span>Doctor Section</span>
              </div>

              <button
                onClick={() => setActiveTab("admit-doc")}
                disabled={!isAdmin}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all text-left ${!isAdmin ? "opacity-30 cursor-not-allowed border-white/5 text-white/30" : "cursor-pointer"} ${activeTab === "admit-doc" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                <Stethoscope size={15} />
                <span>Admit Doctor</span>
              </button>

              <button
                onClick={() => { setActiveTab("modify"); setModifySubTab("doctor"); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "modify" && modifySubTab === "doctor" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                <Edit size={15} />
                <span>Modify Doctor</span>
              </button>
            </>
          )}

          {/* Category: Logs & Operations */}
          {isAdmin ? (
            <>
              <div className="pt-4 pb-1 text-[10px] font-orbitron uppercase text-white/40 tracking-widest font-black flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Logs Management</span>
              </div>

              <button
                onClick={() => setActiveTab("regulatory")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "regulatory" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                <Shield size={15} />
                <span>Regulatory Ledger</span>
              </button>

              <button
                onClick={() => setActiveTab("readme-logs")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "readme-logs" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                <Terminal size={15} />
                <span>Readme Logs</span>
              </button>

              <button
                onClick={() => { setActiveTab("transfer-override"); setTransferOverrideSubTab("queue"); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "transfer-override" ? "border-cyber-pink text-cyber-pink bg-white/[0.02] drop-shadow-[0_0_8px_rgba(255,0,128,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                <ShieldAlert size={15} />
                <span>Override Approvals</span>
                {overrideList.filter(o => o.status === "active").length > 0 && (
                  <span className="ml-auto bg-cyber-pink text-black text-[9px] font-orbitron font-bold px-1.5 py-0.5 rounded">
                    {overrideList.filter(o => o.status === "active").length}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="pt-4 pb-1 text-[10px] font-orbitron uppercase text-white/40 tracking-widest font-black flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Doctor Operations</span>
              </div>

              <button
                onClick={() => setActiveTab("request-assets")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "request-assets" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                <PlusCircle size={15} />
                <span>Request Meds & Equipments</span>
              </button>

              <button
                onClick={() => setActiveTab("emergency-override")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "emergency-override" ? "border-red-500 text-red-400 bg-white/[0.02] drop-shadow-[0_0_8px_rgba(239,68,68,0.15)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                <ShieldAlert size={15} />
                <span>Emergency Override</span>
              </button>

              <button
                onClick={() => setActiveTab("care-transfer")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "care-transfer" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                <Users size={15} />
                <span>Care Transfer</span>
              </button>

              <button
                onClick={() => { setActiveTab("transfer-override"); setTransferOverrideSubTab("queue"); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "transfer-override" ? "border-cyber-pink text-cyber-pink bg-white/[0.02] drop-shadow-[0_0_8px_rgba(255,0,128,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                <Shield size={15} />
                <span>Approval Queue</span>
                {overrideList.filter(o => o.status === "active").length > 0 && (
                  <span className="ml-auto bg-cyber-pink text-black text-[9px] font-orbitron font-bold px-1.5 py-0.5 rounded">
                    {overrideList.filter(o => o.status === "active").length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("readme-logs")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border rounded transition-all cursor-pointer text-left ${activeTab === "readme-logs" ? "border-cyber-blue text-cyber-blue bg-white/[0.02] drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                <Terminal size={15} />
                <span>ML Patient Alerts</span>
              </button>
            </>
          )}
        </nav>

        {/* Sidebar Footer Console */}
        <div className="p-4 border-t border-white/10 space-y-3 shrink-0">
          <div className="font-mono text-[9px] text-white/60 bg-white/5 px-3 py-2 border border-white/10 rounded break-all select-all">
            {walletAddress.slice(0, 14)}...{walletAddress.slice(-12)}
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

      {/* Main Panel Content */}
      <main className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto w-full">
        
        {/* Success / Error Alerts */}
        {(error || successMsg) && (
          <div className="flex flex-col gap-3 w-full">
            {error && (
              <div className="p-4 rounded border border-red-500/40 bg-red-950/30 shadow-[0_0_15px_rgba(239,68,68,0.15)] flex items-start gap-3 relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
                <ShieldAlert size={18} className="text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-orbitron uppercase tracking-widest text-red-300 font-black mb-1">Security & System Error</h4>
                  <p className="text-red-200 text-sm font-medium leading-relaxed">{error}</p>
                </div>
                <button
                  onClick={() => setError("")}
                  className="text-red-400/60 hover:text-red-400 text-xs font-orbitron font-bold uppercase cursor-pointer hover:underline self-center px-3 py-1"
                >
                  Dismiss
                </button>
              </div>
            )}
            {successMsg && (
              <div className="p-4 rounded border border-emerald-500/50 bg-emerald-950/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-start gap-3 relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-orbitron uppercase tracking-widest text-emerald-300 font-black mb-1">Action Executed Successfully</h4>
                  <p className="text-emerald-100 text-sm font-medium leading-relaxed">{successMsg}</p>
                </div>
                <button
                  onClick={() => setSuccessMsg("")}
                  className="text-emerald-400/60 hover:text-emerald-400 text-xs font-orbitron font-bold uppercase cursor-pointer hover:underline self-center px-3 py-1"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Hospital KPIs or Patient KPIs (for Doctors) */}
        {activeTab === "kpis" && (() => {
          if (!isAdmin) {
            // Render Doctor Patient KPIs View
            const anomalousCount = doctorPatients.filter(p => p.anomaly_detected).length;
            return (
              <section className="p-6 border border-white/15 bg-white/[0.01] relative rounded space-y-6">
                <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
                <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-blue" />
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Activity className="text-cyber-blue" size={16} />
                    <h3 className="font-orbitron text-xs tracking-widest uppercase text-white font-bold">Doctor Patient Performance Indicators (KPIs)</h3>
                  </div>
                  <button
                    onClick={() => fetchDoctorPatients(walletAddress)}
                    className="text-[10px] font-orbitron uppercase text-cyber-blue flex items-center gap-1.5 border border-cyber-blue/30 bg-cyber-blue/5 px-3 py-1.5 hover:bg-cyber-blue hover:text-black font-bold transition-all cursor-pointer"
                  >
                    <RefreshCw size={10} /> Sync Telemetry
                  </button>
                </div>

                {/* Patient KPI stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
                  <div className="p-5 border border-white/10 bg-white/[0.01] rounded flex flex-col justify-between h-[110px]">
                    <div className="flex justify-between items-start text-white/60">
                      <span className="text-[10px] font-orbitron uppercase tracking-wider font-bold">Patients Under Care</span>
                      <Users size={16} className="text-cyber-blue" />
                    </div>
                    <div className="text-3xl font-black font-orbitron text-white">{doctorPatients.length}</div>
                  </div>

                  <div className={`p-5 border rounded flex flex-col justify-between h-[110px] ${anomalousCount > 0 ? "border-red-500/50 bg-red-950/20 animate-pulse text-red-200" : "border-white/10 bg-white/[0.01] text-white/60"}`}>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-orbitron uppercase tracking-wider font-bold">Anomalous Vitals Warning</span>
                      <ShieldAlert size={16} className={anomalousCount > 0 ? "text-red-500 animate-bounce" : "text-white/40"} />
                    </div>
                    <div className={`text-3xl font-black font-orbitron ${anomalousCount > 0 ? "text-red-500" : "text-white"}`}>{anomalousCount}</div>
                  </div>
                </div>

                {/* Patient vitals list table */}
                <div className="mt-8 border border-white/10 bg-black/40 rounded p-6">
                  <h4 className="font-orbitron text-xs tracking-wider uppercase text-white font-bold mb-4 flex items-center gap-2">
                    <List size={14} className="text-cyber-blue" />
                    <span>Patients Vitals Live Stream Ledger</span>
                  </h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/10 text-white/60 pb-2 uppercase tracking-wider text-[9px]">
                          <th className="py-2 px-2">Patient Name</th>
                          <th className="py-2 px-2">Wallet Address</th>
                          <th className="py-2 px-2">Pulse (BPM)</th>
                          <th className="py-2 px-2">Oxygen (SPO2)</th>
                          <th className="py-2 px-2">Pressure (SYS/DIA)</th>
                          <th className="py-2 px-2">Temp (°C)</th>
                          <th className="py-2 px-2">ML Status</th>
                          <th className="py-2 px-2 text-right">Last Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white">
                        {doctorPatients.map((p) => (
                          <tr key={p.address} className={`hover:bg-white/[0.02] ${p.anomaly_detected ? "bg-red-950/20 text-red-100 animate-pulse font-semibold" : ""}`}>
                            <td className="py-3 px-2 font-bold">{p.name}</td>
                            <td className="py-3 px-2 text-white/50">{p.address}</td>
                            <td className={`py-3 px-2 ${p.heart_rate > 100 || p.heart_rate < 60 ? "text-red-400 font-bold" : "text-green-400"}`}>{p.heart_rate} BPM</td>
                            <td className={`py-3 px-2 ${p.spo2 < 95 ? "text-red-400 font-bold" : "text-green-400"}`}>{p.spo2}%</td>
                            <td className="py-3 px-2">{p.systolic}/{p.diastolic}</td>
                            <td className="py-3 px-2">{p.temperature}°C</td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-0.5 border text-[9px] rounded font-orbitron font-bold ${p.anomaly_detected ? "bg-red-500 text-black border-red-500" : "bg-green-950/20 border-green-500/40 text-green-400"}`}>
                                {p.anomaly_detected ? "ANOMALY DETECTED" : "NOMINAL"}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right text-white/50">{p.last_updated}</td>
                          </tr>
                        ))}
                        {doctorPatients.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-white/40">No patients associated with your credentials.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            );
          }

          // Admin Hospital KPIs rendering
          const totalCensus = kpis.beds_occupied + kpis.discharged + kpis.deceased;
          const occupiedPct = totalCensus > 0 ? Math.round((kpis.beds_occupied / totalCensus) * 100) : 0;
          const dischargedPct = totalCensus > 0 ? Math.round((kpis.discharged / totalCensus) * 100) : 0;
          const deceasedPct = totalCensus > 0 ? Math.round((kpis.deceased / totalCensus) * 100) : 0;

          const inStockDevices = deviceList.filter(d => d.status === "in-stock").length;
          const implantedDevices = deviceList.filter(d => d.status === "implanted").length;
          const recalledDevices = deviceList.filter(d => d.status === "recalled").length;
          const totalDevices = deviceList.length;

          return (
            <section className="p-6 border border-white/15 bg-white/[0.01] relative rounded">
              <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
              <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-blue" />
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Activity className="text-cyber-blue" size={16} />
                  <h3 className="font-orbitron text-xs tracking-widest uppercase text-white font-bold">Hospital Performance Indicators (KPIs)</h3>
                </div>
                <button
                  onClick={fetchKPIs}
                  className="text-[10px] font-orbitron uppercase text-cyber-blue flex items-center gap-1.5 border border-cyber-blue/30 bg-cyber-blue/5 px-3 py-1.5 hover:bg-cyber-blue hover:text-black font-bold transition-all cursor-pointer"
                >
                  <RefreshCw size={10} /> Sync KPIs
                </button>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-5 border border-white/10 bg-white/[0.01] rounded flex flex-col justify-between h-[110px]">
                  <div className="flex justify-between items-start text-white/60">
                    <span className="text-[10px] font-orbitron uppercase tracking-wider font-bold">Total Patients</span>
                    <Users size={16} className="text-cyber-blue" />
                  </div>
                  <div className="text-3xl font-black font-orbitron text-white">{kpis.total_patients}</div>
                </div>

                <div className="p-5 border border-white/10 bg-white/[0.01] rounded flex flex-col justify-between h-[110px]">
                  <div className="flex justify-between items-start text-white/60">
                    <span className="text-[10px] font-orbitron uppercase tracking-wider font-bold">Beds Occupied</span>
                    <Activity size={16} className="text-cyber-blue animate-pulse" />
                  </div>
                  <div className="text-3xl font-black font-orbitron text-cyber-blue">{kpis.beds_occupied}</div>
                </div>

                <div className="p-5 border border-white/10 bg-white/[0.01] rounded flex flex-col justify-between h-[110px]">
                  <div className="flex justify-between items-start text-white/60">
                    <span className="text-[10px] font-orbitron uppercase tracking-wider font-bold">Discharged</span>
                    <CheckCircle size={16} className="text-green-400" />
                  </div>
                  <div className="text-3xl font-black font-orbitron text-green-400">{kpis.discharged}</div>
                </div>

                <div className="p-5 border border-white/10 bg-white/[0.01] rounded flex flex-col justify-between h-[110px]">
                  <div className="flex justify-between items-start text-white/60">
                    <span className="text-[10px] font-orbitron uppercase tracking-wider font-bold">Mortality (Deceased)</span>
                    <ShieldAlert size={16} className="text-red-500" />
                  </div>
                  <div className="text-3xl font-black font-orbitron text-red-500">{kpis.deceased}</div>
                </div>

                <div className="p-5 border border-white/10 bg-white/[0.01] rounded flex flex-col justify-between h-[110px]">
                  <div className="flex justify-between items-start text-white/60">
                    <span className="text-[10px] font-orbitron uppercase tracking-wider font-bold">Active Staff</span>
                    <Stethoscope size={16} className="text-cyber-pink" />
                  </div>
                  <div className="text-3xl font-black font-orbitron text-cyber-pink">{kpis.active_doctors}</div>
                </div>
              </div>

              {/* KPI Visual Analytics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                
                {/* Chart 1: Bed Occupancy & Census Donut */}
                <div className="p-5 border border-white/10 bg-black/40 rounded flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-blue" />
                    <span className="font-orbitron text-xs tracking-wider uppercase text-white/70 font-bold">Patient Census distribution</span>
                  </div>

                  <div className="flex items-center justify-around py-4">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-white/5" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-cyber-blue" strokeDasharray={`${occupiedPct}, 100`} stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="text-center">
                        <div className="text-2xl font-black font-orbitron text-cyber-blue">{kpis.beds_occupied}</div>
                        <div className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Active</div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs font-orbitron">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-cyber-blue rounded-sm" />
                        <div>
                          <div className="font-semibold text-white">Active Bed: {kpis.beds_occupied}</div>
                          <div className="text-[10px] text-white/40">{occupiedPct}% of census</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-400 rounded-sm" />
                        <div>
                          <div className="font-semibold text-white">Discharged: {kpis.discharged}</div>
                          <div className="text-[10px] text-white/40">{dischargedPct}% of census</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-sm" />
                        <div>
                          <div className="font-semibold text-white">Deceased: {kpis.deceased}</div>
                          <div className="text-[10px] text-white/40">{deceasedPct}% of census</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart 2: High-Risk Device Inventory distribution */}
                <div className="p-5 border border-white/10 bg-black/40 rounded flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-pink" />
                    <span className="font-orbitron text-xs tracking-wider uppercase text-white/70 font-bold">High-Risk Implantable Inventory Status</span>
                  </div>

                  <div className="space-y-4 py-2 font-orbitron">
                    
                    {/* Bar 1: In-Stock */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/60">In-Stock Inventory</span>
                        <span className="font-bold text-green-400">{inStockDevices} / {totalDevices || 1} units</span>
                      </div>
                      <div className="h-3 w-full bg-white/5 border border-white/10 rounded-sm overflow-hidden">
                        <div
                          style={{ width: `${totalDevices > 0 ? (inStockDevices / totalDevices) * 100 : 0}%` }}
                          className="h-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.3)] transition-all duration-500"
                        />
                      </div>
                    </div>

                    {/* Bar 2: Implanted */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/60">Active Patient Implants</span>
                        <span className="font-bold text-cyber-blue">{implantedDevices} / {totalDevices || 1} units</span>
                      </div>
                      <div className="h-3 w-full bg-white/5 border border-white/10 rounded-sm overflow-hidden">
                        <div
                          style={{ width: `${totalDevices > 0 ? (implantedDevices / totalDevices) * 100 : 0}%` }}
                          className="h-full bg-cyber-blue shadow-[0_0_8px_rgba(0,243,255,0.3)] transition-all duration-500"
                        />
                      </div>
                    </div>

                    {/* Bar 3: Recalled */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/60">Recalled Devices (Urgent Care)</span>
                        <span className="font-bold text-red-500">{recalledDevices} / {totalDevices || 1} units</span>
                      </div>
                      <div className="h-3 w-full bg-white/5 border border-white/10 rounded-sm overflow-hidden">
                        <div
                          style={{ width: `${totalDevices > 0 ? (recalledDevices / totalDevices) * 100 : 0}%` }}
                          className="h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)] transition-all duration-500"
                        />
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* Compliance Alert & Operations Feed */}
              <div className="mt-8 p-5 border border-white/10 bg-black/40 rounded space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} className="text-cyber-pink animate-pulse" />
                    <span className="font-orbitron text-xs tracking-wider uppercase text-white font-bold">Compliance, Security & Inventory Alerts</span>
                  </div>
                  <span className="text-[9px] font-mono bg-cyber-pink/10 border border-cyber-pink/30 text-cyber-pink px-2 py-0.5 rounded uppercase">Live Stream</span>
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                  
                  {/* Alert 1: Recalled devices outreach */}
                  {recalledDevices > 0 && (
                    <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-200 text-xs flex gap-3 rounded">
                      <ShieldAlert size={16} className="shrink-0 text-red-500 animate-bounce" />
                      <div>
                        <div className="font-bold uppercase tracking-wider text-red-400 font-orbitron">Recall Patient Safety Outreach Active</div>
                        <div className="mt-0.5 text-white/80 font-mono">
                          {recalledDevices} device(s) flagged as RECALLED. Please verify patient records and contact clinical emergency coordinator immediately.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Alert 2: Low Inventory */}
                  {inStockDevices < 3 && (
                    <div className="p-3 bg-yellow-950/20 border border-yellow-500/30 text-yellow-200 text-xs flex gap-3 rounded animate-pulse">
                      <ShieldAlert size={16} className="shrink-0 text-yellow-500" />
                      <div>
                        <div className="font-bold uppercase tracking-wider text-yellow-400 font-orbitron">Low Inventory Alert</div>
                        <div className="mt-0.5 text-white/80 font-mono">
                          Implantable device stock has dropped below reorder threshold. Current stock: <span className="underline font-black">{inStockDevices} unit(s)</span>. Please replenish inventory.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Alert 3: Controlled Substance pending check */}
                  {narcoticLogs.filter(n => n.status === "pending").length > 0 && (
                    <div className="p-3 bg-amber-950/10 border border-amber-500/30 text-amber-200 text-xs flex gap-3 rounded">
                      <Shield size={16} className="shrink-0 text-amber-400" />
                      <div>
                        <div className="font-bold uppercase tracking-wider text-amber-400 font-orbitron">Pending Double-Authorization Signature</div>
                        <div className="mt-0.5 text-white/80 font-mono">
                          {narcoticLogs.filter(n => n.status === "pending").length} narcotic dose request(s) awaiting clinical co-signature clearance.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Alert 4: Override logs */}
                  <div className="p-3 bg-blue-950/20 border border-blue-500/30 text-blue-200 text-xs flex gap-3 rounded">
                    <Activity size={16} className="shrink-0 text-cyber-blue" />
                    <div>
                      <div className="font-bold uppercase tracking-wider text-cyber-blue font-orbitron">On-Chain Emergency Protocol Access Log</div>
                      <div className="mt-0.5 text-white/80 font-mono">
                        [01:14:02 AM] Doctor Robert Chen (0x3C44...) triggered emergency override access sequence for patient vital histories.
                      </div>
                    </div>
                  </div>

                  {/* Alert 5: System Check */}
                  <div className="p-3 bg-white/[0.02] border border-white/10 text-white/70 text-xs flex gap-3 rounded">
                    <CheckCircle size={16} className="shrink-0 text-green-400" />
                    <div>
                      <div className="font-bold uppercase tracking-wider text-white/90 font-orbitron">Consensus Validator Status</div>
                      <div className="mt-0.5 font-mono text-[10px]">
                        Decentralized block indexing online. Heartbeat synced at height #240. S3 private vaults securely isolated.
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </section>
          );
        })()}

        {/* Tab 2: Patient Admission Form */}
        {activeTab === "admit" && (
          <div className="p-6 border border-white/15 bg-white/[0.01] relative rounded">
            <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
            <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-blue" />

            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="text-cyber-blue" size={16} />
              <h3 className="font-orbitron text-xs tracking-widest uppercase text-white font-bold">Admit New Patient (On-Chain SBT Mint)</h3>
            </div>

            <form onSubmit={handleAdmit} className="space-y-5 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Wallet Address (MetaMask Address)</label>
                  <input
                    type="text"
                    required
                    placeholder="0x..."
                    value={admitAddress}
                    onChange={(e) => setAdmitAddress(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white focus:border-cyber-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={admitName}
                    onChange={(e) => setAdmitName(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={admitDOB}
                    onChange={(e) => setAdmitDOB(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Blood Group</label>
                  <select
                    value={admitBloodGroup}
                    onChange={(e) => setAdmitBloodGroup(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                  >
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="Relationship / Phone"
                    value={admitEmergency}
                    onChange={(e) => setAdmitEmergency(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Aadhaar Card Number</label>
                  <input
                    type="text"
                    placeholder="12-digit Aadhaar Number"
                    maxLength={12}
                    value={admitAadhaarNum}
                    onChange={(e) => setAdmitAadhaarNum(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white focus:border-cyber-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">PAN Card Number</label>
                  <input
                    type="text"
                    placeholder="10-digit PAN ID"
                    maxLength={10}
                    value={admitPanNum}
                    onChange={(e) => setAdmitPanNum(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white focus:border-cyber-blue focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Allergies / Critical Medical Notices</label>
                <input
                  type="text"
                  placeholder="None"
                  value={admitAllergies}
                  onChange={(e) => setAdmitAllergies(e.target.value)}
                  className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                />
              </div>

              {/* Patient KYC Upload Zones */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Profile Photo</label>
                  <div className="border border-dashed border-white/20 p-5 text-center cursor-pointer hover:border-cyber-blue bg-black/60 rounded">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAdmitAvatar(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                      id="avatar-file-input"
                    />
                    <label htmlFor="avatar-file-input" className="cursor-pointer">
                      <Camera className="mx-auto text-white/70 mb-2" size={22} />
                      <span className="text-xs text-white hover:text-cyber-blue block font-semibold truncate max-w-[180px]">
                        {admitAvatar ? admitAvatar.name : "Upload photo"}
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Aadhaar PDF</label>
                  <div className="border border-dashed border-white/20 p-5 text-center cursor-pointer hover:border-cyber-blue bg-black/60 rounded">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setAdmitAadhaarFile(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                      id="aadhaar-file-input"
                    />
                    <label htmlFor="aadhaar-file-input" className="cursor-pointer">
                      <Landmark className="mx-auto text-white/70 mb-2" size={22} />
                      <span className="text-xs text-white hover:text-cyber-blue block font-semibold truncate max-w-[180px]">
                        {admitAadhaarFile ? admitAadhaarFile.name : "Upload Aadhaar"}
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">PAN Card Document</label>
                  <div className="border border-dashed border-white/20 p-5 text-center cursor-pointer hover:border-cyber-blue bg-black/60 rounded">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setAdmitPanFile(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                      id="pan-file-input"
                    />
                    <label htmlFor="pan-file-input" className="cursor-pointer">
                      <CreditCard className="mx-auto text-white/70 mb-2" size={22} />
                      <span className="text-xs text-white hover:text-cyber-blue block font-semibold truncate max-w-[180px]">
                        {admitPanFile ? admitPanFile.name : "Upload PAN"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAdmitting || !isAdmin}
                className="w-full bg-cyber-blue text-black font-orbitron font-bold py-4 text-sm tracking-wider uppercase hover:bg-cyber-blue/80 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isAdmitting ? "Broadcasting SBT Mint & Uploading KYC..." : (isAdmin ? "Submit Admission" : "Admin Signer Clearance Required")}
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Admit Doctor Form */}
        {activeTab === "admit-doc" && (
          <div className="p-6 border border-white/15 bg-white/[0.01] relative rounded">
            <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
            <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-blue" />

            <div className="flex items-center gap-2 mb-6">
              <Stethoscope className="text-cyber-blue" size={16} />
              <h3 className="font-orbitron text-xs tracking-widest uppercase text-white font-bold">Register Soulbound Doctor Credentials</h3>
            </div>

            <form onSubmit={handleAdmitDoctor} className="space-y-5 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Doctor Wallet Address</label>
                  <input
                    type="text"
                    required
                    placeholder="0x..."
                    value={admitDocAddress}
                    onChange={(e) => setAdmitDocAddress(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white focus:border-cyber-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. John Doe"
                    value={admitDocName}
                    onChange={(e) => setAdmitDocName(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Department Specialization</label>
                  <select
                    value={admitDocSpecialization}
                    onChange={(e) => setAdmitDocSpecialization(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                  >
                    {[
                      "Cardiology", 
                      "Neurology", 
                      "Pediatrics", 
                      "Oncology", 
                      "Radiology", 
                      "General Medicine", 
                      "Orthopedics", 
                      "Dermatology", 
                      "Psychiatry", 
                      "Emergency Medicine", 
                      "General Surgery", 
                      "Obstetrics & Gynecology", 
                      "Ophthalmology", 
                      "Urology", 
                      "Gastroenterology", 
                      "Pulmonology", 
                      "Administrative Medicine"
                    ].map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Internal Employee ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-2026-904"
                    value={admitDocEmpID}
                    onChange={(e) => setAdmitDocEmpID(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Contact Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={admitDocContact}
                    onChange={(e) => setAdmitDocContact(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Aadhaar Card Number</label>
                  <input
                    type="text"
                    placeholder="12-digit Aadhaar"
                    maxLength={12}
                    value={admitDocAadhaarNum}
                    onChange={(e) => setAdmitDocAadhaarNum(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white focus:border-cyber-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">PAN Card Number</label>
                  <input
                    type="text"
                    placeholder="10-digit PAN"
                    maxLength={10}
                    value={admitDocPanNum}
                    onChange={(e) => setAdmitDocPanNum(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white focus:border-cyber-blue focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Home Address</label>
                <input
                  type="text"
                  placeholder="Street details, City, Pin Code"
                  value={admitDocHome}
                  onChange={(e) => setAdmitDocHome(e.target.value)}
                  className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                />
              </div>

              {/* Doctor KYC & Photo Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Aadhaar card PDF</label>
                  <div className="border border-dashed border-white/20 p-5 text-center cursor-pointer hover:border-cyber-blue bg-black/60 rounded">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setAdmitDocAadhaarFile(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                      id="doc-aadhaar-input"
                    />
                    <label htmlFor="doc-aadhaar-input" className="cursor-pointer">
                      <Landmark className="mx-auto text-white/70 mb-2" size={22} />
                      <span className="text-xs text-white hover:text-cyber-blue block font-semibold truncate">
                        {admitDocAadhaarFile ? admitDocAadhaarFile.name : "Select Aadhaar document"}
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">PAN card PDF</label>
                  <div className="border border-dashed border-white/20 p-5 text-center cursor-pointer hover:border-cyber-blue bg-black/60 rounded">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setAdmitDocPanFile(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                      id="doc-pan-input"
                    />
                    <label htmlFor="doc-pan-input" className="cursor-pointer">
                      <CreditCard className="mx-auto text-white/70 mb-2" size={22} />
                      <span className="text-xs text-white hover:text-cyber-blue block font-semibold truncate">
                        {admitDocPanFile ? admitDocPanFile.name : "Select PAN document"}
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Profile Photo (Avatar)</label>
                  <div className="border border-dashed border-white/20 p-5 text-center cursor-pointer hover:border-cyber-blue bg-black/60 rounded">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAdmitDocAvatar(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                      id="doc-avatar-input"
                    />
                    <label htmlFor="doc-avatar-input" className="cursor-pointer">
                      <Camera className="mx-auto text-white/70 mb-2" size={22} />
                      <span className="text-xs text-white hover:text-cyber-blue block font-semibold truncate">
                        {admitDocAvatar ? admitDocAvatar.name : "Upload Profile Avatar"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAdmittingDoc || !isAdmin}
                className="w-full bg-cyber-blue text-black font-orbitron font-bold py-4 text-sm tracking-wider uppercase hover:bg-cyber-blue/80 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isAdmittingDoc ? "Admitting Employee..." : (isAdmin ? "Register Doctor & Upload KYC" : "Admin Signer Clearance Required")}
              </button>
            </form>
          </div>
        )}

        {activeTab === "modify" && (
          <div className="p-6 border border-white/15 bg-white/[0.01] relative rounded">
            <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
            <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-blue" />

            <div className="flex items-center gap-2 pb-4 border-b border-white/10 mb-6">
              <Edit className="text-cyber-blue" size={16} />
              <h3 className="font-orbitron text-xs tracking-widest uppercase text-white font-bold">
                {modifySubTab === "patient" ? "Modify Patient Profile" : "Modify Doctor Profile"}
              </h3>
            </div>

            {/* Sub-Tab 1: Modify Patient Profile */}
            {modifySubTab === "patient" && (
              <div className="space-y-5">
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/5 pb-4">
                    <h4 className="text-xs font-orbitron uppercase text-white/50 tracking-widest font-black">Admitted Patient Registry</h4>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-orbitron uppercase text-white/40 tracking-wider">Filter:</span>
                      <div className="flex bg-black/40 border border-white/10 p-0.5 rounded">
                        {["all", "active", "discharged", "deceased"].map((status) => (
                          <button
                            key={status}
                            onClick={() => setPatientStatusFilter(status)}
                            className={`px-3 py-1 text-[10px] font-orbitron uppercase tracking-wider transition-all rounded ${
                              patientStatusFilter === status
                                ? "bg-cyber-blue text-black font-bold"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {(() => {
                    const doctorFiltered = admittedPatients.filter(p => {
                      if (!isAdmin && isDoctor) {
                        return doctorPatients.some(dp => dp.address.toLowerCase() === p.address.toLowerCase());
                      }
                      return true;
                    });
                    const finalFiltered = doctorFiltered.filter(p => patientStatusFilter === "all" || (p.status || "active").toLowerCase() === patientStatusFilter.toLowerCase());

                    if (doctorFiltered.length === 0) {
                      return (
                        <div className="text-center py-8 text-white/40 border border-dashed border-white/10 rounded">
                          No patients associated under your credentials yet.
                        </div>
                      );
                    }

                    if (finalFiltered.length === 0) {
                      return (
                        <div className="text-center py-12 text-white/40 border border-dashed border-white/10 rounded">
                          No patients matched the status filter: <span className="text-cyber-pink font-bold uppercase">{patientStatusFilter}</span>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                        {finalFiltered.map(p => (
                          <div
                            key={p.address}
                            onClick={() => handleLoadPatientDetails(p.address)}
                            className="border border-white/10 hover:border-cyber-blue/50 bg-black/40 hover:bg-white/[0.02] p-10 rounded transition-all cursor-pointer flex flex-col items-center text-center gap-6 relative group shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                          >
                            <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-cyber-blue opacity-50 group-hover:opacity-100" />
                            
                            {p.avatar_url ? (
                              <img 
                                src={p.avatar_url} 
                                alt={p.name} 
                                className="w-36 h-36 rounded-full border-2 border-white/10 object-cover shadow-[0_0_20px_rgba(0,243,255,0.2)] group-hover:border-cyber-blue/50 transition-all"
                              />
                            ) : (
                              <div className="w-36 h-36 rounded-full border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-white/40 group-hover:border-cyber-blue/30 transition-all">
                                <Users size={54} />
                              </div>
                            )}
                            
                            <div className="space-y-1.5">
                              <h5 className="font-orbitron font-bold text-lg sm:text-xl text-white group-hover:text-cyber-blue transition-colors truncate max-w-[280px]">
                                {p.name}
                              </h5>
                              <p className="text-xs sm:text-sm font-semibold text-cyber-pink uppercase tracking-wider">
                                Status: {p.status || "active"} | {p.blood_group || "O+"}
                              </p>
                              <p className="font-mono text-xs sm:text-sm text-white/40 select-all break-all">
                                {p.address.slice(0, 12)}...{p.address.slice(-10)}
                              </p>
                            </div>
                            
                            <span className="text-xs sm:text-sm font-orbitron uppercase tracking-widest text-cyber-blue opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                              Click to Edit
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>


                {/* Edit Patient Modal */}
                {editPatientAddress && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
                    <div className="w-full max-w-[90vw] xl:max-w-[85vw] border border-white/20 bg-black/95 p-8 sm:p-10 rounded relative shadow-[0_0_60px_rgba(0,243,255,0.25)] max-h-[92vh] overflow-y-auto">
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
                      <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-blue" />
                      <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-cyber-blue" />
                      <div className="absolute bottom-0 right-0 w-[2px] h-8 bg-cyber-blue" />

                      {/* Close button */}
                      <button 
                        onClick={() => setEditPatientAddress("")}
                        className="absolute top-4 right-4 text-white/50 hover:text-white font-orbitron uppercase text-xs tracking-widest cursor-pointer px-3 py-1.5 border border-white/10 hover:border-white/30 rounded transition-all"
                      >
                        Close
                      </button>

                      <div className="flex items-center gap-2 pb-4 border-b border-white/10 mb-6">
                        <Edit className="text-cyber-blue" size={16} />
                        <h3 className="font-orbitron text-sm tracking-widest uppercase text-white font-bold">Edit Patient Profile</h3>
                      </div>

                      <form onSubmit={handleUpdatePatient} className="space-y-5 w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Full Name</label>
                            <input
                              type="text"
                              required
                              value={editPatientName}
                              onChange={(e) => setEditPatientName(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Patient Account Status</label>
                            <select
                              value={editPatientStatus}
                              onChange={(e) => setEditPatientStatus(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                            >
                              <option value="active">Active (Bed Occupied)</option>
                              <option value="discharged">Discharged</option>
                              <option value="deceased">Deceased</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Date of Birth</label>
                            <input
                              type="date"
                              required
                              value={editPatientDOB}
                              onChange={(e) => setEditPatientDOB(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Blood Group</label>
                            <select
                              value={editPatientBloodGroup}
                              onChange={(e) => setEditPatientBloodGroup(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                            >
                              {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (
                                <option key={bg} value={bg}>{bg}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Emergency Contact</label>
                            <input
                              type="text"
                              value={editPatientEmergency}
                              onChange={(e) => setEditPatientEmergency(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Aadhaar Card Number</label>
                            <input
                              type="text"
                              maxLength={12}
                              value={editPatientAadhaarNum}
                              onChange={(e) => setEditPatientAadhaarNum(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white focus:border-cyber-blue focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">PAN Card Number</label>
                            <input
                              type="text"
                              maxLength={10}
                              value={editPatientPanNum}
                              onChange={(e) => setEditPatientPanNum(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white focus:border-cyber-blue focus:outline-none uppercase"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Allergies / Critical Medical Notices</label>
                          <input
                            type="text"
                            value={editPatientAllergies}
                            onChange={(e) => setEditPatientAllergies(e.target.value)}
                            className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                          />
                        </div>

                        {/* Replacement File Selectors */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Aadhaar PDF (Replace current)</label>
                            <div className="border border-dashed border-white/20 p-5 text-center cursor-pointer hover:border-cyber-blue bg-black/60 rounded">
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => setEditPatientAadhaarFile(e.target.files ? e.target.files[0] : null)}
                                className="hidden"
                                id="edit-aadhaar-input"
                              />
                              <label htmlFor="edit-aadhaar-input" className="cursor-pointer">
                                <Landmark className="mx-auto text-white/70 mb-2" size={22} />
                                <span className="text-xs text-white block hover:text-cyber-blue font-semibold truncate">
                                  {editPatientAadhaarFile ? editPatientAadhaarFile.name : "Choose file"}
                                </span>
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">PAN PDF (Replace current)</label>
                            <div className="border border-dashed border-white/20 p-5 text-center cursor-pointer hover:border-cyber-blue bg-black/60 rounded">
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => setEditPatientPanFile(e.target.files ? e.target.files[0] : null)}
                                className="hidden"
                                id="edit-pan-input"
                              />
                              <label htmlFor="edit-pan-input" className="cursor-pointer">
                                <CreditCard className="mx-auto text-white/70 mb-2" size={22} />
                                <span className="text-xs text-white block hover:text-cyber-blue font-semibold truncate">
                                  {editPatientPanFile ? editPatientPanFile.name : "Choose file"}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingPatient}
                          className="w-full bg-cyber-blue text-black font-orbitron font-bold py-4 text-sm tracking-wider uppercase hover:bg-cyber-blue/80 transition-all cursor-pointer disabled:opacity-30"
                        >
                          {isSavingPatient ? "Saving Patient Updates..." : "Save Patient Changes"}
                        </button>
                      </form>

                      <div className="border-t border-white/10 mt-8 pt-6">
                        <h4 className="text-xs font-orbitron uppercase text-white/50 tracking-widest font-black mb-4">Patient Clinical Reports & Records</h4>
                        
                        {patientReports.length === 0 ? (
                          <div className="text-center py-8 text-white/30 border border-dashed border-white/10 rounded text-xs">
                            No medical records uploaded for this patient yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left font-mono text-xs border border-white/10 rounded overflow-hidden">
                              <thead>
                                <tr className="bg-white/5 text-white/40 uppercase text-[10px] tracking-wider border-b border-white/10">
                                  <th className="p-3">Date</th>
                                  <th className="p-3">Diagnosis</th>
                                  <th className="p-3">Doctor</th>
                                  <th className="p-3">Doc Type</th>
                                  <th className="p-3 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {patientReports.map((rep) => (
                                  <tr key={rep.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-3 text-white/50">{rep.date || rep.created_at}</td>
                                    <td className="p-3 text-white font-bold">{rep.diagnosis}</td>
                                    <td className="p-3 text-cyber-blue select-all text-[10px]">{rep.doctor}</td>
                                    <td className="p-3 text-cyber-pink uppercase font-semibold text-[10px] tracking-wider">{rep.doc_type || rep.document_type}</td>
                                    <td className="p-3 text-right">
                                      <a
                                        href={rep.download_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyber-pink/10 hover:bg-cyber-pink text-cyber-pink hover:text-black font-orbitron font-bold uppercase text-[10px] tracking-wider rounded transition-all cursor-pointer"
                                      >
                                        Download PDF
                                      </a>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 2: Modify Doctor Profile */}
            {modifySubTab === "doctor" && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-orbitron uppercase text-white/50 tracking-widest font-black mb-4">Registered Medical Staff</h4>
                  
                  {doctorsList.length === 0 ? (
                    <div className="text-center py-8 text-white/40 border border-dashed border-white/10 rounded">
                      No doctors registered in this system yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                      {doctorsList.map(d => (
                        <div
                          key={d.address}
                          onClick={() => handleLoadDoctorDetails(d.address)}
                          className="border border-white/10 hover:border-cyber-blue/50 bg-black/40 hover:bg-white/[0.02] p-10 rounded transition-all cursor-pointer flex flex-col items-center text-center gap-6 relative group shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                        >
                          <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-cyber-blue opacity-50 group-hover:opacity-100" />
                          
                          {d.avatar_url ? (
                            <img 
                              src={d.avatar_url} 
                              alt={d.name} 
                              className="w-36 h-36 rounded-full border-2 border-white/10 object-cover shadow-[0_0_20px_rgba(0,243,255,0.2)] group-hover:border-cyber-blue/50 transition-all"
                            />
                          ) : (
                            <div className="w-36 h-36 rounded-full border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-white/40 group-hover:border-cyber-blue/30 transition-all">
                              <Stethoscope size={54} />
                            </div>
                          )}
                          
                          <div className="space-y-1.5">
                            <h5 className="font-orbitron font-bold text-lg sm:text-xl text-white group-hover:text-cyber-blue transition-colors truncate max-w-[280px]">
                              {d.name}
                            </h5>
                            <p className="text-xs sm:text-sm font-semibold text-cyber-blue mt-0.5 uppercase tracking-wider">
                              {d.specialization} | Status: {d.status || "active"}
                            </p>
                            <p className="font-mono text-xs sm:text-sm text-white/40 select-all break-all">
                              {d.address.slice(0, 12)}...{d.address.slice(-10)}
                            </p>
                          </div>
                          
                          <span className="text-xs sm:text-sm font-orbitron uppercase tracking-widest text-cyber-blue opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                            Click to Edit
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit Doctor Modal */}
                {editDocAddress && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
                    <div className="w-full max-w-[90vw] xl:max-w-[85vw] border border-white/20 bg-black/95 p-8 sm:p-10 rounded relative shadow-[0_0_60px_rgba(0,243,255,0.25)] max-h-[92vh] overflow-y-auto">
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
                      <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-blue" />
                      <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-cyber-blue" />
                      <div className="absolute bottom-0 right-0 w-[2px] h-8 bg-cyber-blue" />

                      {/* Close button */}
                      <button 
                        onClick={() => setEditDocAddress("")}
                        className="absolute top-4 right-4 text-white/50 hover:text-white font-orbitron uppercase text-xs tracking-widest cursor-pointer px-3 py-1.5 border border-white/10 hover:border-white/30 rounded transition-all"
                      >
                        Close
                      </button>

                      <div className="flex items-center gap-2 pb-4 border-b border-white/10 mb-6">
                        <Edit className="text-cyber-blue" size={16} />
                        <h3 className="font-orbitron text-sm tracking-widest uppercase text-white font-bold">Edit Doctor Profile</h3>
                      </div>

                      <form onSubmit={handleUpdateDoctor} className="space-y-5 w-full">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Full Name</label>
                            <input
                              type="text"
                              required
                              value={editDocName}
                              onChange={(e) => setEditDocName(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Specialization Department</label>
                            <select
                              value={editDocSpecialization}
                              onChange={(e) => setEditDocSpecialization(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                            >
                              {[
                                "Cardiology", 
                                "Neurology", 
                                "Pediatrics", 
                                "Oncology", 
                                "Radiology", 
                                "General Medicine", 
                                "Orthopedics", 
                                "Dermatology", 
                                "Psychiatry", 
                                "Emergency Medicine", 
                                "General Surgery", 
                                "Obstetrics & Gynecology", 
                                "Ophthalmology", 
                                "Urology", 
                                "Gastroenterology", 
                                "Pulmonology", 
                                "Administrative Medicine"
                              ].map(spec => (
                                <option key={spec} value={spec}>{spec}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Doctor Account Status</label>
                            <select
                              value={editDocStatus}
                              onChange={(e) => setEditDocStatus(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                            >
                              <option value="active">Active (On Duty)</option>
                              <option value="inactive">Inactive / On Leave</option>
                              <option value="resigned">Resigned</option>
                              <option value="deceased">Deceased</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Employee ID</label>
                            <input
                              type="text"
                              required
                              value={editDocEmpID}
                              onChange={(e) => setEditDocEmpID(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Contact Number</label>
                            <input
                              type="text"
                              required
                              value={editDocContact}
                              onChange={(e) => setEditDocContact(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Aadhaar Card Number</label>
                            <input
                              type="text"
                              maxLength={12}
                              value={editDocAadhaarNum}
                              onChange={(e) => setEditDocAadhaarNum(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white focus:border-cyber-blue focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">PAN Card Number</label>
                            <input
                              type="text"
                              maxLength={10}
                              value={editDocPanNum}
                              onChange={(e) => setEditDocPanNum(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white focus:border-cyber-blue focus:outline-none uppercase"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Home Address</label>
                          <input
                            type="text"
                            value={editDocHome}
                            onChange={(e) => setEditDocHome(e.target.value)}
                            className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-blue focus:outline-none"
                          />
                        </div>

                        {/* Replacement File Selectors */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Aadhaar PDF (Replace current)</label>
                            <div className="border border-dashed border-white/20 p-5 text-center cursor-pointer hover:border-cyber-blue bg-black/60 rounded">
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => setEditDocAadhaarFile(e.target.files ? e.target.files[0] : null)}
                                className="hidden"
                                id="edit-doc-aadhaar"
                              />
                              <label htmlFor="edit-doc-aadhaar" className="cursor-pointer">
                                <Landmark className="mx-auto text-white/70 mb-2" size={22} />
                                <span className="text-xs text-white block hover:text-cyber-blue font-semibold truncate">
                                  {editDocAadhaarFile ? editDocAadhaarFile.name : "Choose file"}
                                </span>
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">PAN PDF (Replace current)</label>
                            <div className="border border-dashed border-white/20 p-5 text-center cursor-pointer hover:border-cyber-blue bg-black/60 rounded">
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => setEditDocPanFile(e.target.files ? e.target.files[0] : null)}
                                className="hidden"
                                id="edit-doc-pan"
                              />
                              <label htmlFor="edit-doc-pan" className="cursor-pointer">
                                <CreditCard className="mx-auto text-white/70 mb-2" size={22} />
                                <span className="text-xs text-white block hover:text-cyber-blue font-semibold truncate">
                                  {editDocPanFile ? editDocPanFile.name : "Choose file"}
                                </span>
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Profile Photo (Replace current)</label>
                            <div className="border border-dashed border-white/20 p-5 text-center cursor-pointer hover:border-cyber-blue bg-black/60 rounded">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setEditDocAvatar(e.target.files ? e.target.files[0] : null)}
                                className="hidden"
                                id="edit-doc-avatar-input"
                              />
                              <label htmlFor="edit-doc-avatar-input" className="cursor-pointer">
                                <Camera className="mx-auto text-white/70 mb-2" size={22} />
                                <span className="text-xs text-white block hover:text-cyber-blue font-semibold truncate">
                                  {editDocAvatar ? editDocAvatar.name : "Choose new photo"}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingDoc}
                          className="w-full bg-cyber-blue text-black font-orbitron font-bold py-4 text-sm tracking-wider uppercase hover:bg-cyber-blue/80 transition-all cursor-pointer disabled:opacity-30"
                        >
                          {isSavingDoc ? "Saving Doctor Updates..." : "Save Doctor Changes"}
                        </button>
                      </form>

                      <div className="border-t border-white/10 mt-8 pt-6">
                        <h4 className="text-xs font-orbitron uppercase text-white/50 tracking-widest font-black mb-4">Doctor Assignments & Action History</h4>
                        
                        {doctorActivity.length === 0 ? (
                          <div className="text-center py-8 text-white/30 border border-dashed border-white/10 rounded text-xs">
                            No recorded clinical activity or assignments found for this physician.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left font-mono text-xs border border-white/10 rounded overflow-hidden">
                              <thead>
                                <tr className="bg-white/5 text-white/40 uppercase text-[10px] tracking-wider border-b border-white/10">
                                  <th className="p-3">Timestamp</th>
                                  <th className="p-3">Category</th>
                                  <th className="p-3">Action Details</th>
                                  <th className="p-3">Target Patient Address</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {doctorActivity.map((act, index) => (
                                  <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-3 text-white/50">{act.timestamp}</td>
                                    <td className="p-3">
                                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold border ${
                                        act.type === "Implantable" ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" :
                                        act.type === "Narcotics" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                                        "bg-purple-500/10 border-purple-500/30 text-purple-400"
                                      }`}>
                                        {act.type}
                                      </span>
                                    </td>
                                    <td className="p-3 text-white font-bold">{act.details}</td>
                                    <td className="p-3 text-cyber-blue select-all text-[10px]">{act.patient || "N/A"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Regulatory Ledger */}
        {activeTab === "regulatory" && (
          <div className="p-6 border border-white/15 bg-white/[0.01] relative rounded">
            <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
            <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-blue" />

            {/* Sub-selector Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex gap-4 font-orbitron font-bold text-xs">
                <button
                  onClick={() => setRegSubTab("implant")}
                  className={`pb-2 transition-all cursor-pointer ${regSubTab === "implant" ? "border-b-2 border-cyber-blue text-cyber-blue" : "text-white/60 hover:text-white"}`}
                >
                  Implantable Asset Ledger (Recall Tracing)
                </button>
                <button
                  onClick={() => setRegSubTab("narcotics")}
                  className={`pb-2 transition-all cursor-pointer ${regSubTab === "narcotics" ? "border-b-2 border-cyber-blue text-cyber-blue" : "text-white/60 hover:text-white"}`}
                >
                  Controlled Substances Queue (Narcotics Auth)
                </button>
                <button
                  onClick={() => setRegSubTab("medicines")}
                  className={`pb-2 transition-all cursor-pointer ${regSubTab === "medicines" ? "border-b-2 border-cyber-blue text-cyber-blue" : "text-white/60 hover:text-white"}`}
                >
                  Medicine Catalog Inventory (Edit & List)
                </button>
              </div>
            </div>

            {/* Sub-Tab 1: Implantable Device Asset Ledger */}
            {regSubTab === "implant" && (
              <div className="space-y-6">
                
                {/* Recall Critical Warning Board */}
                {recalledDeviceAlert && (
                  <div className="p-4 border border-red-500/50 bg-red-950/20 text-red-200 text-xs font-semibold space-y-2 rounded animate-pulse">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={16} className="text-red-500 shrink-0" />
                      <span className="font-orbitron font-black uppercase text-red-500 tracking-wider">CRITICAL RECALL PATIENT OUTREACH ALARM</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-[11px] pt-1">
                      <div>Device Name: <span className="text-white font-bold">{recalledDeviceAlert.name}</span></div>
                      <div>Serial Number: <span className="text-white font-bold">{recalledDeviceAlert.serial}</span></div>
                      <div>Patient Name: <span className="text-white font-bold">{recalledDeviceAlert.patientName}</span></div>
                      <div>Contact Phone: <span className="text-red-400 font-black underline select-all">{recalledDeviceAlert.patientPhone}</span></div>
                    </div>
                    <div className="text-[10px] text-red-300 italic">Please contact patient immediately to coordinate medical evaluation and hardware check.</div>
                  </div>
                )}

                {/* Forms grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Register Device Form */}
                  <div className="p-4 border border-white/10 bg-black/40 rounded space-y-4">
                    <h4 className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5">
                      <Landmark size={14} className="text-cyber-blue" />
                      <span>Register Device to Inventory</span>
                    </h4>
                    <form onSubmit={handleRegisterDevice} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-orbitron uppercase text-white font-bold mb-1">Device Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Cardiac Pacemaker"
                          value={regDeviceName}
                          onChange={(e) => setRegDeviceName(e.target.value)}
                          className="w-full bg-black border border-white/20 px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-orbitron uppercase text-white font-bold mb-1">Serial Number</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. SN-XYZ-904"
                            value={regSerialNumber}
                            onChange={(e) => setRegSerialNumber(e.target.value)}
                            className="w-full bg-black border border-white/20 px-3 py-2 text-xs font-mono text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-orbitron uppercase text-white font-bold mb-1">Manufacturer</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Medtronic"
                            value={regManufacturer}
                            onChange={(e) => setRegManufacturer(e.target.value)}
                            className="w-full bg-black border border-white/20 px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isRegisteringDevice}
                        className="w-full bg-cyber-blue text-black font-orbitron font-bold py-2 text-xs uppercase tracking-wider hover:bg-cyber-blue/80"
                      >
                        {isRegisteringDevice ? "Registering..." : "Add to Stock"}
                      </button>
                    </form>
                  </div>

                  {/* Log Implantation Form */}
                  <div className="p-4 border border-white/10 bg-black/40 rounded space-y-4">
                    <h4 className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5">
                      <Stethoscope size={14} className="text-cyber-blue" />
                      <span>Log Patient Implantation</span>
                    </h4>
                    <form onSubmit={handleImplantDevice} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-orbitron uppercase text-white font-bold mb-1">Select In-Stock Serial Number</label>
                        <select
                          required
                          value={impSerialNumber}
                          onChange={(e) => setImpSerialNumber(e.target.value)}
                          className="w-full bg-black border border-white/20 px-3 py-2 text-xs font-mono text-white focus:outline-none"
                        >
                          <option value="">-- Choose Serial Number --</option>
                          {deviceList.filter(d => d.status === "in-stock").map(d => (
                            <option key={d.serial_number} value={d.serial_number}>{d.device_name} ({d.serial_number})</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-orbitron uppercase text-white font-bold mb-1">Surgeon In Charge</label>
                          <select
                            required
                            value={impDoctorAddr}
                            onChange={(e) => setImpDoctorAddr(e.target.value)}
                            className="w-full bg-black border border-white/20 px-3 py-2 text-xs text-white focus:outline-none"
                          >
                            <option value="">-- Select Surgeon --</option>
                            {doctorsList.map(d => (
                              <option key={d.address} value={d.address}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-orbitron uppercase text-white font-bold mb-1">Target Patient</label>
                          <select
                            required
                            value={impPatientAddr}
                            onChange={(e) => setImpPatientAddr(e.target.value)}
                            className="w-full bg-black border border-white/20 px-3 py-2 text-xs text-white focus:outline-none"
                          >
                            <option value="">-- Select Patient --</option>
                            {admittedPatients.map(p => (
                              <option key={p.address} value={p.address}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isLoggingImplant}
                        className="w-full bg-cyber-blue text-black font-orbitron font-bold py-2 text-xs uppercase tracking-wider hover:bg-cyber-blue/80"
                      >
                        {isLoggingImplant ? "Logging Implantation..." : "Finalize Implantation"}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Ledger Grid */}
                <div className="border border-white/10 bg-black/40 rounded p-4 space-y-3">
                  <h4 className="font-orbitron text-xs text-white font-bold">Implantable Devices Asset Ledger</h4>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase font-orbitron">
                          <th className="py-2">Serial Number</th>
                          <th className="py-2">Device Name</th>
                          <th className="py-2">Manufacturer</th>
                          <th className="py-2">Patient Address</th>
                          <th className="py-2">Surgeon</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deviceList.map((d) => (
                          <tr key={d.serial_number} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-3 font-semibold text-white">{d.serial_number}</td>
                            <td className="py-3">{d.device_name}</td>
                            <td className="py-3">{d.manufacturer}</td>
                            <td className="py-3 truncate max-w-[120px]" title={d.patient_address}>
                              {d.patient_address ? `${d.patient_address.slice(0, 10)}...` : <span className="text-white/30 italic">None</span>}
                            </td>
                            <td className="py-3 truncate max-w-[120px]" title={d.implanted_by}>
                              {d.implanted_by ? `${d.implanted_by.slice(0, 10)}...` : <span className="text-white/30 italic">None</span>}
                            </td>
                            <td className="py-3">
                              {d.status === "in-stock" && <span className="bg-green-500/10 border border-green-500/30 text-green-400 px-2 py-0.5 rounded text-[10px]">In Stock</span>}
                              {d.status === "implanted" && <span className="bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue px-2 py-0.5 rounded text-[10px]">Implanted</span>}
                              {d.status === "recalled" && <span className="bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 rounded text-[10px] animate-pulse">RECALLED</span>}
                            </td>
                            <td className="py-3 text-right">
                              {d.status === "implanted" && (
                                <button
                                  onClick={() => handleRecallDevice(d.serial_number)}
                                  className="bg-red-500 hover:bg-red-600 text-black font-orbitron text-[9px] uppercase px-2.5 py-1 font-bold"
                                >
                                  Recall
                                </button>
                              )}
                              {d.status !== "implanted" && <span className="text-white/30 italic text-[10px]">Locked</span>}
                            </td>
                          </tr>
                        ))}
                        {deviceList.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-white/40 italic">No devices registered in ledger.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Controlled Substances Authorization Queue */}
            {regSubTab === "narcotics" && (
              <div className="space-y-6">
                
                {/* Form to Request narcotic dose */}
                <div className="p-4 border border-white/10 bg-black/40 rounded space-y-4">
                  <h4 className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5">
                    <Shield size={14} className="text-cyber-pink" />
                    <span>File Controlled Narcotic Request</span>
                  </h4>
                  <form onSubmit={handleRequestNarcotic} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-orbitron uppercase text-white font-bold mb-1">Substance</label>
                        <select
                          value={reqDrugName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReqDrugName(val);
                            const selected = medicineList.find(m => m.drug_name === val);
                            if (selected) {
                              setReqDosage(selected.dosage_strength);
                            }
                          }}
                          className="w-full bg-black border border-white/20 px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="">-- Select Medicine --</option>
                          {medicineList.map(med => (
                            <option key={med.id} value={med.drug_name}>{med.drug_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-orbitron uppercase text-white font-bold mb-1">Dosage</label>
                        <input
                          type="text"
                          required
                          value={reqDosage}
                          onChange={(e) => setReqDosage(e.target.value)}
                          className="w-full bg-black border border-white/20 px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-orbitron uppercase text-white font-bold mb-1">Requester Doctor</label>
                        <select
                          required
                          value={reqDoctorAddr}
                          onChange={(e) => setReqDoctorAddr(e.target.value)}
                          className="w-full bg-black border border-white/20 px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="">-- Select Physician --</option>
                          {doctorsList.map(d => (
                            <option key={d.address} value={d.address}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-orbitron uppercase text-white font-bold mb-1">Patient</label>
                        <select
                          required
                          value={reqPatientAddr}
                          onChange={(e) => setReqPatientAddr(e.target.value)}
                          className="w-full bg-black border border-white/20 px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="">-- Select Patient --</option>
                          {admittedPatients.map(p => (
                            <option key={p.address} value={p.address}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isRequestingNarcotic}
                      className="w-full bg-cyber-pink text-black font-orbitron font-bold py-2 text-xs uppercase tracking-wider hover:bg-cyber-pink/80"
                    >
                      {isRequestingNarcotic ? "Submitting request..." : "File Request"}
                    </button>
                  </form>
                </div>

                {/* Pending Approvals Authorization Queue */}
                <div className="border border-white/10 bg-black/40 rounded p-4 space-y-3">
                  <h4 className="font-orbitron text-xs text-white font-bold">Double-Authorization Pending Requests Queue</h4>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase font-orbitron">
                          <th className="py-2">ID</th>
                          <th className="py-2">Drug</th>
                          <th className="py-2">Dosage</th>
                          <th className="py-2">Patient</th>
                          <th className="py-2">Requester Doctor</th>
                          <th className="py-2 text-right">Double-Auth Co-Signature Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {narcoticLogs.filter(n => n.status === "pending").map((n) => (
                          <tr key={n.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-3 text-white font-bold">#{n.id}</td>
                            <td className="py-3 font-semibold">{n.drug_name}</td>
                            <td className="py-3">{n.dosage}</td>
                            <td className="py-3 truncate max-w-[120px]" title={n.patient_address}>
                              {n.patient_address.slice(0, 12)}...
                            </td>
                            <td className="py-3 truncate max-w-[120px]" title={n.requester_doctor}>
                              {n.requester_doctor.slice(0, 12)}...
                            </td>
                            <td className="py-3 text-right space-x-2">
                              <button
                                onClick={() => handleAuthorizeNarcotic(n.id, "authorized")}
                                className="bg-green-500 hover:bg-green-600 text-black font-orbitron font-bold text-[9px] uppercase px-2.5 py-1"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAuthorizeNarcotic(n.id, "rejected")}
                                className="bg-red-500 hover:bg-red-600 text-black font-orbitron font-bold text-[9px] uppercase px-2.5 py-1"
                              >
                                Reject
                              </button>
                            </td>
                          </tr>
                        ))}
                        {narcoticLogs.filter(n => n.status === "pending").length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-white/40 italic">No narcotic doses awaiting authorization.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Audit Logs Ledger */}
                <div className="border border-white/10 bg-black/40 rounded p-4 space-y-3">
                  <h4 className="font-orbitron text-xs text-white font-bold">Regulatory Narcotics Administration Audit Log</h4>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase font-orbitron">
                          <th className="py-2">ID</th>
                          <th className="py-2">Substance</th>
                          <th className="py-2">Dosage</th>
                          <th className="py-2">Requester</th>
                          <th className="py-2">Co-Authorizer</th>
                          <th className="py-2">Result</th>
                          <th className="py-2 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {narcoticLogs.filter(n => n.status !== "pending").map((n) => (
                          <tr key={n.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-3 text-white">#{n.id}</td>
                            <td className="py-3 font-semibold">{n.drug_name}</td>
                            <td className="py-3">{n.dosage}</td>
                            <td className="py-3 truncate max-w-[120px]" title={n.requester_doctor}>
                              {n.requester_doctor.slice(0, 10)}...
                            </td>
                            <td className="py-3 truncate max-w-[120px]" title={n.authorizer_admin}>
                              {n.authorizer_admin ? `${n.authorizer_admin.slice(0, 10)}...` : <span className="text-white/30 italic">None</span>}
                            </td>
                            <td className="py-3">
                              {n.status === "authorized" && <span className="bg-green-500/10 border border-green-500/30 text-green-400 px-2 py-0.5 rounded text-[10px]">Approved</span>}
                              {n.status === "rejected" && <span className="bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 rounded text-[10px]">Rejected</span>}
                            </td>
                            <td className="py-3 text-right text-white/50">
                              {n.authorized_at ? new Date(n.authorized_at).toLocaleString() : <span className="text-white/30 italic">None</span>}
                            </td>
                          </tr>
                        ))}
                        {narcoticLogs.filter(n => n.status !== "pending").length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-white/40 italic">No historical records in audit log.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 3: Medicine Catalog Inventory */}
            {regSubTab === "medicines" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Add Medicine Catalog Entry */}
                  <div className="p-5 border border-white/10 bg-black/40 rounded space-y-4 h-fit">
                    <h4 className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <PlusCircle size={14} className="text-cyber-blue" />
                      <span>Add New Medicine</span>
                    </h4>
                    <form onSubmit={handleAddMedicine} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-orbitron uppercase text-white font-bold mb-1">Drug Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Fentanyl Citrate"
                          value={addMedName}
                          onChange={(e) => setAddMedName(e.target.value)}
                          className="w-full bg-black border border-white/20 px-3 py-2 text-xs text-white focus:border-cyber-blue focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-orbitron uppercase text-white font-bold mb-1">Dosage/Strength</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 100mcg"
                            value={addMedDosage}
                            onChange={(e) => setAddMedDosage(e.target.value)}
                            className="w-full bg-black border border-white/20 px-3 py-2 text-xs text-white focus:border-cyber-blue focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-orbitron uppercase text-white font-bold mb-1">Initial Stock</label>
                          <input
                            type="number"
                            required
                            min={0}
                            value={addMedStock}
                            onChange={(e) => setAddMedStock(Number(e.target.value))}
                            className="w-full bg-black border border-white/20 px-3 py-2 text-xs font-mono text-white focus:border-cyber-blue focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="requires-auth-checkbox"
                          checked={addMedDoubleAuth}
                          onChange={(e) => setAddMedDoubleAuth(e.target.checked)}
                          className="w-4 h-4 bg-black border border-white/20 text-cyber-blue focus:ring-0 rounded"
                        />
                        <label htmlFor="requires-auth-checkbox" className="text-[10px] font-orbitron uppercase text-white/70 cursor-pointer select-none">
                          Requires Double-Auth Co-Signature
                        </label>
                      </div>
                      <button
                        type="submit"
                        disabled={isAddingMed}
                        className="w-full bg-cyber-blue text-black font-orbitron font-bold py-2.5 text-xs uppercase tracking-wider hover:bg-cyber-blue/80 transition-all cursor-pointer disabled:opacity-30"
                      >
                        {isAddingMed ? "Cataloging..." : "Add to Catalog"}
                      </button>
                    </form>
                  </div>

                  {/* Medicines Listing & Edit Table */}
                  <div className="lg:col-span-2 p-5 border border-white/10 bg-black/40 rounded space-y-4">
                    <h4 className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <List size={14} className="text-cyber-blue" />
                      <span>Medicine Catalog Registry</span>
                    </h4>
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase font-orbitron">
                            <th className="py-2.5">ID</th>
                            <th className="py-2.5">Drug Name</th>
                            <th className="py-2.5">Dosage Strength</th>
                            <th className="py-2.5">Stock Level</th>
                            <th className="py-2.5">Double Auth?</th>
                            <th className="py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {medicineList.map((m) => (
                            <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 text-white/50">#{m.id}</td>
                              <td className="py-3 font-bold text-white">{m.drug_name}</td>
                              <td className="py-3 text-cyber-blue">{m.dosage_strength}</td>
                              <td className={`py-3 font-bold ${m.stock_quantity <= 10 ? 'text-red-400 font-semibold' : 'text-emerald-400'}`}>
                                {m.stock_quantity} units
                              </td>
                              <td className="py-3">
                                {m.requires_double_auth ? (
                                  <span className="bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold">RESTRICTED</span>
                                ) : (
                                  <span className="bg-white/5 border border-white/10 text-white/60 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">STANDARD</span>
                                )}
                              </td>
                              <td className="py-3 text-right space-x-2">
                                <button
                                  onClick={() => {
                                    setEditMedID(m.id);
                                    setEditMedName(m.drug_name);
                                    setEditMedDosage(m.dosage_strength);
                                    setEditMedStock(m.stock_quantity);
                                    setEditMedDoubleAuth(m.requires_double_auth);
                                  }}
                                  className="px-2 py-1 bg-cyber-blue/10 hover:bg-cyber-blue hover:text-black text-cyber-blue font-orbitron text-[9px] uppercase font-bold rounded transition-all cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteMedicine(m.id)}
                                  className="px-2 py-1 bg-red-500/10 hover:bg-red-500 hover:text-black text-red-400 font-orbitron text-[9px] uppercase font-bold rounded transition-all cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                          {medicineList.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-white/30 italic">No medicines cataloged in inventory.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Edit Medicine Modal */}
                {editMedID !== null && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
                    <div className="w-full max-w-xl border border-white/20 bg-black/95 p-6 rounded relative shadow-[0_0_50px_rgba(0,243,255,0.2)]">
                      <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
                      <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-blue" />
                      <button 
                        onClick={() => setEditMedID(null)}
                        className="absolute top-4 right-4 text-white/50 hover:text-white font-orbitron uppercase text-xs tracking-widest cursor-pointer px-2 py-1 border border-white/10 hover:border-white/30 rounded"
                      >
                        Cancel
                      </button>

                      <div className="flex items-center gap-2 pb-4 border-b border-white/10 mb-6">
                        <Edit className="text-cyber-blue" size={16} />
                        <h3 className="font-orbitron text-xs tracking-widest uppercase text-white font-bold">Edit Medicine Parameters</h3>
                      </div>

                      <form onSubmit={handleUpdateMedicine} className="space-y-4">
                        <div>
                          <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Drug Name</label>
                          <input
                            type="text"
                            required
                            value={editMedName}
                            onChange={(e) => setEditMedName(e.target.value)}
                            className="w-full bg-black border border-white/20 px-4 py-2.5 text-sm text-white focus:border-cyber-blue focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Dosage / Strength</label>
                            <input
                              type="text"
                              required
                              value={editMedDosage}
                              onChange={(e) => setEditMedDosage(e.target.value)}
                              className="w-full bg-black border border-white/20 px-4 py-2.5 text-sm text-white focus:border-cyber-blue focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Stock Quantity</label>
                            <input
                              type="number"
                              required
                              min={0}
                              value={editMedStock}
                              onChange={(e) => setEditMedStock(Number(e.target.value))}
                              className="w-full bg-black border border-white/20 px-4 py-2.5 text-sm font-mono text-white focus:border-cyber-blue focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 pb-2">
                          <input
                            type="checkbox"
                            id="edit-requires-auth"
                            checked={editMedDoubleAuth}
                            onChange={(e) => setEditMedDoubleAuth(e.target.checked)}
                            className="w-4 h-4 bg-black border border-white/20 text-cyber-blue focus:ring-0 rounded"
                          />
                          <label htmlFor="edit-requires-auth" className="text-xs font-orbitron uppercase text-white/70 cursor-pointer select-none">
                            Requires Double-Auth Co-Signature
                          </label>
                        </div>
                        <button
                          type="submit"
                          disabled={isSavingMed}
                          className="w-full bg-cyber-blue text-black font-orbitron font-bold py-3 text-sm tracking-wider uppercase hover:bg-cyber-blue/80 transition-all cursor-pointer disabled:opacity-30"
                        >
                          {isSavingMed ? "Saving Changes..." : "Save Medicine Changes"}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Upload Documents Form */}
        {activeTab === "upload" && (
          <div className="p-6 border border-white/15 bg-white/[0.01] relative rounded">
            <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-pink" />
            <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-pink" />

            <div className="flex items-center gap-2 mb-6">
              <Upload className="text-cyber-pink" size={16} />
              <h3 className="font-orbitron text-xs tracking-widest uppercase text-white font-bold">Publish Clinical Records</h3>
            </div>

            <form onSubmit={handleUploadRecord} className="space-y-5 w-full">
              <div>
                <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Target Patient Wallet</label>
                <select
                  value={uploadTargetAddress}
                  onChange={(e) => setUploadTargetAddress(e.target.value)}
                  className="w-full bg-black border border-white/20 px-4 py-3 text-sm font-mono text-white focus:border-cyber-pink focus:outline-none"
                >
                  {admittedPatients.map(p => (
                    <option key={p.address} value={p.address}>{p.name} ({p.address.slice(0, 10)}...)</option>
                  ))}
                  {admittedPatients.length === 0 && (
                    <option value="">No patients admitted yet</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Document Type</label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-pink focus:outline-none"
                  >
                    <option value="report">Lab / Diagnostic Report</option>
                    <option value="prescription">Doctor Prescription</option>
                    <option value="scan">Medical Imaging Scan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Diagnosis Title Summary</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cardiological Echocardiogram Summary"
                    value={uploadDiagnosis}
                    onChange={(e) => setUploadDiagnosis(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white focus:border-cyber-pink focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-orbitron uppercase text-white font-bold mb-1.5">Select File (PDF / Scans)</label>
                <div className="border border-dashed border-white/20 p-6 text-center cursor-pointer hover:border-cyber-pink bg-black rounded">
                  <input
                    type="file"
                    required
                    accept=".pdf,image/*"
                    onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                    id="report-file-input"
                  />
                  <label htmlFor="report-file-input" className="cursor-pointer">
                    <FileText className="mx-auto text-white/70 mb-2" size={32} />
                    <span className="text-sm text-white font-semibold block hover:text-cyber-pink transition-colors">
                      {uploadFile ? uploadFile.name : "Select PDF clinical report"}
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploading || admittedPatients.length === 0}
                className="w-full bg-cyber-pink text-black font-orbitron font-bold py-4 text-sm tracking-wider uppercase hover:bg-cyber-pink/80 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isUploading ? "Uploading to S3 & Indexing..." : "Publish Report"}
              </button>
            </form>
          </div>
        )}

        {/* Tab: Request Meds & Equipments (Doctors only) */}
        {activeTab === "request-assets" && (
          <div className="space-y-6 w-full animate-fade-in">
            {/* Sub-tab Navigation */}
            <div className="flex border-b border-white/10 pb-4 gap-4 font-orbitron font-bold text-sm shrink-0">
              <button
                onClick={() => setRequestAssetTab("meds")}
                className={`px-6 py-3 border rounded transition-all cursor-pointer ${requestAssetTab === "meds" ? "bg-cyber-blue/10 border-cyber-blue text-cyber-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                Request Medications
              </button>
              <button
                onClick={() => setRequestAssetTab("equipments")}
                className={`px-6 py-3 border rounded transition-all cursor-pointer ${requestAssetTab === "equipments" ? "bg-cyber-blue/10 border-cyber-blue text-cyber-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.1)]" : "border-white/10 text-white/70 hover:text-white"}`}
              >
                Log Implantation
              </button>
            </div>

            {requestAssetTab === "meds" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Request Narcotic Form */}
                <div className="p-6 border border-white/10 bg-white/[0.01] rounded relative h-fit">
                  <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
                  <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-blue" />
                  
                  <h4 className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5 mb-4">
                    <PlusCircle size={14} className="text-cyber-blue" />
                    <span>File Controlled Narcotic Request</span>
                  </h4>
                  
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setIsRequestingNarcotic(true);
                    setError("");
                    setSuccessMsg("");
                    try {
                      const resp = await fetch(`${API_URL}/api/admin/regulatory/narcotics/request`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          drug_name: reqDrugName,
                          dosage: reqDosage,
                          patient_address: reqPatientAddr,
                          requester_doctor: walletAddress
                        })
                      });
                      if (resp.ok) {
                        setSuccessMsg("Narcotic request filed successfully. Awaiting admin signature.");
                        setReqPatientAddr("");
                        fetchNarcotics();
                      } else {
                        const errData = await resp.json();
                        setError(errData.error || "Failed to submit request.");
                      }
                    } catch (e) {
                      setError("Network error submitting request.");
                    } finally {
                      setIsRequestingNarcotic(false);
                    }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-orbitron uppercase text-white/60 mb-1">Select Restricted Drug</label>
                      <select
                        value={reqDrugName}
                        onChange={(e) => {
                          setReqDrugName(e.target.value);
                          const med = medicineList.find(m => m.drug_name === e.target.value);
                          if (med) setReqDosage(med.dosage_strength);
                        }}
                        className="w-full bg-black border border-white/20 p-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue font-mono"
                      >
                        {medicineList.map(m => (
                          <option key={m.id} value={m.drug_name}>{m.drug_name} ({m.dosage_strength})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-orbitron uppercase text-white/60 mb-1">Dosage strength</label>
                      <input
                        type="text"
                        required
                        value={reqDosage}
                        onChange={(e) => setReqDosage(e.target.value)}
                        className="w-full bg-black border border-white/20 p-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-orbitron uppercase text-white/60 mb-1">Select Patient</label>
                      <select
                        value={reqPatientAddr}
                        onChange={(e) => setReqPatientAddr(e.target.value)}
                        className="w-full bg-black border border-white/20 p-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue font-mono"
                      >
                        <option value="">-- Choose Patient --</option>
                        {admittedPatients.map(p => (
                          <option key={p.address} value={p.address}>{p.name} ({p.address.slice(0,10)}...)</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isRequestingNarcotic || !reqPatientAddr}
                      className="w-full bg-cyber-blue text-black font-orbitron font-bold py-2 text-xs uppercase tracking-wider hover:bg-cyber-blue/80 transition-all cursor-pointer disabled:opacity-30"
                    >
                      {isRequestingNarcotic ? "Filing Request..." : "File Request"}
                    </button>
                  </form>
                </div>

                {/* Doctor's Narcotics History */}
                <div className="lg:col-span-2 p-6 border border-white/10 bg-black/40 rounded space-y-4">
                  <h4 className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <List size={14} className="text-cyber-blue" />
                    <span>My Controlled Substance Request Ledger</span>
                  </h4>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase font-orbitron">
                          <th className="py-2.5">Medication</th>
                          <th className="py-2.5">Dosage</th>
                          <th className="py-2.5">Patient Address</th>
                          <th className="py-2.5">Request Date</th>
                          <th className="py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {narcoticLogs
                          .filter(n => n.requester_doctor.toLowerCase() === walletAddress.toLowerCase())
                          .map((n) => (
                            <tr key={n.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="py-3 font-bold text-white">{n.drug_name}</td>
                              <td className="py-3 text-cyber-blue">{n.dosage}</td>
                              <td className="py-3 text-white/60">{n.patient_address}</td>
                              <td className="py-3 text-white/50">{n.requested_at ? n.requested_at.slice(0, 10) : "N/A"}</td>
                              <td className="py-3 text-right">
                                <span className={`px-2 py-0.5 border text-[9px] rounded font-orbitron font-bold ${n.status === "authorized" || n.status === "Authorized" ? "bg-green-950/20 border-green-500/40 text-green-400" : n.status === "rejected" ? "bg-red-950/20 border-red-500/40 text-red-400" : "bg-yellow-950/20 border-yellow-500/40 text-cyber-yellow animate-pulse"}`}>
                                  {n.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        }
                        {narcoticLogs.filter(n => n.requester_doctor.toLowerCase() === walletAddress.toLowerCase()).length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-white/30 italic">No narcotic requests filed by your credentials.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {requestAssetTab === "equipments" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Implantation Form */}
                <div className="p-6 border border-white/10 bg-white/[0.01] rounded relative h-fit">
                  <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-pink" />
                  <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-pink" />
                  
                  <h4 className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5 mb-4">
                    <PlusCircle size={14} className="text-cyber-pink" />
                    <span>Log Patient Implantation</span>
                  </h4>
                  
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setIsLoggingImplant(true);
                    setError("");
                    setSuccessMsg("");
                    try {
                      const resp = await fetch(`${API_URL}/api/admin/regulatory/devices/implant`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          serial_number: impSerialNumber,
                          patient_address: impPatientAddr,
                          implanted_by: walletAddress
                        })
                      });
                      if (resp.ok) {
                        const data = await resp.json();
                        setSuccessMsg(`Device successfully implanted and registered on blockchain! Hash: ${data.tx_hash}`);
                        setImpSerialNumber("");
                        setImpPatientAddr("");
                        fetchDevices();
                      } else {
                        const errData = await resp.json();
                        setError(errData.error || "Failed to log device implantation.");
                      }
                    } catch (e) {
                      setError("Network error submitting implantation.");
                    } finally {
                      setIsLoggingImplant(false);
                    }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-orbitron uppercase text-white/60 mb-1">Select Available Serial Number</label>
                      <select
                        value={impSerialNumber}
                        onChange={(e) => setImpSerialNumber(e.target.value)}
                        className="w-full bg-black border border-white/20 p-2.5 text-xs text-white focus:outline-none focus:border-cyber-pink font-mono"
                      >
                        <option value="">-- Choose Serial ID --</option>
                        {deviceList.filter(d => d.status === "in-stock").map(d => (
                          <option key={d.serial_number} value={d.serial_number}>{d.device_name} (SN: {d.serial_number})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-orbitron uppercase text-white/60 mb-1">Select Patient</label>
                      <select
                        value={impPatientAddr}
                        onChange={(e) => setImpPatientAddr(e.target.value)}
                        className="w-full bg-black border border-white/20 p-2.5 text-xs text-white focus:outline-none focus:border-cyber-pink font-mono"
                      >
                        <option value="">-- Choose Patient --</option>
                        {admittedPatients.map(p => (
                          <option key={p.address} value={p.address}>{p.name} ({p.address.slice(0,10)}...)</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoggingImplant || !impSerialNumber || !impPatientAddr}
                      className="w-full bg-cyber-pink text-black font-orbitron font-bold py-2 text-xs uppercase tracking-wider hover:bg-cyber-pink/80 transition-all cursor-pointer disabled:opacity-30"
                    >
                      {isLoggingImplant ? "Finalizing Implantation..." : "Finalize Implantation"}
                    </button>
                  </form>
                </div>

                {/* Implanted Devices List */}
                <div className="lg:col-span-2 p-6 border border-white/10 bg-black/40 rounded space-y-4">
                  <h4 className="font-orbitron text-xs text-white font-bold flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <List size={14} className="text-cyber-pink" />
                    <span>My Implanted Devices Ledger</span>
                  </h4>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase font-orbitron">
                          <th className="py-2.5">Device Name</th>
                          <th className="py-2.5">Serial ID</th>
                          <th className="py-2.5">Patient Address</th>
                          <th className="py-2.5">Date Implanted</th>
                          <th className="py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deviceList
                          .filter(d => d.implanted_by && d.implanted_by.toLowerCase() === walletAddress.toLowerCase())
                          .map((d) => (
                            <tr key={d.serial_number} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="py-3 font-bold text-white">{d.device_name}</td>
                              <td className="py-3 text-cyber-blue">{d.serial_number}</td>
                              <td className="py-3 text-white/60">{d.patient_address}</td>
                              <td className="py-3 text-white/50">{d.implanted_at ? d.implanted_at.slice(0,10) : "N/A"}</td>
                              <td className="py-3 text-right">
                                <span className={`px-2 py-0.5 border text-[9px] rounded font-orbitron font-bold ${d.status === "recalled" ? "bg-red-500 text-black border-red-500 animate-pulse" : "bg-green-950/20 border-green-500/40 text-green-400"}`}>
                                  {d.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))
                        }
                        {deviceList.filter(d => d.implanted_by && d.implanted_by.toLowerCase() === walletAddress.toLowerCase()).length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-white/30 italic">No device implantations logged by your credentials.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Emergency Override */}
        {activeTab === "emergency-override" && (
          <div className="w-full animate-fade-in space-y-6">
            <div className="p-8 border border-red-500/20 bg-red-950/10 relative rounded-lg">
              <div className="absolute top-0 left-0 w-12 h-[2px] bg-red-500" />
              <div className="absolute top-0 left-0 w-[2px] h-12 bg-red-500" />
              <div className="absolute bottom-0 right-0 w-12 h-[2px] bg-red-500/40" />
              <div className="absolute bottom-0 right-0 w-[2px] h-12 bg-red-500/40" />

              <div className="flex items-start gap-4 pb-6 border-b border-red-500/20 mb-8">
                <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="text-red-400" size={24} />
                </div>
                <div>
                  <h2 className="font-orbitron text-base tracking-widest uppercase text-white font-bold">Emergency Protocol Override</h2>
                  <p className="text-sm text-white/50 mt-1.5 max-w-2xl">Gain immediate clinical access to any external patient profile in case of a critical emergency. This action is logged, requires institutional co-signature, and is subject to audit review.</p>
                </div>
                <div className="ml-auto shrink-0 flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-4 py-2 rounded">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 font-orbitron text-[10px] font-bold uppercase tracking-wider">Protocol Active</span>
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setError(""); setSuccessMsg("");
                const form = e.currentTarget;
                const pAddress = (form.elements.namedItem("overridePatient") as HTMLSelectElement).value;
                const reason = (form.elements.namedItem("overrideReason") as HTMLInputElement).value;
                try {
                  const resp = await fetch(`${API_URL}/api/admin/doctor/override-access`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ patient_address: pAddress, doctor_address: walletAddress, reason })
                  });
                  if (resp.ok) {
                    const data = await resp.json();
                    setSuccessMsg(data.message);
                    form.reset();
                    fetchDoctorPatients(walletAddress);
                    fetchOverrides();
                  } else {
                    const errData = await resp.json();
                    setError(errData.error || "Failed to trigger override.");
                  }
                } catch { setError("Network error triggering override."); }
              }} className="space-y-6">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase text-white/60 mb-2 font-orbitron tracking-wider">Target Patient</label>
                    <select name="overridePatient" required defaultValue=""
                      className="w-full bg-black/60 border border-white/20 p-4 text-white focus:outline-none focus:border-red-500 text-sm appearance-none cursor-pointer rounded-lg transition-colors">
                      <option value="" disabled>— Select a patient by name —</option>
                      {admittedPatients.map(p => (
                        <option key={p.address} value={p.address}>
                          {p.name} · {p.address.slice(0, 12)}...{p.address.slice(-6)}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-white/30 mt-1.5 font-mono">Patient wallet address will be auto-populated</p>
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-white/60 mb-2 font-orbitron tracking-wider">Clinical Justification / Override Token</label>
                    <input name="overrideReason" type="text" required
                      placeholder="e.g. Critical hypoxia telemetry override — ICU transfer"
                      className="w-full bg-black/60 border border-white/20 p-4 text-white focus:outline-none focus:border-red-500 text-sm rounded-lg transition-colors placeholder:text-white/20" />
                    <p className="text-[10px] text-white/30 mt-1.5 font-mono">This reason is immutably logged to the blockchain audit trail</p>
                  </div>
                </div>

                <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-lg flex items-start gap-3">
                  <ShieldAlert className="text-amber-400 shrink-0 mt-0.5" size={16} />
                  <p className="text-xs text-amber-300/80">This override request will enter the <strong>Approval Queue</strong> and requires <strong>{Math.ceil(doctorsList.length * 0.75)} co-signatures</strong> from other clinicians or an admin before it becomes fully active.</p>

                </div>

                <button type="submit"
                  className="w-full bg-red-950/60 border border-red-500/60 hover:bg-red-500 hover:text-black text-red-400 font-orbitron font-bold py-4 text-sm uppercase tracking-widest transition-all cursor-pointer rounded-lg">
                  🔴 &nbsp;Activate Emergency Override
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab: Care Transfer */}
        {activeTab === "care-transfer" && (
          <div className="w-full animate-fade-in space-y-6">
            <div className="p-8 border border-cyber-blue/20 bg-cyber-blue/5 relative rounded-lg">
              <div className="absolute top-0 left-0 w-12 h-[2px] bg-cyber-blue" />
              <div className="absolute top-0 left-0 w-[2px] h-12 bg-cyber-blue" />
              <div className="absolute bottom-0 right-0 w-12 h-[2px] bg-cyber-blue/40" />
              <div className="absolute bottom-0 right-0 w-[2px] h-12 bg-cyber-blue/40" />

              <div className="flex items-start gap-4 pb-6 border-b border-cyber-blue/20 mb-8">
                <div className="w-12 h-12 rounded-lg bg-cyber-blue/10 border border-cyber-blue/30 flex items-center justify-center shrink-0">
                  <Users className="text-cyber-blue" size={24} />
                </div>
                <div>
                  <h2 className="font-orbitron text-base tracking-widest uppercase text-white font-bold">Patient Care Transfer Request</h2>
                  <p className="text-sm text-white/50 mt-1.5 max-w-2xl">File an authorized transfer request to permanently re-assign a patient under your clinical jurisdiction to another department or specialist. Subject to institutional approval.</p>
                </div>
                <div className="ml-auto shrink-0 flex items-center gap-2 bg-cyber-blue/10 border border-cyber-blue/30 px-4 py-2 rounded">
                  <span className="w-2 h-2 rounded-full bg-cyber-blue" />
                  <span className="text-cyber-blue font-orbitron text-[10px] font-bold uppercase tracking-wider">Authorized Channel</span>
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setError(""); setSuccessMsg("");
                const form = e.currentTarget;
                const pAddress = (form.elements.namedItem("transferPatient") as HTMLSelectElement).value;
                const reason = (form.elements.namedItem("transferReason") as HTMLInputElement).value;
                try {
                  const resp = await fetch(`${API_URL}/api/admin/doctor/transfer-care`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ patient_address: pAddress, doctor_address: walletAddress, reason })
                  });
                  if (resp.ok) {
                    const data = await resp.json();
                    setSuccessMsg(data.message);
                    form.reset();
                    fetchDoctorPatients(walletAddress);
                  } else {
                    const errData = await resp.json();
                    setError(errData.error || "Failed to file transfer.");
                  }
                } catch { setError("Network error filing transfer."); }
              }} className="space-y-6">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase text-white/60 mb-2 font-orbitron tracking-wider">Patient to Transfer</label>
                    <select name="transferPatient" required defaultValue=""
                      className="w-full bg-black/60 border border-white/20 p-4 text-white focus:outline-none focus:border-cyber-blue text-sm appearance-none cursor-pointer rounded-lg transition-colors">
                      <option value="" disabled>— Select a patient by name —</option>
                      {admittedPatients.map(p => (
                        <option key={p.address} value={p.address}>
                          {p.name} · {p.address.slice(0, 12)}...{p.address.slice(-6)}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-white/30 mt-1.5 font-mono">Only patients under your care are listed</p>
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-white/60 mb-2 font-orbitron tracking-wider">Reason for Transfer</label>
                    <input name="transferReason" type="text" required
                      placeholder="e.g. Cardiological specialist consultation transfer"
                      className="w-full bg-black/60 border border-white/20 p-4 text-white focus:outline-none focus:border-cyber-blue text-sm rounded-lg transition-colors placeholder:text-white/20" />
                    <p className="text-[10px] text-white/30 mt-1.5 font-mono">Describe the clinical rationale for this transfer</p>
                  </div>
                </div>

                <div className="p-4 border border-cyber-blue/20 bg-cyber-blue/5 rounded-lg flex items-start gap-3">
                  <Users className="text-cyber-blue shrink-0 mt-0.5" size={16} />
                  <p className="text-xs text-cyber-blue/80">Care transfer requests are reviewed by hospital administration. Upon approval, the patient will be re-assigned in the clinical registry.</p>
                </div>

                <button type="submit"
                  className="w-full bg-cyber-blue/10 border border-cyber-blue/50 hover:bg-cyber-blue hover:text-black text-cyber-blue font-orbitron font-bold py-4 text-sm uppercase tracking-widest transition-all cursor-pointer rounded-lg">
                  ⟶ &nbsp;Request Patient Care Transfer
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab: Transfer & Override */}
        {activeTab === "transfer-override" && (
          <div className="space-y-6 w-full animate-fade-in">

            {/* Sub-tab Navigation */}
            <div className="flex gap-1 bg-black/60 border border-white/10 p-1 rounded w-fit">
              {(!isAdmin) && (
                <>
                  <button
                    onClick={() => setTransferOverrideSubTab("override")}
                    className={`px-5 py-2.5 rounded text-[10px] font-orbitron font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                      transferOverrideSubTab === "override"
                        ? "bg-red-500/20 border border-red-500/50 text-red-400"
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    <ShieldAlert size={12} />
                    Emergency Override
                  </button>
                  <button
                    onClick={() => setTransferOverrideSubTab("transfer")}
                    className={`px-5 py-2.5 rounded text-[10px] font-orbitron font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                      transferOverrideSubTab === "transfer"
                        ? "bg-cyber-blue/20 border border-cyber-blue/50 text-cyber-blue"
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    <Users size={12} />
                    Care Transfer
                  </button>
                </>
              )}
              <button
                onClick={() => setTransferOverrideSubTab("queue")}
                className={`px-5 py-2.5 rounded text-[10px] font-orbitron font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                  transferOverrideSubTab === "queue"
                    ? "bg-cyber-pink/20 border border-cyber-pink/50 text-cyber-pink"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <Shield size={12} />
                Approval Queue
                {overrideList.filter(o => o.status === "active").length > 0 && (
                  <span className="bg-cyber-pink text-black text-[9px] font-bold px-1.5 py-0.5 rounded">
                    {overrideList.filter(o => o.status === "active").length}
                  </span>
                )}
              </button>
            </div>

            {/* Sub-tab: Emergency Override */}
            {transferOverrideSubTab === "override" && !isAdmin && (
              <div className="p-6 border border-white/15 bg-white/[0.01] relative rounded max-w-2xl">
                <div className="absolute top-0 left-0 w-8 h-[2px] bg-red-500" />
                <div className="absolute top-0 left-0 w-[2px] h-8 bg-red-500" />

                <div className="flex items-center gap-2 pb-4 border-b border-white/10 mb-6">
                  <ShieldAlert className="text-red-400 animate-pulse" size={16} />
                  <div>
                    <h3 className="font-orbitron text-xs tracking-widest uppercase text-white font-bold">Emergency Protocol Override</h3>
                    <p className="text-[10px] text-white/40 mt-0.5">Gain immediate clinical access to any external patient in a critical emergency.</p>
                  </div>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setError(""); setSuccessMsg("");
                  const form = e.currentTarget;
                  const pAddress = (form.elements.namedItem("overridePatient") as HTMLSelectElement).value;
                  const reason = (form.elements.namedItem("overrideReason") as HTMLInputElement).value;
                  try {
                    const resp = await fetch(`${API_URL}/api/admin/doctor/override-access`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ patient_address: pAddress, doctor_address: walletAddress, reason })
                    });
                    if (resp.ok) {
                      const data = await resp.json();
                      setSuccessMsg(data.message);
                      form.reset();
                      fetchDoctorPatients(walletAddress);
                      fetchOverrides();
                    } else {
                      const errData = await resp.json();
                      setError(errData.error || "Failed to trigger override.");
                    }
                  } catch { setError("Network error triggering override."); }
                }} className="space-y-4 font-mono text-xs">
                  <div>
                    <label className="block text-[9px] uppercase text-white/60 mb-1.5">Select Patient</label>
                    <select name="overridePatient" required defaultValue=""
                      className="w-full bg-black border border-white/20 p-2.5 text-white focus:outline-none focus:border-red-500 text-xs appearance-none cursor-pointer rounded">
                      <option value="" disabled>— Select a patient by name —</option>
                      {admittedPatients.map(p => (
                        <option key={p.address} value={p.address}>
                          {p.name} ({p.address.slice(0, 10)}...{p.address.slice(-6)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase text-white/60 mb-1.5">Clinical Reason / Override Token</label>
                    <input name="overrideReason" type="text" required placeholder="e.g. Critical hypoxia telemetry override"
                      className="w-full bg-black border border-white/20 p-2.5 text-white focus:outline-none focus:border-red-500 text-xs rounded" />
                  </div>
                  <button type="submit"
                    className="w-full bg-red-950/40 border border-red-500/50 hover:bg-red-500 hover:text-black text-red-400 font-orbitron font-bold py-2.5 text-[10px] uppercase tracking-widest transition-all cursor-pointer rounded">
                    Activate Emergency Override
                  </button>
                </form>
              </div>
            )}

            {/* Sub-tab: Care Transfer */}
            {transferOverrideSubTab === "transfer" && !isAdmin && (
              <div className="p-6 border border-white/15 bg-white/[0.01] relative rounded max-w-2xl">
                <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-blue" />
                <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-blue" />

                <div className="flex items-center gap-2 pb-4 border-b border-white/10 mb-6">
                  <Users className="text-cyber-blue" size={16} />
                  <div>
                    <h3 className="font-orbitron text-xs tracking-widest uppercase text-white font-bold">Patient Care Transfer Request</h3>
                    <p className="text-[10px] text-white/40 mt-0.5">File an authorized request to transfer care of a patient under your clinical jurisdiction.</p>
                  </div>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setError(""); setSuccessMsg("");
                  const form = e.currentTarget;
                  const pAddress = (form.elements.namedItem("transferPatient") as HTMLSelectElement).value;
                  const reason = (form.elements.namedItem("transferReason") as HTMLInputElement).value;
                  try {
                    const resp = await fetch(`${API_URL}/api/admin/doctor/transfer-care`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ patient_address: pAddress, doctor_address: walletAddress, reason })
                    });
                    if (resp.ok) {
                      const data = await resp.json();
                      setSuccessMsg(data.message);
                      form.reset();
                      fetchDoctorPatients(walletAddress);
                    } else {
                      const errData = await resp.json();
                      setError(errData.error || "Failed to file transfer.");
                    }
                  } catch { setError("Network error filing transfer."); }
                }} className="space-y-4 font-mono text-xs">
                  <div>
                    <label className="block text-[9px] uppercase text-white/60 mb-1.5">Select Patient</label>
                    <select name="transferPatient" required defaultValue=""
                      className="w-full bg-black border border-white/20 p-2.5 text-white focus:outline-none focus:border-cyber-blue text-xs appearance-none cursor-pointer rounded">
                      <option value="" disabled>— Select a patient by name —</option>
                      {admittedPatients.map(p => (
                        <option key={p.address} value={p.address}>
                          {p.name} ({p.address.slice(0, 10)}...{p.address.slice(-6)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase text-white/60 mb-1.5">Reason for Transfer</label>
                    <input name="transferReason" type="text" required placeholder="e.g. Cardiological specialist consultation transfer"
                      className="w-full bg-black border border-white/20 p-2.5 text-white focus:outline-none focus:border-cyber-blue text-xs rounded" />
                  </div>
                  <button type="submit"
                    className="w-full bg-cyber-blue/10 border border-cyber-blue/40 hover:bg-cyber-blue hover:text-black text-cyber-blue font-orbitron font-bold py-2.5 text-[10px] uppercase tracking-widest transition-all cursor-pointer rounded">
                    Request Patient Care Transfer
                  </button>
                </form>
              </div>
            )}

            {/* Sub-tab: Approval Queue (visible to both doctors and admins) */}
            {transferOverrideSubTab === "queue" && (
              <div className="p-6 border border-white/15 bg-white/[0.01] relative rounded">
                <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-pink" />
                <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-pink" />

                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <div className="flex items-center gap-2">
                    <Shield className="text-cyber-pink" size={16} />
                    <div>
                      <h3 className="font-orbitron text-xs tracking-widest uppercase text-white font-bold">
                        Consensus Override Validation & Endorsement Queue
                      </h3>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        {isAdmin
                          ? "Admin view — you may co-sign any pending override request as an institutional approver."
                          : "Clinician view — co-sign override requests raised by other doctors to endorse them."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/40 font-mono border border-white/10 px-2 py-1 rounded">
                      {isAdmin ? "🔐 Admin Approver" : "👨‍⚕️ Clinician Review"}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono">Required: {Math.ceil(doctorsList.length * 0.75)} co-signatures</span>

                  </div>
                </div>

                {overrideList.length === 0 ? (
                  <div className="text-center py-14 text-white/40 border border-dashed border-white/10 rounded">
                    <Shield size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="font-orbitron text-xs uppercase tracking-wider">No override requests pending review.</p>
                  </div>
                ) : (
                  <div className="border border-white/10 bg-black/40 overflow-x-auto rounded">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-white/60 uppercase font-orbitron font-bold text-[10px] tracking-wider">
                          <th className="p-4">ID</th>
                          <th className="p-4">Patient (Target)</th>
                          <th className="p-4">Initiating Doctor</th>
                          <th className="p-4">Override Reason</th>
                          <th className="p-4">Endorsements</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">{isAdmin ? "Admin Action" : "Action"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white/80">
                        {overrideList.map((ov) => {
                          const hasVoted = ov.voted_doctors.toLowerCase().split(",").includes(walletAddress.toLowerCase());
                          const isCreator = ov.doctor_address.toLowerCase() === walletAddress.toLowerCase();
                          const canVote = !hasVoted && (isAdmin || !isCreator) && ov.status === "active";
                          const threshold = Math.ceil(doctorsList.length * 0.75) || 1;

                          return (
                            <tr key={ov.id} className="hover:bg-white/[0.02]">
                              <td className="p-4 font-bold text-cyber-blue">#{ov.id}</td>
                              <td className="p-4">
                                <div className="font-bold text-white">{ov.patient_name}</div>
                                <div className="text-[10px] text-white/40">{ov.patient_address.slice(0, 14)}...</div>
                              </td>
                              <td className="p-4">
                                <div className={`font-bold ${isCreator ? "text-cyber-blue" : "text-white"}`}>
                                  {isCreator ? "You" : ov.doctor_name}
                                </div>
                                <div className="text-[10px] text-white/40">{ov.doctor_address.slice(0, 14)}...</div>
                              </td>
                              <td className="p-4 max-w-[200px] truncate" title={ov.reason}>{ov.reason}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white">{ov.votes_count}/{threshold}</span>
                                  <div className="w-16 bg-white/10 h-1.5 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all ${ov.votes_count >= threshold ? "bg-emerald-500" : "bg-cyber-blue"}`}
                                      style={{ width: `${Math.min((ov.votes_count / threshold) * 100, 100)}%` }} />
                                  </div>
                                </div>
                              </td>

                              <td className="p-4">
                                {ov.status === "endorsed" ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold">✓ Endorsed</span>
                                ) : (
                                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold animate-pulse">Pending</span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={async () => {
                                    setError(""); setSuccessMsg("");
                                    setIsVoting(ov.id);
                                    try {
                                      const resp = await fetch(`${API_URL}/api/admin/doctor/override-vote`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ override_id: ov.id, doctor_address: walletAddress })
                                      });
                                      if (resp.ok) {
                                        const data = await resp.json();
                                        setSuccessMsg(data.message);
                                        fetchOverrides();
                                        if (!isAdmin) fetchDoctorPatients(walletAddress);
                                      } else {
                                        const errData = await resp.json();
                                        setError(errData.error || "Failed to co-sign.");
                                      }
                                    } catch { setError("Network error co-signing."); }
                                    finally { setIsVoting(null); }
                                  }}
                                  disabled={!canVote || isVoting === ov.id}
                                  className={`px-4 py-2 border rounded font-orbitron font-bold text-[9px] uppercase tracking-widest transition-all ${
                                    canVote
                                      ? isAdmin
                                        ? "border-emerald-500/50 hover:bg-emerald-500 hover:text-black text-emerald-400 cursor-pointer"
                                        : "border-cyber-pink/50 hover:bg-cyber-pink hover:text-black text-cyber-pink cursor-pointer"
                                      : "border-white/5 text-white/20 cursor-not-allowed bg-white/[0.01]"
                                  }`}
                                >
                                  {isVoting === ov.id
                                    ? "Processing..."
                                    : hasVoted
                                    ? "✓ Co-signed"
                                    : isCreator && !isAdmin
                                    ? "Your Request"
                                    : ov.status === "endorsed"
                                    ? "Completed"
                                    : isAdmin
                                    ? "✓ Approve"
                                    : "Co-Sign"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 7: Readme Logs */}
        {activeTab === "readme-logs" && (
          <div className="w-full animate-fade-in">
            {/* System Runtime Activity Logs Terminal */}
            <div className="p-6 border border-white/15 bg-white/[0.01] relative rounded flex flex-col h-full min-h-[500px]">
              <div className="absolute top-0 left-0 w-8 h-[2px] bg-cyber-pink" />
              <div className="absolute top-0 left-0 w-[2px] h-8 bg-cyber-pink" />
              
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Terminal className="text-cyber-pink" size={18} />
                  <h3 className="font-orbitron text-sm tracking-widest uppercase text-white font-bold">{isAdmin ? "Live System Audits" : "ML Patient Vitals Alerts"}</h3>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${isAdmin ? "bg-emerald-500" : "bg-red-500"}`} />
              </div>

              {isAdmin ? (
                <div className="flex-1 bg-black/50 border border-white/10 rounded p-5 font-mono text-xs sm:text-sm space-y-4 overflow-y-auto max-h-[550px]">
                  <div className="text-white/40 border-b border-white/5 pb-2.5 flex justify-between tracking-wider font-bold text-xs uppercase">
                    <span>Timestamp</span>
                    <span>Event Details</span>
                  </div>
                  {hospitalLogs.map((log) => (
                    <div key={log.id} className="flex gap-5 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <span className="text-white/40 shrink-0 select-none font-bold text-xs sm:text-sm">{log.timestamp}</span>
                      <span className={
                        log.action_type === "NARCOTICS" ? "text-cyber-blue" :
                        log.action_type === "ADMISSION" || log.action_type === "DOCTOR" ? "text-emerald-400" :
                        log.action_type === "IMPLANTABLE" && log.message.includes("RECALLED") ? "text-red-400 font-semibold" :
                        log.action_type === "IMPLANTABLE" ? "text-purple-400" : "text-white/80"
                      }>
                        [{log.action_type}] {log.message}
                      </span>
                    </div>
                  ))}
                  {hospitalLogs.length === 0 && (
                    <div className="text-center text-white/30 py-12 text-sm">
                      No active audit logs found in the ledger database.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 bg-black/50 border border-white/10 rounded p-5 font-mono text-xs sm:text-sm space-y-4 overflow-y-auto max-h-[550px]">
                  <div className="text-white/40 border-b border-white/5 pb-2.5 flex justify-between tracking-wider font-bold text-xs uppercase">
                    <span>Timestamp</span>
                    <span>Patient Name / Address</span>
                    <span>Metrics Triggered</span>
                    <span className="text-right">Threat Level</span>
                  </div>
                  {doctorAnomalies.map((alert) => (
                    <div key={alert.id} className="flex flex-col sm:flex-row justify-between border-b border-white/5 pb-2.5 last:border-0 last:pb-0 gap-2 text-red-400 font-semibold animate-pulse">
                      <span className="text-white/40 shrink-0 font-bold">{alert.timestamp}</span>
                      <span className="text-white">{alert.patient_name} ({alert.patient_address.slice(0, 10)}...)</span>
                      <span>Pulse: {alert.heart_rate} BPM | SPO2: {alert.spo2}% | Temp: {alert.temperature}°C</span>
                      <span className="bg-red-500 text-black px-2 py-0.5 rounded text-[10px] uppercase font-orbitron font-bold text-right shrink-0 h-fit">CRITICAL</span>
                    </div>
                  ))}
                  {doctorAnomalies.length === 0 && (
                    <div className="text-center text-white/30 py-12 text-sm">
                      No anomalous patient events registered in your care zone.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
