// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDoctorRegistryCheck {
    function isDoctor(address _addr) external view returns (bool);
}

contract RegulatoryLedger {
    address public owner;
    IDoctorRegistryCheck public doctorRegistry;

    struct ImplantRecord {
        string serialNumber;
        address patient;
        address surgeon;
        string deviceName;
        string manufacturer;
        bool recalled;
        uint256 timestamp;
    }

    struct NarcoticRecord {
        uint256 dbId;
        string drugName;
        string dosage;
        address patient;
        address requester;
        address authorizer;
        string action; // "authorized" or "rejected"
        uint256 timestamp;
    }

    // Mapping from Serial Number to Implant Record
    mapping(string => ImplantRecord) public implants;
    string[] public implantSerials;

    // List of all Narcotic Records
    NarcoticRecord[] public narcotics;

    event DeviceImplanted(string indexed serialNumber, address indexed patient, address indexed surgeon, string deviceName);
    event DeviceRecalled(string indexed serialNumber, address indexed patient);
    event NarcoticLogged(uint256 indexed dbId, string drugName, address indexed patient, address indexed authorizer, string action);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner || doctorRegistry.isDoctor(msg.sender),
            "Not authorized: must be admin or registered doctor"
        );
        _;
    }

    constructor(address _doctorRegistry) {
        owner = msg.sender;
        doctorRegistry = IDoctorRegistryCheck(_doctorRegistry);
    }

    function setDoctorRegistry(address _doctorRegistry) external onlyOwner {
        doctorRegistry = IDoctorRegistryCheck(_doctorRegistry);
    }

    // --- Implant Tracking ---

    function implantDevice(
        string calldata _serialNumber,
        address _patient,
        address _surgeon,
        string calldata _deviceName,
        string calldata _manufacturer
    ) external onlyAuthorized {
        require(bytes(implants[_serialNumber].serialNumber).length == 0, "Device already implanted");

        implants[_serialNumber] = ImplantRecord({
            serialNumber: _serialNumber,
            patient: _patient,
            surgeon: _surgeon,
            deviceName: _deviceName,
            manufacturer: _manufacturer,
            recalled: false,
            timestamp: block.timestamp
        });
        implantSerials.push(_serialNumber);

        emit DeviceImplanted(_serialNumber, _patient, _surgeon, _deviceName);
    }

    function recallDevice(string calldata _serialNumber) external onlyOwner {
        require(bytes(implants[_serialNumber].serialNumber).length > 0, "Device not found in ledger");
        require(!implants[_serialNumber].recalled, "Device already recalled");

        implants[_serialNumber].recalled = true;

        emit DeviceRecalled(_serialNumber, implants[_serialNumber].patient);
    }

    function getImplant(string calldata _serialNumber) external view returns (
        string memory serialNumber,
        address patient,
        address surgeon,
        string memory deviceName,
        string memory manufacturer,
        bool recalled,
        uint256 timestamp
    ) {
        ImplantRecord memory r = implants[_serialNumber];
        require(bytes(r.serialNumber).length > 0, "Device not found");
        return (r.serialNumber, r.patient, r.surgeon, r.deviceName, r.manufacturer, r.recalled, r.timestamp);
    }

    // --- Controlled Substances Logs ---

    function logNarcoticAdministration(
        uint256 _dbId,
        string calldata _drugName,
        string calldata _dosage,
        address _patient,
        address _requester,
        address _authorizer,
        string calldata _action
    ) external onlyAuthorized {
        narcotics.push(NarcoticRecord({
            dbId: _dbId,
            drugName: _drugName,
            dosage: _dosage,
            patient: _patient,
            requester: _requester,
            authorizer: _authorizer,
            action: _action,
            timestamp: block.timestamp
        }));

        emit NarcoticLogged(_dbId, _drugName, _patient, _authorizer, _action);
    }

    function getNarcoticCount() external view returns (uint256) {
        return narcotics.length;
    }
}
