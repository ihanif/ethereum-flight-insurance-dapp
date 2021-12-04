const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require("fs");

module.exports = async (deployer) => {
  const firstAirline = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";
  const firstAirlineName = web3.utils.utf8ToHex("First Airline");
  await deployer.deploy(FlightSuretyData, firstAirlineName);
  await deployer.deploy(FlightSuretyApp, FlightSuretyData.address);
  let config = {
    localhost: {
      url: "http://localhost:8545",
      dataAddress: FlightSuretyData.address,
      appAddress: FlightSuretyApp.address,
    },
  };
  fs.writeFileSync(
    __dirname + "/../src/dapp/config.json",
    JSON.stringify(config, null, "\t"),
    "utf-8"
  );
  fs.writeFileSync(
    __dirname + "/../src/server/config.json",
    JSON.stringify(config, null, "\t"),
    "utf-8"
  );
};
