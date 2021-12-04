pragma solidity ^0.5.10;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;
    bool private operational = true;
    FlightSuretyData flightSuretyData;

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint256 AIRLINE_REGISTRATION_FEE = 10 ether;
    uint256 MAX_CUSTOMER_INSURANCE = 1 ether;
    uint256 INSURANCE_PAYOUT_PERCENTAGE = 150;
    uint256 VOTING_CONSENSU_THRESHOLD = 4;
    uint256 MIN_VOTES_TO_REGISTER = 2;

    mapping(address => address[]) public airlineVotes;

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address payable dataContractAddress) public {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContractAddress);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _;
    }

    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAirlineIsRegistered(address airline) {
        require(
            flightSuretyData.isAirlineRegistered(airline),
            "Airline is not registered."
        );
        _;
    }

    modifier requireAirlineIsNotRegistered(address airline) {
        require(
            !flightSuretyData.isAirlineRegistered(airline),
            "Airline is already registered."
        );
        _;
    }

    modifier requireAirlineIsFunded(address airline) {
        require(
            flightSuretyData.isAirlineFunded(airline),
            "Airline is not funded."
        );
        _;
    }

    modifier requireAirlineIsNotFunded(address airline) {
        require(
            !flightSuretyData.isAirlineFunded(airline),
            "Airline is already funded."
        );
        _;
    }

    modifier requireFlightIsNotRegistered(bytes32 flightKey) {
        require(
            !flightSuretyData.isFlightRegistered(flightKey),
            "Flight is already registered."
        );
        _;
    }

    modifier requireMinFunding(uint256 amount) {
        require(msg.value >= amount, "Insufficient Funds.");
        _;
    }

    modifier requireLessThanMaxInsurance() {
        require(
            msg.value <= MAX_CUSTOMER_INSURANCE,
            "Value exceeds max insurance plan."
        );
        _;
    }

    modifier requireFlightIsRegistered(bytes32 flightKey) {
        require(
            flightSuretyData.isFlightRegistered(flightKey),
            "Flight is not registered."
        );
        _;
    }

    modifier requireFlightHasNotLanded(bytes32 flightKey) {
        require(
            !flightSuretyData.hasFlightLanded(flightKey),
            "Flight has already landed."
        );
        _;
    }

    modifier requireCustomerIsNotInsuredForFlight(
        bytes32 flightKey,
        address customer
    ) {
        require(
            !flightSuretyData.isCustomerInsuredForFlight(flightKey, customer),
            "Customer is already insured for flight."
        );
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Check if the contract is operational
     */
    function isOperational() public view requireContractOwner returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    function isAirlineRegistered(address airline)
        public
        view
        requireIsOperational
        returns (bool)
    {
        return flightSuretyData.isAirlineRegistered(airline);
    }

    function isFlightRegistered(bytes32 flightKey)
        public
        view
        requireIsOperational
        returns (bool)
    {
        return flightSuretyData.isFlightRegistered(flightKey);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function registerAirline(address airline, bytes32 name)
        external
        requireIsOperational
        requireAirlineIsFunded(msg.sender)
        returns (
            bool success,
            uint256 votes,
            uint256 totalRegisteredAirlines
        )
    {
        if (
            flightSuretyData.getTotalRegisteredAirlines() <=
            VOTING_CONSENSU_THRESHOLD
        ) {
            flightSuretyData.registerAirline(airline, name, msg.sender);
            return (success, 0, flightSuretyData.getTotalRegisteredAirlines());
        } else {
            bool isDuplicate = false;
            for (uint256 i = 0; i < airlineVotes[airline].length; i++) {
                if (airlineVotes[airline][i] == msg.sender) {
                    isDuplicate = true;
                    break;
                }
            }
            require(
                !isDuplicate,
                "Duplicate vote, you cannot vote for the same airline twice."
            );
            airlineVotes[airline].push(msg.sender);

            if (
                airlineVotes[airline].length >=
                flightSuretyData.getTotalRegisteredAirlines().div(
                    MIN_VOTES_TO_REGISTER
                )
            ) {
                flightSuretyData.registerAirline(airline, name, msg.sender);
                return (
                    true,
                    airlineVotes[airline].length,
                    flightSuretyData.getTotalRegisteredAirlines()
                );
            }
            return (
                false,
                airlineVotes[airline].length,
                flightSuretyData.getTotalRegisteredAirlines()
            );
        }
    }

    function fundAirline()
        external
        payable
        requireIsOperational
        requireAirlineIsRegistered(msg.sender)
        requireAirlineIsNotFunded(msg.sender)
        requireMinFunding(AIRLINE_REGISTRATION_FEE)
        returns (bool)
    {
        address(uint160(address(flightSuretyData))).transfer(
            AIRLINE_REGISTRATION_FEE
        );
        return
            flightSuretyData.fundAirline(msg.sender, AIRLINE_REGISTRATION_FEE);
    }

    function registerFlight(
        string calldata flightNumber,
        uint256 timestamp,
        string calldata departureLocation,
        string calldata arrivalLocation
    ) external requireIsOperational requireAirlineIsFunded(msg.sender) {
        bytes32 flightKey = getFlightKey(msg.sender, flightNumber, timestamp);
        flightSuretyData.registerFlight(
            flightKey,
            timestamp,
            msg.sender,
            flightNumber,
            departureLocation,
            arrivalLocation
        );
    }

    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal requireIsOperational {
        flightSuretyData.processFlightStatus(
            airline,
            flight,
            timestamp,
            statusCode
        );
    }

    function fetchFlightStatus(
        address airline,
        string calldata flight,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    function fetchAirlineDetail(address _airline)
        external
        view
        returns (
            bytes32,
            bool,
            bool
        )
    {
        return flightSuretyData.getAirlineDetailsBy(_airline);
    }

    function buy(bytes32 flightKey)
        public
        payable
        requireIsOperational
        requireFlightIsRegistered(flightKey)
        requireFlightHasNotLanded(flightKey)
        requireCustomerIsNotInsuredForFlight(flightKey, msg.sender)
        requireLessThanMaxInsurance
    {
        address(uint160(address(flightSuretyData))).transfer(msg.value);
        flightSuretyData.buy(
            flightKey,
            msg.sender,
            msg.value,
            INSURANCE_PAYOUT_PERCENTAGE
        );
    }

    function pay() external requireIsOperational {
        flightSuretyData.pay(msg.sender);
    }

    /********************************************************************************************/
    /*                                     ORACLE MANAGEMENT                                    */
    /********************************************************************************************/

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant ORACLE_REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );
    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );
    event OracleRegistered(address oracle);
    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(
            msg.value >= ORACLE_REGISTRATION_FEE,
            "Registration fee is required"
        );

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});

        emit OracleRegistered(msg.sender);
    }

    function getMyIndexes() external view returns (uint8[3] memory) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    /* Called by oracle when a response is available to an outstanding request
     * For the response to be accepted, there must be a pending request that is open
     * and matches one of the three Indexes randomly assigned to the oracle at the
     * time of registration (i.e. uninvited oracles are not welcome)
     */
    function submitOracleResponse(
        uint8 index,
        address airline,
        string calldata flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account)
        internal
        returns (uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    function() external payable {}
}
