import hre from "hardhat";
import { zeroAddress } from "viem";
import { saveAddresses } from "./utils/io";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log("Deployer:", deployer.account.address);

  // 1) GovToken
  const token = await hre.viem.deployContract("GovToken");
  await publicClient.waitForTransactionReceipt({ hash: token.deploymentTransaction()!.hash as `0x${string}` });
  console.log("GovToken:", token.address);

  // Delegate votes to deployer
  const txDel = await token.write.delegate([deployer.account.address]);
  await publicClient.waitForTransactionReceipt({ hash: txDel });

  // 2) Timelock (minDelay=60s)
  const timelock = await hre.viem.deployContract("Timelock", [60n, [], [], deployer.account.address]);
  await publicClient.waitForTransactionReceipt({ hash: timelock.deploymentTransaction()!.hash as `0x${string}` });
  console.log("Timelock:", timelock.address);

  // 3) Governor
  const governor = await hre.viem.deployContract("MyGovernor", [token.address, timelock.address]);
  await publicClient.waitForTransactionReceipt({ hash: governor.deploymentTransaction()!.hash as `0x${string}` });
  console.log("Governor:", governor.address);

  // 4) Box owned by Timelock
  const box = await hre.viem.deployContract("Box", [timelock.address]);
  await publicClient.waitForTransactionReceipt({ hash: box.deploymentTransaction()!.hash as `0x${string}` });
  console.log("Box:", box.address);

  // 5) Roles wiring
  const PROPOSER_ROLE = await timelock.read.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.read.EXECUTOR_ROLE();
  const TIMELOCK_ADMIN_ROLE = await timelock.read.TIMELOCK_ADMIN_ROLE();

  // Proposer: Governor
  let tx = await timelock.write.grantRole([PROPOSER_ROLE, governor.address]);
  await publicClient.waitForTransactionReceipt({ hash: tx });

  // Executor: anyone
  tx = await timelock.write.grantRole([EXECUTOR_ROLE, zeroAddress]);
  await publicClient.waitForTransactionReceipt({ hash: tx });

  // Revoke admin from deployer (safety)
  tx = await timelock.write.revokeRole([TIMELOCK_ADMIN_ROLE, deployer.account.address]);
  await publicClient.waitForTransactionReceipt({ hash: tx });

  // Save addresses
  saveAddresses({
    token: token.address as `0x${string}`,
    timelock: timelock.address as `0x${string}`,
    governor: governor.address as `0x${string}`,
    box: box.address as `0x${string}`,
  });

  console.log("✅ Deploy + wiring complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
