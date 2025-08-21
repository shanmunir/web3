import { BrowserProvider, formatEther, parseEther, isAddress } from "ethers";

const el = (id) => document.getElementById(id);
const log = (msg) => {
  const box = el("log");
  box.textContent = (box.textContent === "–" ? "" : box.textContent + "\n") + msg;
};

let provider, signer, me;

async function ensureProvider() {
  if (!window.ethereum) throw new Error("MetaMask not found. Install the extension.");
  provider = new BrowserProvider(window.ethereum);
  return provider;
}

async function connect() {
  await ensureProvider();
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  me = accounts[0];
  signer = await provider.getSigner();

  const net = await provider.getNetwork();
  const myBal = await provider.getBalance(me);

  el("me").textContent = me;
  el("chain").textContent = String(net.chainId);
  el("myBal").textContent = `${formatEther(myBal)} ETH`;

  log(`Connected: ${me} on chain ${net.chainId}`);

  // Auto-refresh on changes
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged", () => location.reload());
}

async function refreshBalances() {
  if (!provider || !me) return;
  const net = await provider.getNetwork();
  const myBal = await provider.getBalance(me);
  el("chain").textContent = String(net.chainId);
  el("myBal").textContent = `${formatEther(myBal)} ETH`;
  log("Balances refreshed.");
}

async function checkBalance() {
  await ensureProvider();
  const addr = el("addrIn").value.trim();
  if (!isAddress(addr)) {
    alert("Invalid address");
    return;
  }
  const bal = await provider.getBalance(addr);
  el("addrBal").textContent = `${formatEther(bal)} ETH`;
  log(`Balance(${addr}) = ${formatEther(bal)} ETH`);
}

async function switchToSepolia() {
  if (!window.ethereum) return;
  try {
    // Try switch
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }], // 11155111
    });
  } catch (err) {
    // If not added, add network
    if (err.code === 4902 || /Unrecognized chain ID/i.test(err.message)) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0xaa36a7",
          chainName: "Sepolia",
          nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc.sepolia.org"], // works fine for testing
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        }],
      });
    } else {
      log(`Switch error: ${err.message}`);
    }
  }
}

async function estimate() {
  if (!signer) await connect();
  const to = el("to").value.trim();
  const amt = el("amount").value.trim();
  if (!isAddress(to)) return alert("Invalid recipient address");
  if (!amt || Number.isNaN(Number(amt))) return alert("Invalid amount");

  const txReq = { to, value: parseEther(amt) };

  // Fees (EIP-1559 aware; wallet can also auto-fill)
  const feeData = await provider.getFeeData(); // { gasPrice, maxFeePerGas, maxPriorityFeePerGas }
  log(`FeeData: ${JSON.stringify({
    gasPrice: feeData.gasPrice?.toString(),
    maxFeePerGas: feeData.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
  }, null, 2)}`);

  // Gas estimate
  try {
    const gas = await signer.estimateGas(txReq);
    log(`Estimated gas: ${gas.toString()}`);
  } catch (e) {
    log(`Gas estimate failed: ${e.message}`);
  }
}

async function send() {
  if (!signer) await connect();
  const to = el("to").value.trim();
  const amt = el("amount").value.trim();
  if (!isAddress(to)) return alert("Invalid recipient address");
  if (!amt || Number.isNaN(Number(amt))) return alert("Invalid amount");

  try {
    const tx = await signer.sendTransaction({
      to,
      value: parseEther(amt),
      // You can also explicitly set maxFeePerGas / maxPriorityFeePerGas if needed.
    });
    el("tx").textContent = tx.hash;
    log(`Sent. Tx: ${tx.hash}`);
    const receipt = await tx.wait();
    log(`Mined in block ${receipt.blockNumber}. Status: ${receipt.status}`);
    await refreshBalances();
  } catch (e) {
    log(`Send error: ${e.message}`);
    // Common: insufficient funds, wrong network, user rejected
  }
}

// Wire up UI
el("connect").addEventListener("click", connect);
el("refresh").addEventListener("click", refreshBalances);
el("check").addEventListener("click", checkBalance);
el("switch").addEventListener("click", switchToSepolia);
el("estimate").addEventListener("click", estimate);
el("send").addEventListener("click", send);
