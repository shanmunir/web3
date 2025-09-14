import hre from "hardhat";
import { encodeFunctionData, keccak256, toHex } from "viem";
import { loadAddresses, loadLatestProposal } from "./utils/io";

const DESCRIPTION = "Proposal #1: store 42 in Box";

async function main() {
  const publicClient = await hre.viem.getPublicClient();
  const network = hre.network.name;

  const addrs = loadAddresses();
  const governor = await hre.viem.getContractAt("MyGovernor", addrs.governor);
  const box = await hre.viem.getContractAt("Box", addrs.box);

  const boxAbi = (await hre.artifacts.readArtifact("Box")).abi;
  const calldata = encodeFunctionData({
    abi: boxAbi,
    functionName: "store",
    args: [42n],
  });
  const descriptionHash = keccak256(toHex(Buffer.from(DESCRIPTION)));

  const proposalIdStr = process.env.PROPOSAL_ID || loadLatestProposal(network);
  if (!proposalIdStr) throw new Error("No PROPOSAL_ID provided/found.");
  const proposalId = BigInt(proposalIdStr);

  // Queue
  let tx = await governor.write.queue([[addrs.box], [0n], [calldata], descriptionHash]);
  await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log("✅ Queued");

  // (Local only) jump timelock delay (60s)
  if (network === "hardhat") {
    await hre.network.provider.send("evm_increaseTime", [61]);
    await hre.network.provider.send("evm_mine");
  }

  // Execute
  tx = await governor.write.execute([[addrs.box], [0n], [calldata], descriptionHash]);
  await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log("✅ Executed");

  const v = await box.read.value();
  console.log("Box value →", v.toString());
}

main().catch((e) => { console.error(e); process.exit(1); });
