const tAssert = require("truffle-assertions");

var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");

var BigNumber = require("bignumber.js");
var Web3 = require("web3");

contract("Flight Surety Tests", async (accounts) => {
  //------------- Initial Configs ----------------//
  const url = accounts.url;
  let owner = accounts[0];
  let firstAirlineName = "First Airline";
  let web3 = new Web3(new Web3.providers.HttpProvider(url));
  let flightSuretyData;
  let flightSuretyApp;
  const airlineRegistrationFee = web3.utils.toWei("10", "ether");
  //------------------------------------------//
  before("setup contract", async () => {
    flightSuretyData = await FlightSuretyData.new(
      web3.utils.utf8ToHex(firstAirlineName),
      { from: owner }
    );
    flightSuretyApp = await FlightSuretyApp.new(FlightSuretyData.address, {
      from: owner,
    });

    await flightSuretyData.authorizeContract(flightSuretyApp.address, {
      from: owner,
    });
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  describe("Operating Status Tests", () => {
    it(`(multiparty) has correct initial isOperational() value`, async function () {
      let status = await flightSuretyApp.isOperational.call();
      assert.equal(status, true, "Incorrect initial operating status value");
    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
      let accessDenied = false;
      try {
        await flightSuretyApp.setOperatingStatus(false, {
          from: testAddresses[2],
        });
      } catch (e) {
        accessDenied = true;
      }
      assert.equal(
        accessDenied,
        true,
        "Access not restricted to Contract Owner"
      );
    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
      let isOperational = await flightSuretyApp.isOperational.call({
        from: owner,
      });
      assert.equal(isOperational, true, "Contract is not operational");

      let accessDenied = false;
      try {
        await flightSuretyApp.setOperatingStatus(false, {
          from: owner,
        });
        isOperational = await flightSuretyApp.isOperational.call({
          from: owner,
        });
      } catch (e) {
        accessDenied = true;
      }
      assert.equal(
        isOperational,
        false,
        "Contract Owner can't access  setOperatingStatus()"
      );

      // Set it back for other tests to work
      await flightSuretyApp.setOperatingStatus(true);
    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
      await flightSuretyApp.setOperatingStatus(false);

      let reverted = false;
      try {
        await flightSurety.setTestingMode(true);
      } catch (e) {
        reverted = true;
      }
      assert.equal(
        reverted,
        true,
        "Access not blocked for requireIsOperational"
      );

      // Set it back for other tests to work
      await flightSuretyApp.setOperatingStatus(true);
    });
    //-------------------------------------
  });

  /****************************************************************************************/
  /* Fund Airlines                                                                        */
  /****************************************************************************************/
  describe("Fund Airline Tests", () => {
    it("should not allow the airline to fundAirline itself if value sent is less than REGISTRATION_FEE", async () => {
      let result = true;

      try {
        await flightSuretyApp.fundAirline({
          from: owner,
          value: web3.utils.toWei("9", "ether"),
        }),
          "Minimum REGISTRATION_FEE is required";
      } catch (e) {
        result = false;
      }

      // ASSERT
      assert.equal(
        result,
        false,
        "Airline value sent is less than REGISTRATION_FEE"
      );
    });

    it("(airline) can fund itself using fundAirline()", async () => {
      // ARRANGE
      let result = false;

      // ACT
      try {
        await flightSuretyApp.fundAirline({
          from: owner,
          value: airlineRegistrationFee,
        });

        const airline = await flightSuretyApp.fetchAirlineDetail.call(owner);
        result = airline["2"];
      } catch (e) {
        console.log(e);
      }

      // ASSERT
      assert.equal(result, true, "Airline is not funded.");
    });
  });

  describe("Register Airline Tests", () => {
    before("setup contract", async () => {
      flightSuretyData = await FlightSuretyData.new(
        web3.utils.utf8ToHex(firstAirlineName),
        { from: owner }
      );
      flightSuretyApp = await FlightSuretyApp.new(FlightSuretyData.address);

      await flightSuretyData.authorizeContract(flightSuretyApp.address, {
        from: owner,
      });
    });

    it("(airline) cannot register an Airline using registerAirline() if it is not funded", async () => {
      // ARRANGE
      const secondAirline = accounts[1];
      let secondAirlineName = "Second Airline";

      // ACT
      try {
        await flightSuretyApp.registerAirline(
          secondAirline,
          web3.utils.utf8ToHex(secondAirlineName),
          {
            from: secondAirline,
          }
        );
      } catch (e) {}
      let result = await flightSuretyApp.isAirlineRegistered.call(
        secondAirline
      );

      // ASSERT
      assert.equal(
        result,
        false,
        "Airline should not be able to register another airline if it hasn't provided funding"
      );
    });
    it("should allow a funded airline to register another airline", async () => {
      // ARRANGE
      let secondAirline = accounts[1];
      const secondAirlineName = "Second Airline";
      let result = false;

      // ACT
      try {
        await flightSuretyApp.registerAirline(
          secondAirline,
          web3.utils.utf8ToHex(secondAirlineName),
          { from: owner }
        );
        await flightSuretyApp.fundAirline({
          from: secondAirline,
          value: airlineRegistrationFee,
        });
        result = await flightSuretyApp.fetchAirlineDetail.call(secondAirline);
        result = result["1"];
      } catch (e) {
        console.log(e);
      }

      // ASSERT
      assert.equal(
        result,
        true,
        "Airline should be able to register another airline after it has provided funding"
      );
    });

    it("(multi-party consensus) should ask for consensus before accepting funding", async () => {
      let airlineFunded = false;

      await flightSuretyApp.registerAirline(
        accounts[2],
        web3.utils.utf8ToHex("Third Airline"),
        { from: accounts[1] }
      );
      await flightSuretyApp.fundAirline({
        from: accounts[2],
        value: airlineRegistrationFee,
      });

      await flightSuretyApp.registerAirline(
        accounts[3],
        web3.utils.utf8ToHex("Fourth Airline"),
        { from: accounts[2] }
      );
      await flightSuretyApp.fundAirline({
        from: accounts[3],
        value: airlineRegistrationFee,
      });

      try {
        await flightSuretyApp.registerAirline(
          accounts[4],
          web3.utils.utf8ToHex("Fifth Airline"),
          { from: owner }
        );
        await flightSuretyApp.registerAirline(
          accounts[4],
          web3.utils.utf8ToHex("Fifth Airline"),
          { from: accounts[1] }
        );

        await flightSuretyApp.fundAirline({
          from: accounts[4],
          value: airlineRegistrationFee,
        });
        airlineFunded = true;
      } catch (e) {
        console.log(e);
      }

      assert.equal(airlineFunded, true, "Fifth airline needs min of 2 votes");
    });
  });

  describe("Register Flights Tests", () => {
    before("setup contract", async () => {
      flightSuretyData = await FlightSuretyData.new(
        web3.utils.utf8ToHex(firstAirlineName),
        { from: owner }
      );
      flightSuretyApp = await FlightSuretyApp.new(FlightSuretyData.address);

      await flightSuretyData.authorizeContract(flightSuretyApp.address, {
        from: owner,
      });
    });

    it("(airline) cannot register a Flight using registerFlight() if it is not funded", async () => {
      let flightNumber = "Test Flight";
      let departureTime = Date.now();
      let departureLocation = "Test, Departure";
      let arrivalLocation = "Test, Destination";

      await tAssert.fails(
        flightSuretyApp.registerFlight(
          flightNumber,
          departureTime,
          departureLocation,
          arrivalLocation,
          { from: accounts[6] }
        ),
        "Airline is not funded"
      );
    });

    it("(airline) can register a Flight using registerFlight() if it is funded", async () => {
      let flightNumber = "Test Flight";
      let departureTime = Date.now();
      let departureLocation = "Test, Departure";
      let arrivalLocation = "Test, Destination";

      await tAssert.passes(
        flightSuretyApp.registerFlight(
          flightNumber,
          departureTime,
          departureLocation,
          arrivalLocation,
          { from: accounts[1] }
        ),
        "Airline is not funded"
      );
    });
  });

  describe("Buy Insurance Tests", () => {
    flightSuretyData = null;
    flightSuretyApp = null;

    before("setup contract", async () => {
      flightSuretyData = await FlightSuretyData.new(
        web3.utils.utf8ToHex(firstAirlineName),
        { from: owner }
      );
      flightSuretyApp = await FlightSuretyApp.new(FlightSuretyData.address, {
        from: owner,
      });

      await flightSuretyData.authorizeContract(flightSuretyApp.address, {
        from: owner,
      });
      await flightSuretyData.authorizeContract(owner, { from: owner });
    });

    it("should not allow to buy insurance for an invalid flight", async () => {
      await tAssert.fails(
        flightSuretyApp.buy(web3.utils.utf8ToHex("Invalid Flight Number"), {
          from: owner,
        }),
        "Flight is not registered"
      );
    });
    it("should not allow insurance value higher than 1 ether", async () => {
      let flightNumber = "Test Flight3";
      let departureTime = 1234567899; //hardcoded to get correct flightkey each time
      let departureLocation = "Test, Departure3";
      let arrivalLocation = "Test, Destination3";
      let flightKey =
        "0x96e4a47431169256b2964080b9cd905ed676ec37a7910d8604b4f5ec5e16c685";

      await flightSuretyApp.registerFlight(
        flightNumber,
        departureTime,
        departureLocation,
        arrivalLocation,
        { from: owner }
      );
      await tAssert.fails(
        flightSuretyApp.buy(flightKey, {
          from: accounts[7],
          value: web3.utils.toWei("2", "ether"),
        }),
        "Value exceeds max insurance plan."
      );
    });
    it("should allow to buy insurance for a registered flight", async () => {
      let flightKey =
        "0x96e4a47431169256b2964080b9cd905ed676ec37a7910d8604b4f5ec5e16c685";

      await tAssert.passes(
        flightSuretyApp.buy(flightKey, {
          from: accounts[7],
          value: web3.utils.toWei("1", "ether"),
        })
      );
    });
  });
});
