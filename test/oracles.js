var Test = require("../config/testConfig.js");
var Web3 = require("web3");

contract("Oracles", async (accounts) => {
  const url = accounts.url;
  let web3 = new Web3(new Web3.providers.HttpProvider(url));
  let config;

  const TEST_ORACLES_COUNT = 20;
  // Watch contract events
  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;

  before("setup contract", async () => {
    config = await Test.Config(accounts);

    await config.flightSuretyData.authorizeContract(
      config.flightSuretyApp.address,
      {
        from: config.owner,
      }
    );
  });

  it("can register oracles", async () => {
    // ARRANGE
    let fee = await config.flightSuretyApp.ORACLE_REGISTRATION_FEE.call();

    // ACT
    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
      await config.flightSuretyApp.registerOracle({
        from: accounts[a],
        value: fee,
      });
      let result = await config.flightSuretyApp.getMyIndexes.call({
        from: accounts[a],
      });
      console.log(
        `Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`
      );
    }
  });

  it("can request flight status", async () => {
    // ARRANGE
    //let flight = "ND1309"; // Course number
    let flightNumber = "Oracles Test Flight";
    let timestamp = 1234567899;
    let departureLocation = "Oracles Test, Departure";
    let arrivalLocation = "Oracles Test, Destination";

    await config.flightSuretyApp.fundAirline({
      from: config.owner,
      value: web3.utils.toWei("10", "ether"),
    });
    await config.flightSuretyApp.registerFlight(
      flightNumber,
      timestamp,
      departureLocation,
      arrivalLocation,
      { from: config.owner }
    );

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.fetchFlightStatus(
      config.owner,
      flightNumber,
      timestamp
    );

    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({
        from: accounts[a],
      });
      for (let idx = 0; idx < 3; idx++) {
        try {
          // Submit a response...it will only be accepted if there is an Index match
          await config.flightSuretyApp.submitOracleResponse(
            oracleIndexes[idx],
            config.owner,
            flightNumber,
            timestamp,
            STATUS_CODE_ON_TIME,
            { from: accounts[a] }
          );
          console.log(
            "Fetched flight status at ",
            idx,
            oracleIndexes[idx].toNumber()
          );
        } catch (e) {
          //console.log(e);
          // Enable this when debugging
          console.log(
            "\nError",
            idx,
            oracleIndexes[idx].toNumber(),
            flightNumber,
            timestamp
          );
        }
      }
    }
  });
});
