import 'dotenv/config';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { abi } from './abi.mjs';

const RPC  = process.env.SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
const PK   = process.env.PRIVATE_KEY;
const ADDR = process.env.CONTRACT_ADDRESS;

console.log('RPC:', RPC);

if (!PK || !ADDR) {
  throw new Error('Missing env: PRIVATE_KEY or CONTRACT_ADDRESS');
}

const provider = new JsonRpcProvider(RPC);
const wallet   = new Wallet(PK, provider);
const contract = new Contract(ADDR, abi, wallet);

async function assertHasCode(address) {
  const code = await provider.getCode(address);
  if (!code || code === '0x') {
    throw new Error(`No contract deployed at ${address} on ${RPC}`);
  }
}

async function main() {
  console.log('Using account:', await wallet.getAddress());
  console.log('Network chainId:', (await provider.getNetwork()).chainId.toString());
  console.log('Contract:', ADDR);

  await assertHasCode(ADDR);

  // READ
  const current = await contract.get();
  console.log('Current value =', current.toString());

  // WRITE
  const newValue = BigInt(Math.floor(Math.random() * 1000));
  console.log('Setting new value =>', newValue.toString());

  const tx = await contract.set(newValue);
  console.log('Tx sent:', tx.hash);

  const receipt = await tx.wait();
  console.log('Mined in block:', receipt.blockNumber, 'status:', receipt.status);

  // READ again
  const updated = await contract.get();
  console.log('Updated value =', updated.toString());
}

main().catch(console.error);
