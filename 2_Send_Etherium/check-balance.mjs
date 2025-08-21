import { JsonRpcProvider, formatEther } from "ethers";

const RPC_URL = process.env.SEPOLIA_RPC_URL;
const ADDRESS = process.env.ADDRESS;

const provider = new JsonRpcProvider(RPC_URL);
const bal = await provider.getBalance(ADDRESS);
console.log(`${ADDRESS} -> ${formatEther(bal)} ETH`);

