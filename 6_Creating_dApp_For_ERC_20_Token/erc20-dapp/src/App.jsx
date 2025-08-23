import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, formatUnits, isAddress, parseUnits } from "ethers";
import { ERC20_ABI } from "./abi";

const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS;
const CHAIN_ID_HEX = import.meta.env.VITE_CHAIN_ID_HEX || "0xaa36a7"; // Sepolia

export default function App() {
  const [hasMM, setHasMM] = useState(!!window.ethereum);
  const [addr, setAddr] = useState("");
  const [chainId, setChainId] = useState("");
  const [status, setStatus] = useState("Ready");
  const [name, setName] = useState("-");
  const [symbol, setSymbol] = useState("-");
  const [dec, setDec] = useState(18);
  const [total, setTotal] = useState("-");
  const [myBal, setMyBal] = useState("-");
  const [isOwner, setIsOwner] = useState(false);

  // forms
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");      // human units
  const [mintTo, setMintTo] = useState("");
  const [mintAmt, setMintAmt] = useState("");

  // refs so we can re-use provider/signer/contract
  const providerRef = useRef(null);
  const signerRef = useRef(null);
  const contractReadRef = useRef(null);
  const contractWriteRef = useRef(null);

  const short = (a) => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "";

  const ready = useMemo(() => hasMM && TOKEN_ADDRESS, [hasMM]);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAcc = () => window.location.reload();
    const onChain = () => window.location.reload();
    window.ethereum.on("accountsChanged", onAcc);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAcc);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, []);

  async function connect() {
    if (!ready) return alert("MetaMask not found or TOKEN_ADDRESS missing.");
    setStatus("Connecting…");
    const provider = new BrowserProvider(window.ethereum);
    providerRef.current = provider;
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    signerRef.current = signer;

    const net = await provider.getNetwork();
    setChainId(String(net.chainId));

    const address = await signer.getAddress();
    setAddr(address);

    const cRead = new Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
    const cWrite = new Contract(TOKEN_ADDRESS, ERC20_ABI, signer);
    contractReadRef.current = cRead;
    contractWriteRef.current = cWrite;

    await loadTokenBasics();
    await refreshBalances();
    await checkOwner(address);

    attachTransferListener();
    setStatus("Connected");
  }

  async function ensureSepolia() {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_ID_HEX }],
      });
    } catch (e) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: CHAIN_ID_HEX,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          }],
        });
      } else {
        console.error(e);
        alert(e.message);
      }
    }
  }

  async function loadTokenBasics() {
    const c = contractReadRef.current;
    const [nm, sym, d, ts] = await Promise.all([
      c.name(), c.symbol(), c.decimals(), c.totalSupply()
    ]);
    setName(nm);
    setSymbol(sym);
    setDec(Number(d));
    setTotal(formatUnits(ts, d));
  }

  async function refreshBalances() {
    if (!addr) return;
    const c = contractReadRef.current;
    const bal = await c.balanceOf(addr);
    setMyBal(formatUnits(bal, dec));
  }

  async function checkOwner(me) {
    const c = contractReadRef.current;
    if (!c.owner) return setIsOwner(false);
    try {
      const owner = await c.owner();
      setIsOwner(owner.toLowerCase() === me.toLowerCase());
    } catch {
      setIsOwner(false);
    }
  }

  function attachTransferListener() {
    const c = contractReadRef.current;
    if (!c) return;
    c.removeAllListeners?.("Transfer");
    c.on("Transfer", (from, to, value, ev) => {
      // if you sent/received or supply changed (mint/burn), refresh
      if (!addr) return;
      if (from.toLowerCase() === addr.toLowerCase() || to.toLowerCase() === addr.toLowerCase() || from === "0x0000000000000000000000000000000000000000") {
        refreshBalances();
        // update total if mint/burn
        loadTokenBasics();
      }
    });
  }

  async function doTransfer() {
    const c = contractWriteRef.current;
    if (!isAddress(to)) return alert("Invalid recipient address");
    if (!amount || Number.isNaN(Number(amount))) return alert("Invalid amount");
    setStatus("Sending…");
    try {
      const tx = await c.transfer(to.trim(), parseUnits(amount, dec));
      await tx.wait();
      setStatus(`Sent ✔ ${tx.hash}`);
      setAmount("");
      await refreshBalances();
    } catch (e) {
      console.error(e);
      setStatus(`Send error: ${e.message}`);
    }
  }

  async function doMint() {
    if (!isOwner) return alert("Only owner can mint.");
    const c = contractWriteRef.current;
    if (!isAddress(mintTo)) return alert("Invalid address to mint");
    if (!mintAmt || Number.isNaN(Number(mintAmt))) return alert("Invalid mint amount");
    setStatus("Minting…");
    try {
      const tx = await c.mint(mintTo.trim(), parseUnits(mintAmt, dec));
      await tx.wait();
      setStatus(`Minted ✔ ${tx.hash}`);
      setMintAmt("");
      await refreshBalances();
      await loadTokenBasics();
    } catch (e) {
      console.error(e);
      setStatus(`Mint error: ${e.message}`);
    }
  }

  async function addToMetaMask() {
    try {
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: TOKEN_ADDRESS,
            symbol,
            decimals: dec,
          },
        },
      });
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, Arial", maxWidth: 900, margin: "32px auto", lineHeight: 1.55 }}>
      <h1>ERC-20 dApp (Sepolia)</h1>
      <p>Token: <b>{name}</b> (<b>{symbol}</b>) — <code>{TOKEN_ADDRESS}</code></p>

      <section style={card}>
        <button onClick={connect} disabled={!hasMM} style={btn}>🔌 Connect MetaMask</button>
        <button onClick={ensureSepolia} style={btn}>Switch/Add Sepolia</button>
        <button onClick={refreshBalances} style={btn}>Refresh</button>
        <button onClick={addToMetaMask} style={btn}>➕ Add Token to MetaMask</button>
        <div style={{ marginTop: 12 }}>
          <div><b>Address:</b> {addr ? `${addr} (${short(addr)})` : "–"}</div>
          <div><b>Chain ID:</b> {chainId || "–"} (Sepolia = 11155111)</div>
          <div><b>My Balance:</b> {myBal !== "-" ? `${myBal} ${symbol}` : "–"}</div>
          <div><b>Total Supply:</b> {total !== "-" ? `${total} ${symbol}` : "–"}</div>
          <div><b>Owner:</b> {isOwner ? "You are the owner ✅" : "Not owner"}</div>
        </div>
      </section>

      <section style={card}>
        <h3>💸 Transfer</h3>
        <div style={row}><label>To</label><input style={inp} value={to} onChange={e=>setTo(e.target.value)} placeholder="0xRecipient" size="60" /></div>
        <div style={row}><label>Amount</label><input style={inp} value={amount} onChange={e=>setAmount(e.target.value)} placeholder="10" /></div>
        <button style={btn} onClick={doTransfer}>Send</button>
      </section>

      {isOwner && (
        <section style={card}>
          <h3>🏭 Owner Mint</h3>
          <div style={row}><label>Mint to</label><input style={inp} value={mintTo} onChange={e=>setMintTo(e.target.value)} placeholder="0xAddress" size="60" /></div>
          <div style={row}><label>Amount</label><input style={inp} value={mintAmt} onChange={e=>setMintAmt(e.target.value)} placeholder="1000" /></div>
          <button style={btn} onClick={doMint}>Mint</button>
        </section>
      )}

      <section style={card}>
        <h3>🪵 Status</h3>
        <pre style={{ background:"#f6f6f7", padding:12, borderRadius:12, overflowX:"auto" }}>{status}</pre>
      </section>
    </div>
  );
}

const card = { border:"1px solid #eee", borderRadius:12, padding:16, margin:"16px 0" };
const btn  = { padding:"10px 14px", borderRadius:10, border:"1px solid #ddd", cursor:"pointer", marginRight:8 };
const row  = { display:"flex", gap:10, alignItems:"center", margin:"8px 0" };
const inp  = { padding:"8px 10px", border:"1px solid #ddd", borderRadius:8, minWidth:240 };
