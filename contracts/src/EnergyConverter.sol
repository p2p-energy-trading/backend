pragma solidity ^0.5.0;

import "./ETK_ERC20.sol";

contract EnergyConverter {
    ETK public etk_token;
    address public owner;
    
    // Conversion ratio: 1 kWh = conversionRatio ETK (in token's smallest unit)
    uint256 public conversionRatio = 100; // 1 kWh = 1.00 ETK (with 2 decimals)
    
    // Minimum energy threshold for settlement (in Wh)
    uint256 public minSettlementWh = 100; // 0.1 kWh minimum
    
    // Authorized smart meters that can trigger settlements
    mapping(address => bool) public authorizedMeters;
    mapping(string => bool) public authorizedMeterIds;
    
    // Settlement tracking
    struct Settlement {
        string meterId;
        address prosumerAddress;
        int256 netEnergyWh; // Positive for export, negative for import
        uint256 etkAmount;
        uint256 timestamp;
        bool processed;
    }
    
    mapping(bytes32 => Settlement) public settlements;
    bytes32[] public settlementIds;
    
    // Events
    event SettlementProcessed(
        bytes32 indexed settlementId,
        string indexed meterId,
        address indexed prosumerAddress,
        int256 netEnergyWh,
        uint256 etkAmount,
        uint256 timestamp
    );
    
    event MeterAuthorized(
        string meterId,
        address meterAddress,
        address authorizedBy
    );
    
    event MeterDeauthorized(
        string meterId,
        address meterAddress,
        address deauthorizedBy
    );
    
    event ConversionRatioUpdated(
        uint256 oldRatio,
        uint256 newRatio,
        address updatedBy
    );
    
    event MinSettlementUpdated(
        uint256 oldMinWh,
        uint256 newMinWh,
        address updatedBy
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized: owner only");
        _;
    }
    
    modifier onlyAuthorizedMeter() {
        require(authorizedMeters[msg.sender], "Not authorized: meter not whitelisted");
        _;
    }
    
    constructor(address _etkTokenAddress) public {
        etk_token = ETK(_etkTokenAddress);
        owner = msg.sender;
    }
    
    /**
     * @dev Authorize a smart meter to process settlements
     * @param _meterId Unique identifier for the smart meter
     * @param _meterAddress Ethereum address of the smart meter
     */
    function authorizeMeter(
        string memory _meterId,
        address _meterAddress
    ) public onlyOwner {
        require(_meterAddress != address(0), "Invalid meter address");
        require(bytes(_meterId).length > 0, "Invalid meter ID");
        
        authorizedMeters[_meterAddress] = true;
        authorizedMeterIds[_meterId] = true;
        
        emit MeterAuthorized(_meterId, _meterAddress, msg.sender);
    }
    
    /**
     * @dev Deauthorize a smart meter
     * @param _meterId Unique identifier for the smart meter
     * @param _meterAddress Ethereum address of the smart meter
     */
    function deauthorizeMeter(
        string memory _meterId,
        address _meterAddress
    ) public onlyOwner {
        authorizedMeters[_meterAddress] = false;
        authorizedMeterIds[_meterId] = false;
        
        emit MeterDeauthorized(_meterId, _meterAddress, msg.sender);
    }
    
    /**
     * @dev Process energy settlement and mint/burn ETK tokens
     * @param _meterId Smart meter identifier
     * @param _prosumerAddress Prosumer's wallet address
     * @param _netEnergyWh Net energy in Watt-hours (positive=export, negative=import)
     * @param _settlementId Unique settlement identifier
     */
    function processSettlement(
        string memory _meterId,
        address _prosumerAddress,
        int256 _netEnergyWh,
        bytes32 _settlementId
    ) public onlyAuthorizedMeter returns (uint256) {
        require(authorizedMeterIds[_meterId], "Meter ID not authorized");
        require(_prosumerAddress != address(0), "Invalid prosumer address");
        require(_settlementId != bytes32(0), "Invalid settlement ID");
        require(!settlements[_settlementId].processed, "Settlement already processed");
        require(
            _netEnergyWh >= int256(minSettlementWh) || _netEnergyWh <= -int256(minSettlementWh),
            "Energy amount below minimum threshold"
        );
        
        uint256 etkAmount = 0;
        
        if (_netEnergyWh > 0) {
            // Export: Mint ETK tokens for prosumer
            etkAmount = calculateEtkAmount(uint256(_netEnergyWh));
            etk_token.mint(etkAmount);
            require(
                etk_token.transfer(_prosumerAddress, etkAmount),
                "ETK transfer failed"
            );
        } else if (_netEnergyWh < 0) {
            // Import: Burn ETK tokens from prosumer
            uint256 energyImported = uint256(-_netEnergyWh);
            etkAmount = calculateEtkAmount(energyImported);
            
            // Check if prosumer has enough ETK balance
            require(
                etk_token.balanceOf(_prosumerAddress) >= etkAmount,
                "Insufficient ETK balance for import settlement"
            );
            
            // Transfer ETK from prosumer to this contract and burn
            require(
                etk_token.transferFrom(_prosumerAddress, address(this), etkAmount),
                "ETK transfer from prosumer failed"
            );
            etk_token.burn(etkAmount);
        }
        
        // Record settlement
        settlements[_settlementId] = Settlement({
            meterId: _meterId,
            prosumerAddress: _prosumerAddress,
            netEnergyWh: _netEnergyWh,
            etkAmount: etkAmount,
            timestamp: block.timestamp,
            processed: true
        });
        
        settlementIds.push(_settlementId);
        
        emit SettlementProcessed(
            _settlementId,
            _meterId,
            _prosumerAddress,
            _netEnergyWh,
            etkAmount,
            block.timestamp
        );
        
        return etkAmount;
    }
    
    /**
     * @dev Calculate ETK amount based on energy in Wh
     * @param _energyWh Energy amount in Watt-hours
     * @return ETK amount in token's smallest unit
     */
    function calculateEtkAmount(uint256 _energyWh) public view returns (uint256) {
        // Convert Wh to kWh and multiply by conversion ratio
        // _energyWh / 1000 * conversionRatio
        return (_energyWh * conversionRatio) / 1000;
    }
    
    /**
     * @dev Calculate energy amount in Wh based on ETK amount
     * @param _etkAmount ETK amount in token's smallest unit
     * @return Energy amount in Watt-hours
     */
    function calculateEnergyWh(uint256 _etkAmount) public view returns (uint256) {
        // Convert ETK to Wh
        // (_etkAmount / conversionRatio) * 1000
        return (_etkAmount * 1000) / conversionRatio;
    }
    
    /**
     * @dev Update conversion ratio (only owner)
     * @param _newRatio New conversion ratio
     */
    function updateConversionRatio(uint256 _newRatio) public onlyOwner {
        require(_newRatio > 0, "Conversion ratio must be positive");
        
        uint256 oldRatio = conversionRatio;
        conversionRatio = _newRatio;
        
        emit ConversionRatioUpdated(oldRatio, _newRatio, msg.sender);
    }
    
    /**
     * @dev Update minimum settlement threshold (only owner)
     * @param _newMinWh New minimum settlement in Wh
     */
    function updateMinSettlement(uint256 _newMinWh) public onlyOwner {
        uint256 oldMinWh = minSettlementWh;
        minSettlementWh = _newMinWh;
        
        emit MinSettlementUpdated(oldMinWh, _newMinWh, msg.sender);
    }
    
    /**
     * @dev Get settlement details by ID
     * @param _settlementId Settlement identifier
     */
    function getSettlement(bytes32 _settlementId) public view returns (
        string memory meterId,
        address prosumerAddress,
        int256 netEnergyWh,
        uint256 etkAmount,
        uint256 timestamp,
        bool processed
    ) {
        Settlement memory settlement = settlements[_settlementId];
        return (
            settlement.meterId,
            settlement.prosumerAddress,
            settlement.netEnergyWh,
            settlement.etkAmount,
            settlement.timestamp,
            settlement.processed
        );
    }
    
    /**
     * @dev Get total number of settlements processed
     */
    function getSettlementCount() public view returns (uint256) {
        return settlementIds.length;
    }
    
    /**
     * @dev Get settlement ID by index
     * @param _index Index in settlementIds array
     */
    function getSettlementIdByIndex(uint256 _index) public view returns (bytes32) {
        require(_index < settlementIds.length, "Index out of bounds");
        return settlementIds[_index];
    }
    
    /**
     * @dev Check if meter is authorized
     * @param _meterAddress Meter's Ethereum address
     */
    function isMeterAuthorized(address _meterAddress) public view returns (bool) {
        return authorizedMeters[_meterAddress];
    }
    
    /**
     * @dev Check if meter ID is authorized
     * @param _meterId Meter identifier
     */
    function isMeterIdAuthorized(string memory _meterId) public view returns (bool) {
        return authorizedMeterIds[_meterId];
    }
    
    /**
     * @dev Emergency function to withdraw any ETK tokens stuck in contract
     * @param _amount Amount to withdraw
     */
    function emergencyWithdrawETK(uint256 _amount) public onlyOwner {
        require(
            etk_token.transfer(owner, _amount),
            "Emergency withdrawal failed"
        );
    }
    
    /**
     * @dev Transfer ownership of the contract
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "Invalid new owner address");
        owner = _newOwner;
    }
}
