var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic =
  "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

module.exports = {
  networks: {
    /* development: {
      provider: function () {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      },
      network_id: "*",
      gasPrice: 10000000,
      gasLimit: 3141592000000,
    }, */
    development: {
      host: "127.0.0.1", // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: "*",
      gasPrice: 10000000,
      gasLimit: 3141592000000, // Any network (default: none)
    },
  },

  compilers: {
    solc: {
      //version: "^0.4.24",
      version: "^0.5.10",
    },
  },
};
