import hre from "hardhat";
import { encodeFunctionData } from "viem";
import { loadAddresses, saveProposal } from "./utils/io";

const DESCRIPTION = "Proposal #1: store 42 in Box";

async function main() {
  const publicClient = await hre.viem.getPublicClient();
  const network = hre.network.name;

  const addrs = loadAddresses();
  const governor = await hre.viem.getContractAt("MyGovernor", addrs.governor);
  const boxAbi = (await hre.artifacts.readArtifact("Box")).abi;

  // calldata for Box.store(42)
  const calldata = encodeFunctionData({
    abi: boxAbi,
    functionName: "store",
    args: [42n],
  });

  const targets = [addrs.box];
  const values = [0n];
  const calldatas = [calldata];

  const txHash = await governor.write.propose([targets, values, calldatas, DESCRIPTION]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Read ProposalCreated event
  const logs = await governor.getEvents.ProposalCreated({
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  });
  const proposalId = logs[0]?.args.proposalId?.toString();
  if (!proposalId) throw new Error("No ProposalCreated event found");

  saveProposal(network, proposalId);
  console.log(`✅ Proposed. proposalId=${proposalId}`);
  console.log("ℹ️  Wait for votingDelay blocks before voting.");
}

main().catch((e) => { console.error(e); process.exit(1); });
