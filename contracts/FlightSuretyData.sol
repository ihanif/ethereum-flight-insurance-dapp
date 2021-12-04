pragma solidity ^0.5.10;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    mapping(address => bool) authorizedContracts;

    struct Airline {
        bytes32 name;
        bool isRegistered;
        bool isFunded;
        uint256 totalFunds;
    }
    mapping(address => Airline) private airlines;
    uint256 totalRegisteredAirlines = 0;
    uint256 totalFundedAirlines = 0;

    struct Flight {
        bool isRegistered;
        bytes32 flightKey;
        address airline;
        string flightNumber;
        uint8 statusCode;
        uint256 timestamp;
        string departureLocation;
        string arrivalLocation;
    }
    mapping(bytes32 => Flight) public allFlights;
    bytes32[] public registeredFlights;

    struct Insurance {
        address customer;
        uint256 amount;
        uint256 payPercentage;
        bool isPaid;
    }
    mapping(bytes32 => Insurance[]) public insurances;
    mapping(address => uint256) public insurancePayouts;

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    // constructor(address airline) public payable {
    constructor(bytes32 name) public payable {
        contractOwner = msg.sender;
        authorizedContracts[msg.sender] = true;
        airlines[msg.sender] = Airline(name, true, false, 0);
        totalRegisteredAirlines = totalRegisteredAirlines.add(1);
    }

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event AuthorizedCaller(address caller);
    event AirlineRegistered(address airline);
    event AirlineFunded(address airline);
    event FlightRegistered(bytes32 flightKey);
    event ProcessedFlightStatus(bytes32 flightKey, uint8 statusCode);
    event CustomerInsured(
        bytes32 flightKey,
        address customer,
        uint256 amount,
        uint256 payout
    );
    event InsureeCredited(bytes32 flightKey, address customer, uint256 amount);
    event PayInsuree(address payoutAddress, uint256 amount);

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational.");
        _;
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner.");
        _;
    }

    /**
     * @dev Modifier that requires the caller to be authorized
     */
    modifier requireIsAuthorized() {
        require(
            authorizedContracts[msg.sender] == true,
            "Caller is not authorized."
        );
        _;
    }

    /**
     * @dev Modifier that requires an Airline is not registered yet
     */
    modifier requireAirlineIsNotRegistered(address airline) {
        require(
            !airlines[airline].isRegistered,
            "Airline is already registered."
        );
        _;
    }

    /**
     * @dev Modifier that requires an Airline is not funded yet
     */
    modifier requireAirlineIsNotFunded(address airline) {
        require(!airlines[airline].isFunded, "Airline is already funded.");
        _;
    }

    /**
     * @dev Modifier that requires an Flight is not registered yet
     */
    modifier requireFlightIsNotRegistered(bytes32 flightKey) {
        require(
            !allFlights[flightKey].isRegistered,
            "Flight is already registered."
        );
        _;
    }

    /**
     * @dev Modifier that requires an Airline to be registered
     */
    modifier requireIsAirlineRegistered(address airline) {
        require(airlines[airline].isRegistered, "Airline is not registered.");
        _;
    }

    /**
     * @dev Modifier that requires an Airline to be funded
     */
    modifier requireIsAirlineFunded(address airline) {
        require(
            airlines[airline].isFunded,
            "Registering airline is not funded."
        );
        _;
    }

    modifier requireIsFlightRegistered(bytes32 flightKey) {
        require(
            allFlights[flightKey].isRegistered,
            "Flight is not registered."
        );
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        require(operational != mode, "Contract is already in this mode");
        operational = mode;
    }

    /**
     * @dev Authorize a contract to call contract's methonds
     * @param contractAddress authorized contract's address
     */
    function authorizeContract(address contractAddress)
        external
        requireIsOperational
        requireContractOwner
    {
        authorizedContracts[contractAddress] = true;
        emit AuthorizedCaller(contractAddress);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
    function isAirlineRegistered(address airline)
        public
        view
        requireIsOperational
        returns (bool)
    {
        return airlines[airline].isRegistered;
    }

    function isAirlineFunded(address airline) public view returns (bool) {
        return airlines[airline].isFunded;
    }

    function isFlightRegistered(bytes32 flightKey) public view returns (bool) {
        return allFlights[flightKey].isRegistered;
    }

    function hasFlightLanded(bytes32 flightKey) public view returns (bool) {
        if (allFlights[flightKey].statusCode > 0) {
            return true;
        }
        return false;
    }

    function isCustomerInsuredForFlight(bytes32 flightKey, address customer)
        public
        view
        returns (bool)
    {
        Insurance[] memory flightInsurances = insurances[flightKey];
        for (uint256 i = 0; i < flightInsurances.length; i++) {
            if (flightInsurances[i].customer == customer) {
                return true;
            }
        }
        return false;
    }

    function getFlightBy(string calldata _flightNumber)
        external
        view
        requireIsOperational
        returns (
            address,
            uint256,
            uint8,
            bytes32
        )
    {
        Flight storage flight = allFlights[bytes32(0)];
        for (uint8 i = 0; i < registeredFlights.length; i++) {
            if (
                keccak256(
                    bytes(allFlights[registeredFlights[i]].flightNumber)
                ) == keccak256(bytes(_flightNumber))
            ) {
                flight = allFlights[registeredFlights[i]];
                return (
                    flight.airline,
                    flight.timestamp,
                    flight.statusCode,
                    flight.flightKey
                );
            }
        }
        return (
            flight.airline,
            flight.timestamp,
            flight.statusCode,
            flight.flightKey
        );
    }

    function registerAirline(
        address airline,
        bytes32 name,
        address registeringAirline
    ) external requireIsOperational requireIsAirlineFunded(registeringAirline) {
        airlines[airline] = Airline(name, true, false, 0);
        totalRegisteredAirlines = totalRegisteredAirlines.add(1);
        emit AirlineRegistered(airline);
    }

    function fundAirline(address airline, uint256 amount)
        external
        requireIsOperational
        requireIsAirlineRegistered(airline)
        requireAirlineIsNotFunded(airline)
        returns (bool)
    {
        airlines[airline].isFunded = true;
        airlines[airline].totalFunds = airlines[airline].totalFunds.add(amount);
        totalFundedAirlines = totalFundedAirlines.add(1);
        emit AirlineFunded(airline);
        return airlines[airline].isFunded;
    }

    function getAirlineDetailsBy(address _airline)
        external
        view
        requireIsOperational
        returns (
            bytes32,
            bool,
            bool
        )
    {
        Airline storage airline = airlines[_airline];
        return (airline.name, airline.isRegistered, airline.isFunded);
    }

    function getTotalRegisteredAirlines()
        public
        view
        requireIsOperational
        returns (uint256)
    {
        return totalRegisteredAirlines;
    }

    function getTotalFundedAirlines()
        public
        view
        requireIsOperational
        returns (uint256)
    {
        return totalFundedAirlines;
    }

    function registerFlight(
        bytes32 flightKey,
        uint256 timestamp,
        address airline,
        string memory flightNumber,
        string memory departureLocation,
        string memory arrivalLocation
    )
        public
        payable
        requireIsOperational
        requireIsAirlineFunded(airline)
        requireFlightIsNotRegistered(flightKey)
    {
        allFlights[flightKey] = Flight(
            true,
            flightKey,
            airline,
            flightNumber,
            0,
            timestamp,
            departureLocation,
            arrivalLocation
        );
        registeredFlights.push(flightKey);
        emit FlightRegistered(flightKey);
    }

    function getTotalRegisteredFlights()
        public
        view
        requireIsOperational
        returns (uint256)
    {
        return registeredFlights.length;
    }

    function processFlightStatus(
        address airline,
        string calldata flight,
        uint256 timestamp,
        uint8 statusCode
    ) external requireIsOperational {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(!hasFlightLanded(flightKey), "Flight has already landed.");
        if (allFlights[flightKey].statusCode == 0) {
            allFlights[flightKey].statusCode = statusCode;
            if (statusCode == 20) {
                creditInsurees(flightKey);
            }
        }
        emit ProcessedFlightStatus(flightKey, statusCode);
    }

    function buy(
        bytes32 flightKey,
        address customer,
        uint256 amount,
        uint256 payout
    ) external payable requireIsOperational {
        require(!hasFlightLanded(flightKey), "Flight has already landed");

        insurances[flightKey].push(Insurance(customer, amount, payout, false));
        emit CustomerInsured(flightKey, customer, amount, payout);
    }

    function creditInsurees(bytes32 flightKey) internal requireIsOperational {
        for (uint256 i = 0; i < insurances[flightKey].length; i++) {
            Insurance memory insurance = insurances[flightKey][i];
            insurance.isPaid = true;
            uint256 amount = insurance.amount.mul(insurance.payPercentage).div(
                100
            );
            insurancePayouts[insurance.customer] = insurancePayouts[
                insurance.customer
            ].add(amount);
            emit InsureeCredited(flightKey, insurance.customer, amount);
        }
    }

    function pay(address payable payoutAddress)
        external
        payable
        requireIsOperational
    {
        uint256 amount = insurancePayouts[payoutAddress];
        require(
            address(this).balance >= amount,
            "Error! avilable fund less than claim amount."
        );
        require(amount > 0, "No funds avilable for withdrawal.");
        insurancePayouts[payoutAddress] = 0;
        address(uint160(address(payoutAddress))).transfer(amount);
        emit PayInsuree(payoutAddress, amount);
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {}
}
