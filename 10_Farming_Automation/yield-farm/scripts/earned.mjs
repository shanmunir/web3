import { ethers } from "ethers";
import { getWallet } from "./utils.mjs";
import { ABI_STAKING } from "./abi.mjs";
import { ADDR_STAKING } from "./config.mjs";

const wallet = getWallet();
const staking = new ethers.Contract(ADDR_STAKING, ABI_STAKING, wallet);

const earned = await staking.earned(wallet.address);
console.log("Earned RWD:", ethers.formatUnits(earned, 18));
