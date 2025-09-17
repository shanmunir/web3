import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import "ts-node/register";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },

  networks: {
    // In-memory dev chain (default Hardhat Network)
    hardhat: {
      chainId: 31337,
    },

    // Local JSON-RPC node (run: npx hardhat node)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // Sepolia Testnet
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },

  // Etherscan/Blockscout verification
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },

  typechain: {
    target: "ethers-v6",
  },
};

export default config;
