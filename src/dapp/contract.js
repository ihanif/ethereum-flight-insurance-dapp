import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";

export default class Contract {
  constructor(network, callback) {
    let config = Config[network];
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.initialize(callback);
    this.owner = null;
    this.airlines = [];
    this.passengers = [];
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0];

      let counter = 1;

      while (this.airlines.length < 5) {
        this.airlines.push(accts[counter++]);
      }
      console.log("airlines: ", this.airlines);

      while (this.passengers.length < 5) {
        this.passengers.push(accts[counter++]);
      }
      console.log("passengers: ", this.passengers);
      callback();
    });
  }

  isOperational(callback) {
    let self = this;
    self.flightSuretyApp.methods
      .isOperational()
      .call({ from: self.owner }, callback);
  }

  fetchFlightStatus(flight, callback) {
    let self = this;
    let payload = {
      airline: self.airlines[0],
      flight: flight,
      timestamp: Math.floor(Date.now() / 1000),
    };
    self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.owner }, (error, result) => {
        console.log(
          "contract fetchFlightStatus result: ",
          result,
          ", error: ",
          error
        );
        callback(error, result);
      });
  }

  registerAirline(airlineAddress, airlineName, callback) {
    let self = this;
    self.flightSuretyApp.methods
      .registerAirline(airlineAddress, self.web3.utils.utf8ToHex(airlineName))
      .send({ from: self.owner }, (error, result) => {
        console.log(
          "contract registerAirline result: ",
          result,
          ", error: ",
          error
        );
        callback(error, result);
      });
  }

  fundAirline(fundedAirlineAddress, fundingAmount, callback) {
    let self = this;
    self.flightSuretyApp.methods.fundAirline().send(
      {
        from: fundedAirlineAddress,
        value: self.web3.utils.toWei(fundingAmount, "ether"),
      },
      (error, result) => {
        console.log(
          "contract fundedAirlineAddress result: ",
          result,
          ", error: ",
          error
        );
        callback(error, result);
      }
    );
  }

  registerFlight(
    flightNumber,
    departureTime,
    departureLocation,
    arrivalLocation,
    callback
  ) {
    let self = this;
    const departureTimeFormatted = Math.round(
      new Date(departureTime).getTime() / 1000
    );
    self.flightSuretyApp.methods
      .registerFlight(
        flightNumber,
        departureTimeFormatted,
        departureLocation,
        arrivalLocation
      )
      .send({ from: self.owner }, (error, result) => {
        console.log(
          "contract registerFlight result: ",
          result,
          ", error: ",
          error
        );
        callback(error, result);
      });
  }

  buyInsurance(flightNumber, insuredAmount, callback) {
    let self = this;
    const amount = self.web3.utils.toWei(insuredAmount.toString(), "ether");
    self.flightSuretyApp.methods.buy(flightNumber).send(
      {
        from: self.owner,
        value: amount,
      },
      (error, result) => {
        console.log(
          "contract buyInsurance result: ",
          result,
          ", error: ",
          error
        );
        callback(error, result);
      }
    );
  }

  claimInsurance(callback) {
    let self = this;
    self.flightSuretyApp.methods
      .pay()
      .send({ from: self.owner }, (error, result) => {
        console.log(
          "contract claimInsurance result: ",
          result,
          ", error: ",
          error
        );
        callback(error, result);
      });
  }
}
