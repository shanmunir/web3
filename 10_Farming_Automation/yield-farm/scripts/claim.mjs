import { getWallet } from "./utils.mjs";
import { ABI_STAKING } from "./abi.mjs";
import { ADDR_STAKING } from "./config.mjs";
import { ethers } from "ethers";

const wallet = getWallet();
const staking = new ethers.Contract(ADDR_STAKING, ABI_STAKING, wallet);

const tx = await staking.getReward();
console.log("Claim tx:", tx.hash);
await tx.wait();
console.log("Claimed rewards ✅");
