// hardhat.config.ts
import "@nomicfoundation/hardhat-toolbox-viem";

export default {
  networks: {
    hardhat: {
      type: "hardhat",      // ← required by EDR typing
      chainId: 31337,
    },
    sepolia: {
      type: "http",         // ← required by EDR typing
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: { apiKey: process.env.ETHERSCAN_KEY || "" },
};
