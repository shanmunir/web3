import 'dotenv/config';
import { JsonRpcProvider, Contract } from 'ethers';
import { ABI } from './abi.js';

const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const contract = new Contract(process.env.CONTRACT_ADDRESS, ABI, provider);

async function main() {
  // Filter for ValueChanged(setter indexed, newValue non-indexed)
  const filter = contract.filters.ValueChanged(null); // null = any setter
  // Query last ~10k blocks or specify fromBlock
  const latest = await provider.getBlockNumber();
  const fromBlock = Math.max(0, latest - 10_000);

  const events = await contract.queryFilter(filter, fromBlock, latest);
  console.log(`Found ${events.length} ValueChanged events (from block ${fromBlock}):`);
  for (const ev of events) {
    const { args, blockNumber, transactionHash } = ev;
    console.log(`- block ${blockNumber} | setter ${args.setter} -> newValue ${args.newValue.toString()} | ${transactionHash}`);
  }
}

main().catch(console.error);
