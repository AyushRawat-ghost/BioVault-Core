// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IDoctorCheck {
    function isDoctor(address _addr) external view returns (bool);
}

interface IPatientCheck {
    function isPatient(address _addr) external view returns (bool);
}

interface IInsurerCheck {
    function isInsurer(address _addr) external view returns (bool);
}

contract HospitalServices is Ownable {
    IDoctorCheck public doctorRegistry;
    IPatientCheck public patientRegistry;
    IInsurerCheck public insurerRegistry;

    enum ApptStatus { Pending, Confirmed, Completed, Cancelled }
    struct Appointment {
        uint256 id;
        address patient;
        address doctor;
        uint256 timestamp;
        ApptStatus status;
    }

    enum ClaimStatus { Submitted, UnderReview, Paid, Rejected }
    struct InsuranceClaim {
        uint256 id;
        uint256 recordId; // Linked to MedicalRecord.sol
        address patient;
        address insurer;
        uint256 amount;
        ClaimStatus status;
    }

    mapping(uint256 => Appointment) public appointments;
    uint256 public nextApptId;

    mapping(uint256 => InsuranceClaim) public claims;
    uint256 public nextClaimId;

    constructor(address _doctorRegistry, address _patientRegistry, address _insurerRegistry) Ownable(msg.sender) {
        doctorRegistry = IDoctorCheck(_doctorRegistry);
        patientRegistry = IPatientCheck(_patientRegistry);
        insurerRegistry = IInsurerCheck(_insurerRegistry);
    }

    // --- Appointment Functions ---
    function bookAppointment(address _doctor, uint256 _timestamp) external {
        require(patientRegistry.isPatient(msg.sender), "Only patients can book");
        require(doctorRegistry.isDoctor(_doctor), "Invalid doctor");

        appointments[nextApptId] = Appointment(nextApptId, msg.sender, _doctor, _timestamp, ApptStatus.Pending);
        nextApptId++;
    }

    function updateAppointmentStatus(uint256 _id, ApptStatus _status) external {
        Appointment storage appt = appointments[_id];
        require(msg.sender == appt.doctor, "Only the doctor can update status");
        appt.status = _status;
    }

    // --- Insurance Functions ---
    function submitClaim(uint256 _recordId, address _insurer, uint256 _amount) external {
        require(patientRegistry.isPatient(msg.sender), "Only patients can submit claims");
        require(insurerRegistry.isInsurer(_insurer), "Invalid insurer");

        claims[nextClaimId] = InsuranceClaim(nextClaimId, _recordId, msg.sender, _insurer, _amount, ClaimStatus.Submitted);
        nextClaimId++;
    }

    // --- Process Claim Functions ---
    function processClaim(uint256 _claimId, ClaimStatus _status) external {
        InsuranceClaim storage claim = claims[_claimId];
        require(msg.sender == claim.insurer, "Only the assigned insurer can process");
        claim.status = _status;
    }
}