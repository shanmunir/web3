import { getWallet } from "./utils.mjs";
import { ABI_STAKING } from "./abi.mjs";
import { ADDR_STAKING } from "./config.mjs";
import { ethers } from "ethers";

const wallet = getWallet();
const staking = new ethers.Contract(ADDR_STAKING, ABI_STAKING, wallet);

const tx = await staking.exit();
console.log("Exit tx:", tx.hash);
await tx.wait();
console.log("Exited (withdraw + claim) ✅");
