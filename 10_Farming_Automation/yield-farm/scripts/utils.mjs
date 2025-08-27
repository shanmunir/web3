import { ethers } from "ethers";
import { RPC_URL, PRIVATE_KEY } from "./config.mjs";

export function getWallet() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Wallet(PRIVATE_KEY, provider);
}
