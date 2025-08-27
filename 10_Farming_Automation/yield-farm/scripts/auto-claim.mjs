import { ethers } from "ethers";
import { getWallet } from "./utils.mjs";
import { ABI_STAKING } from "./abi.mjs";
import { ADDR_STAKING } from "./config.mjs";

const wallet = getWallet();
const staking = new ethers.Contract(ADDR_STAKING, ABI_STAKING, wallet);

const MIN_CLAIM = ethers.parseUnits(process.env.MIN_CLAIM || "5", 18);
const INTERVAL_SEC = parseInt(process.env.CHECK_INTERVAL_SEC || "60", 10);

async function loop() {
  try {
    const e = await staking.earned(wallet.address);
    console.log(new Date().toISOString(), "earned:", ethers.formatUnits(e, 18));
    if (e >= MIN_CLAIM) {
      const tx = await staking.getReward();
      console.log("Claiming...", tx.hash);
      await tx.wait();
      console.log("Claimed ✅");
    }
  } catch (err) {
    console.error("Error:", err.shortMessage || err.message);
  } finally {
    setTimeout(loop, INTERVAL_SEC * 1000);
  }
}
loop();
