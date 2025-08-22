import 'dotenv/config';
import { JsonRpcProvider, Wallet, Contract, parseUnits } from 'ethers';
import { ERC20_ABI } from './abi.mjs';

const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet   = new Wallet(process.env.PRIVATE_KEY, provider);
const token    = new Contract(process.env.TOKEN_ADDRESS, ERC20_ABI, wallet);

const to    = process.argv[2];         // recipient
const amt   = process.argv[3] || "10"; // in human units (e.g., "10")
if (!to?.startsWith("0x")) throw new Error("Usage: node transfer.mjs 0xRecipient 10");

const dec   = await token.decimals();
const value = parseUnits(amt, dec);

const tx = await token.transfer(to, value);
console.log("Tx sent:", tx.hash);
const rcpt = await tx.wait();
console.log("Mined:", rcpt.blockNumber, "status:", rcpt.status);
