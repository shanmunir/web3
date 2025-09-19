// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const Factory = await ethers.getContractFactory("Crowdfunding");
  const cf = await Factory.deploy();

  if (typeof (cf as any).waitForDeployment === "function") {
    await (cf as any).waitForDeployment(); // v6
    console.log("Crowdfunding deployed to:", await (cf as any).getAddress());
  } else {
    await (cf as any).deployed();          // v5
    console.log("Crowdfunding deployed to:", (cf as any).address);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
