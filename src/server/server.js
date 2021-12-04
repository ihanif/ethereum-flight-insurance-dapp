import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";
import "babel-polyfill";

let config = Config["localhost"];
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);

async function initOracles() {
  const accounts = await web3.eth.getAccounts();
  const oracleRegistrationFee = await flightSuretyApp.methods
    .ORACLE_REGISTRATION_FEE()
    .call({ from: accounts[0] });
  console.log("oracle registration fee: ", oracleRegistrationFee);

  for (const account of accounts) {
    console.log("registering orcale for account: ", account);
    await flightSuretyApp.methods.registerOracle().send({
      from: account,
      value: oracleRegistrationFee,
      gas: 3000000,
    });
  }
  console.log("Total oracles registered: ", accounts.length);
}

async function submitOracleResponse(
  requestedIndex,
  airline,
  flight,
  timestamp
) {
  const accounts = await web3.eth.getAccounts();
  for (const account of accounts) {
    const myOracleIndexes = await flightSuretyApp.methods
      .getMyIndexes()
      .call({ from: account });
    console.log("Account: " + account, ", indexes: ", myOracleIndexes);
    for (const currentIndex of myOracleIndexes) {
      try {
        if (requestedIndex == currentIndex) {
          console.log(
            "Submitting Oracle response For Flight: " +
              flight +
              " at Index: " +
              currentIndex
          );
          await flightSuretyApp.methods
            .submitOracleResponse(currentIndex, airline, flight, timestamp, 20)
            .send({ from: account, gas: 3000000 });
        }
      } catch (e) {
        console.log(e);
      }
    }
  }
}

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0,
  },
  async function (error, event) {
    if (error) console.log(error);
    console.log(event);

    if (!error) {
      await submitOracleResponse(
        event.returnValues[0],
        event.returnValues[1],
        event.returnValues[2],
        event.returnValues[3]
      );
    }
  }
);

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

initOracles();

export default app;
