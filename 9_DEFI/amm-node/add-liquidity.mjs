import 'dotenv/config';
import { JsonRpcProvider, Wallet, Contract, parseUnits, formatUnits } from 'ethers';
import { ERC20_ABI_SHT,ERC20_ABI_USD, PAIR_ABI } from './abi.mjs';

const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet   = new Wallet(process.env.PRIVATE_KEY, provider);

const SHT  = new Contract(process.env.TOKEN_SHT, ERC20_ABI_SHT, wallet);
const USD  = new Contract(process.env.TOKEN_USD, ERC20_ABI_USD, wallet);
const PAIR = new Contract(process.env.PAIR,      PAIR_ABI, wallet);

const me = await wallet.getAddress();

const decM = await SHT.decimals();
const decU = await USD.decimals();

const amtM = parseUnits('1000', decM);   // 1000 SHT
const amtU = parseUnits('1000', decU);   // 1000 USDTest (1:1 initial price)

console.log('Approving pair to pull tokens…');
await (await SHT.approve(PAIR.target, amtM)).wait();
await (await USD.approve(PAIR.target, amtU)).wait();

console.log('Adding liquidity…');
await (await PAIR.addLiquidity(amtM, amtU)).wait();

const [r0, r1] = await PAIR.getReserves();
console.log('Reserves:', r0.toString(), r1.toString());

const bM = await SHT.balanceOf(me);
const bU = await USD.balanceOf(me);
console.log('My SHT:', formatUnits(bM, decM));
console.log('My USD:', formatUnits(bU, decU));
