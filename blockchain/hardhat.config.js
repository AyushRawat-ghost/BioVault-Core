require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../backend/.env" }); // Load deployer key and RPC from backend env

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
        count: 100
      }
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : []
    }
  }
};
