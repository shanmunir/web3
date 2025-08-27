import { ethers } from "ethers";
import { getWallet } from "./utils.mjs";
import { ABI_STK, ABI_STAKING } from "./abi.mjs";
import { ADDR_STK, ADDR_STAKING } from "./config.mjs";

const wallet = getWallet();
const stk = new ethers.Contract(ADDR_STK, ABI_STK, wallet);
const staking = new ethers.Contract(ADDR_STAKING, ABI_STAKING, wallet);

const amount = ethers.parseUnits(process.argv[2] || "1000", 18);

(async () => {
  console.log("Approving STK -> Staking...");
  let tx = await stk.approve(ADDR_STAKING, amount);
  await tx.wait();

  console.log("Staking amount:", ethers.formatUnits(amount, 18));
  tx = await staking.stake(amount);
  await tx.wait();

  console.log("Staked successfully ✅");
})();
