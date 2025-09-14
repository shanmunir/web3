// scripts/02_vote.ts
import hre from "hardhat";
import { loadLatestProposal, loadAddresses } from "./utils/io";

async function main() {
  const publicClient = await hre.viem.getPublicClient();
  const network = hre.network.name;

  const proposalIdStr = process.env.PROPOSAL_ID || loadLatestProposal(network);
  if (!proposalIdStr) throw new Error("No PROPOSAL_ID provided/found.");
  const proposalId = BigInt(proposalIdStr);

  const addrs = loadAddresses();
  const governor = await hre.viem.getContractAt("MyGovernor", addrs.governor);

  // (Local only) mine past votingDelay
  if (network === "hardhat") {
    await hre.network.provider.send("hardhat_mine", ["0x3"]);
  }

  // 0=Against, 1=For, 2=Abstain
  const tx = await governor.write.castVoteWithReason([proposalId, 1n, "Ship it"]);
  await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`✅ Voted FOR on proposal ${proposalId}`);

  // (Local only) skip through votingPeriod quickly
  if (network === "hardhat") {
    await hre.network.provider.send("hardhat_mine", ["0xA000"]);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
