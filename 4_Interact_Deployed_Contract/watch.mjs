import 'dotenv/config';
import { JsonRpcProvider, Contract } from 'ethers';
import { abi } from './abi.mjs';

const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const contract = new Contract(process.env.CONTRACT_ADDRESS, abi, provider);

console.log('Watching ValueChanged events... (Ctrl+C to exit)');

contract.on('ValueChanged', (setter, newValue, ev) => {
  console.log(`[EVENT] setter=${setter} newValue=${newValue.toString()} tx=${ev.log.transactionHash}`);
});

// keep process alive
process.stdin.resume();
