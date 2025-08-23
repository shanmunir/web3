import { useEffect, useRef, useState } from "react";
import { BrowserProvider, Contract, formatUnits, parseUnits, isAddress } from "ethers";
import { ERC20_ABI, STORAGE_ABI } from "./abi";

const CHAIN_ID_HEX = import.meta.env.VITE_CHAIN_ID_HEX || "0xaa36a7";
const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS;
const STORAGE_ADDRESS = import.meta.env.VITE_STORAGE_ADDRESS;

export default function App() {
  const [hasMM, setHasMM] = useState(!!window.ethereum);
  const [addr, setAddr] = useState("");
  const [chainId, setChainId] = useState("");

  // Token state
  const [tName, setTName] = useState("-");
  const [tSym, setTSym] = useState("-");
  const [tDec, setTDec] = useState(18);
  const [tSupply, setTSupply] = useState("-");
  const [myTokenBal, setMyTokenBal] = useState("-");
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("");

  // Storage state
  const [stored, setStored] = useState("-");
  const [newVal, setNewVal] = useState("");

  const [status, setStatus] = useState("Ready.");

  // refs
  const providerRef = useRef(null);
  const signerRef = useRef(null);
  const tokenR = useRef(null); // read
  const tokenW = useRef(null); // write
  const storR  = useRef(null);
  const storW  = useRef(null);

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
    if (!hasMM) return alert("Install MetaMask");
    if (!TOKEN_ADDRESS || !STORAGE_ADDRESS) return alert("Set TOKEN/STORAGE addresses in .env");

    const provider = new BrowserProvider(window.ethereum);
    providerRef.current = provider;
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    signerRef.current = signer;

    const net = await provider.getNetwork();
    setChainId(String(net.chainId));
    const me = await signer.getAddress();
    setAddr(me);

    tokenR.current = new Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
    tokenW.current = new Contract(TOKEN_ADDRESS, ERC20_ABI, signer);
    storR.current  = new Contract(STORAGE_ADDRESS, STORAGE_ABI, provider);
    storW.current  = new Contract(STORAGE_ADDRESS, STORAGE_ABI, signer);

    await loadTokenBasics();
    await refreshTokenBalance();
    await loadStored();

    attachEventListeners();
    setStatus("Connected.");
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
            nativeCurrency: { name:"Sepolia ETH", symbol:"ETH", decimals:18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          }],
        });
      } else {
        alert(e.message);
      }
    }
  }

  async function loadTokenBasics() {
    const t = tokenR.current;
    const [nm, sym, dec, sup] = await Promise.all([
      t.name(), t.symbol(), t.decimals(), t.totalSupply()
    ]);
    setTName(nm); setTSym(sym); setTDec(Number(dec)); setTSupply(formatUnits(sup, dec));
  }

  async function refreshTokenBalance() {
    if (!addr) return;
    const t = tokenR.current;
    const bal = await t.balanceOf(addr);
    setMyTokenBal(formatUnits(bal, tDec));
  }

  async function loadStored() {
    const s = storR.current;
    const v = await s.get();
    setStored(v.toString());
  }

  async function doTransfer() {
    if (!isAddress(to)) return alert("Invalid recipient");
    if (!amt || Number.isNaN(Number(amt))) return alert("Invalid amount");
    setStatus("Sending tokens…");
    try {
      const tx = await tokenW.current.transfer(to.trim(), parseUnits(amt, tDec));
      await tx.wait();
      setStatus("Transfer confirmed.");
      setAmt("");
      await refreshTokenBalance();
    } catch (e) {
      setStatus(`Transfer error: ${e.message}`);
    }
  }

  async function setStorage() {
    if (!newVal || Number.isNaN(Number(newVal))) return alert("Enter a number");
    setStatus("Setting value…");
    try {
      const tx = await storW.current.set(BigInt(newVal));
      await tx.wait();
      setStatus("Storage updated.");
      setNewVal("");
      await loadStored();
    } catch (e) {
      setStatus(`Set error: ${e.message}`);
    }
  }

  function attachEventListeners() {
    tokenR.current.removeAllListeners?.("Transfer");
    tokenR.current.on("Transfer", (from, to, value) => {
      // update if wallet involved or mint/burn
      if (!addr) return;
      const zero = "0x0000000000000000000000000000000000000000";
      if (from.toLowerCase() === addr.toLowerCase() ||
          to.toLowerCase() === addr.toLowerCase() ||
          from === zero) {
        refreshTokenBalance();
        loadTokenBasics();
      }
    });

    storR.current.removeAllListeners?.("ValueChanged");
    storR.current.on("ValueChanged", (_setter, newValue) => {
      setStored(newValue.toString());
    });
  }

  return (
    <div style={page}>
      <h1>Multi-Contract dApp (Sepolia)</h1>
      <p>Chain ID: {chainId || "–"} (Sepolia = 11155111)</p>

      <div style={row}>
        <button style={btn} onClick={connect} disabled={!hasMM}>🔌 Connect</button>
        <button style={btn} onClick={ensureSepolia}>Switch/Add Sepolia</button>
        <button style={btn} onClick={() => { loadTokenBasics(); refreshTokenBalance(); loadStored(); }}>Refresh</button>
      </div>

      <section style={card}>
        <h2>Wallet</h2>
        <div><b>Address:</b> {addr || "–"}</div>
      </section>

      <section style={card}>
        <h2>ERC-20 Token</h2>
        <div><b>Address:</b> <code>{TOKEN_ADDRESS}</code></div>
        <div><b>Name/Symbol:</b> {tName} ({tSym})</div>
        <div><b>Decimals:</b> {tDec}</div>
        <div><b>Total Supply:</b> {tSupply} {tSym}</div>
        <div><b>My Balance:</b> {myTokenBal !== "-" ? `${myTokenBal} ${tSym}` : "–"}</div>

        <h3>Transfer</h3>
        <div style={row}>
          <input style={inp} placeholder="0xRecipient" value={to} onChange={e=>setTo(e.target.value)} size="50" />
          <input style={inp} placeholder="Amount (e.g., 10)" value={amt} onChange={e=>setAmt(e.target.value)} />
          <button style={btn} onClick={doTransfer}>Send</button>
        </div>
      </section>

      <section style={card}>
        <h2>SimpleStorage</h2>
        <div><b>Address:</b> <code>{STORAGE_ADDRESS}</code></div>
        <div><b>Current Value:</b> {stored}</div>

        <h3>Update Value</h3>
        <div style={row}>
          <input style={inp} placeholder="New number" value={newVal} onChange={e=>setNewVal(e.target.value)} />
          <button style={btn} onClick={setStorage}>Set</button>
        </div>
      </section>

      <section style={card}>
        <h3>Status / Logs</h3>
        <pre style={log}>{status}</pre>
      </section>
    </div>
  );
}

const page = { fontFamily:"system-ui, Arial", maxWidth:980, margin:"28px auto", lineHeight:1.55 };
const card = { border:"1px solid #eee", borderRadius:12, padding:16, margin:"16px 0" };
const row  = { display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", margin:"10px 0" };
const btn  = { padding:"10px 14px", borderRadius:10, border:"1px solid #ddd", cursor:"pointer" };
const inp  = { padding:"8px 10px", border:"1px solid #ddd", borderRadius:8, minWidth:240 };
const log  = { background:"#f6f7f8", padding:12, borderRadius:12, overflowX:"auto" };
