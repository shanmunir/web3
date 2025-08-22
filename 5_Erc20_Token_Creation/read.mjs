import 'dotenv/config';
import { JsonRpcProvider, Wallet, Contract, formatUnits } from 'ethers';
import { ERC20_ABI } from './abi.mjs';

const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet   = new Wallet(process.env.PRIVATE_KEY, provider);
const token    = new Contract(process.env.TOKEN_ADDRESS, ERC20_ABI, provider);

async function main() {
  const [nm, sym, dec, supply] = await Promise.all([
    token.name(), token.symbol(), token.decimals(), token.totalSupply()
  ]);
  console.log(`Token: ${nm} (${sym}), decimals=${dec}`);
  console.log(`Total supply: ${formatUnits(supply, dec)} ${sym}`);

  const me = await wallet.getAddress();
  const bal = await token.balanceOf(me);
  console.log(`My balance: ${formatUnits(bal, dec)} ${sym}`);
}
main().catch(console.error);
