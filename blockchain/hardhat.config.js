require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun"
    }
  },
  networks: {
    hardhat: {
      accounts: {
        count: 100 // Generates 100 accounts on startup!
      }
    }
  }
};
