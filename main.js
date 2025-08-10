import { BrowserProvider, formatEther } from "ethers";

const btn = document.getElementById("connect");
const addrEl = document.getElementById("addr");
const balEl  = document.getElementById("bal");
const chainEl= document.getElementById("chain");

async function connect() {
  if (!window.ethereum) {
    alert("MetaMask not found. Install the extension and reload.");
    return;
  }
  const provider = new BrowserProvider(window.ethereum);

  // Ask user to connect accounts
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const address = accounts[0];

  // Chain info
  const net = await provider.getNetwork();
  chainEl.textContent = `${net.chainId}`;

  // Balance
  const balWei = await provider.getBalance(address);
  const balEth = formatEther(balWei);

  addrEl.textContent = address;
  balEl.textContent  = `${balEth} ETH`;

  // Live updates if user switches account/network
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged", () => location.reload());
}

btn.addEventListener("click", connect);
