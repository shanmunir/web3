import 'dotenv/config';
import { JsonRpcProvider, Contract, parseUnits, formatUnits } from 'ethers';
import { ERC20_ABI_SHT,ERC20_ABI_USD, PAIR_ABI } from './abi.mjs';

const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const SHT  = new Contract(process.env.TOKEN_SHT, ERC20_ABI_SHT, provider);
const USD  = new Contract(process.env.TOKEN_USD, ERC20_ABI_USD, provider);
const PAIR = new Contract(process.env.PAIR,      PAIR_ABI, provider);

const [decM, decU] = await Promise.all([SHT.decimals(), USD.decimals()]);
const amtIn = parseUnits(process.argv[2] || '10', decM); // swap 10 SHT -> USD
const out   = await PAIR.getAmountOut(SHT.target, amtIn);

console.log(`Quote: ${formatUnits(amtIn, decM)} SHT -> ${formatUnits(out, decU)} USDTest`);
