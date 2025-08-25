import 'dotenv/config';
import { JsonRpcProvider, Wallet, Contract, parseUnits, formatUnits } from 'ethers';
import { ERC20_ABI_SHT,ERC20_ABI_USD, PAIR_ABI } from './abi.mjs';

const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet   = new Wallet(process.env.PRIVATE_KEY, provider);

const SHT  = new Contract(process.env.TOKEN_SHT, ERC20_ABI_SHT, wallet);
const USD  = new Contract(process.env.TOKEN_USD, ERC20_ABI_USD, wallet);
const PAIR = new Contract(process.env.PAIR,      PAIR_ABI, wallet);

const decM = await SHT.decimals();
const decU = await USD.decimals();

const amtInHuman = process.argv[2] || '10';
const slippage   = Number(process.argv[3] || '0.01');  // 1%

const amtIn  = parseUnits(amtInHuman, decM);
const quote  = await PAIR.getAmountOut(SHT.target, amtIn);
const minOut = quote - (quote * BigInt(Math.floor(slippage * 10_000)) / 10_000n);

console.log(`Approve ${amtInHuman} SHT for swap…`);
await (await SHT.approve(PAIR.target, amtIn)).wait();

console.log(`Swap SHT -> USDTest. MinOut=${formatUnits(minOut, decU)} (slip ${slippage*100}%)`);
const tx = await PAIR.swapExact(SHT.target, amtIn, minOut, await wallet.getAddress());
console.log('Tx:', tx.hash);
const rcpt = await tx.wait();
console.log('Mined in block', rcpt.blockNumber);

// balances
const [bM, bU] = await Promise.all([SHT.balanceOf(await wallet.getAddress()), USD.balanceOf(await wallet.getAddress())]);
console.log('My SHT:', formatUnits(bM, decM));
console.log('My USD:', formatUnits(bU, decU));
