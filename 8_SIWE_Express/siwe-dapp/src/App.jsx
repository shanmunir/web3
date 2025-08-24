import { useState } from 'react';
import { BrowserProvider } from 'ethers';

const CHAIN_ID_HEX = import.meta.env.VITE_CHAIN_ID_HEX || '0xaa36a7';
const AUTH_API     = import.meta.env.VITE_AUTH_API || 'http://localhost:8787';

// --- tiny helpers (inline so you can paste this file alone) ---
async function fetchNonce(apiBase) {
  const r = await fetch(`${apiBase}/nonce`, { credentials: 'include' });
  if (!r.ok) throw new Error('Failed to get nonce');
  const { nonce } = await r.json();
  return nonce;
}
function buildSiweMessageString({ domain, address, statement, uri, chainId, nonce, issuedAt }) {
  // EIP-4361 canonical format
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    `${address}`,
    ``,
    `${statement}`,
    ``,
    `URI: ${uri}`,
    `Version: 1`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}
async function verify(apiBase, message, signature) {
  const r = await fetch(`${apiBase}/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, signature }),
  });
  const j = await r.json();
  return { ok: r.ok && j.ok, body: j };
}
async function me(apiBase) {
  const r = await fetch(`${apiBase}/me`, { credentials: 'include' });
  return r.json();
}
// ---------------------------------------------------------------

export default function App() {
  const [addr, setAddr] = useState('');
  const [chainId, setChainId] = useState('');
  const [status, setStatus] = useState('Ready.');
  const [sessionAddr, setSessionAddr] = useState('');

// Replace your signIn() with this version
async function signIn() {
  try {
    if (!window.ethereum) return alert('Install MetaMask');

    // 1) connect
    const provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer  = await provider.getSigner();
    const address = await signer.getAddress();
    const net     = await provider.getNetwork();
    const chain   = Number(net.chainId);

    setAddr(address);
    setChainId(String(chain));

    // 2) get nonce (sets siwe_nonce cookie)
    const nonceResp = await fetch(`${AUTH_API}/nonce`, { credentials: 'include' });
    if (!nonceResp.ok) throw new Error('Failed to get nonce');
    const { nonce } = await nonceResp.json();

    // 3) build message STRING (no siwe package needed)
    const domain   = window.location.hostname;      // e.g., 'localhost'
    const uri      = window.location.origin;        // e.g., 'http://localhost:5173'
    const issuedAt = new Date().toISOString();
    const message  = buildSiweMessageString({
      domain,
      address,
      statement: 'Sign in to the dApp',
      uri,
      chainId: chain,
      nonce,
      issuedAt,
    });

    // 4) sign the plain string with personal_sign
    let signature;
    try {
      signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],            // data, from
      });
    } catch (e1) {
      // some wallets require reversed param order
      signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [address, message],            // from, data
      });
    }

    // 5) verify on server (send STRING + signature)
    const verifyResp = await fetch(`${AUTH_API}/verify`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, signature }),
    });
    const ver = await verifyResp.json();
    if (!ver.ok) throw new Error(ver.error || 'Verify failed');

    // 6) read session
    const meResp = await fetch(`${AUTH_API}/me`, { credentials: 'include' });
    const meJson = await meResp.json();
    if (meJson.ok) {
      setSessionAddr(meJson.address);
      setStatus(`Signed in ✔ Session address: ${meJson.address}`);
    } else {
      setSessionAddr('');
      setStatus('Signed in, but no active session detected');
    }
  } catch (e) {
    console.error('SIWE sign-in error:', e);
    setStatus(`Sign-in error: ${e.message}`);
  }
}


  async function checkSession() {
    const r = await me(AUTH_API);
    setStatus(r.ok ? `Session: ${r.address}` : 'No active session');
    setSessionAddr(r.ok ? r.address : '');
  }

  async function callProtected() {
    const r = await fetch(`${AUTH_API}/secret`, { credentials: 'include' });
    const j = await r.json();
    setStatus(j.ok ? j.msg : (j.error || 'Error'));
  }

  async function doLogout() {
    await fetch(`${AUTH_API}/logout`, { method: 'POST', credentials: 'include' });
    setSessionAddr('');
    setStatus('Logged out');
  }

  async function ensureSepolia() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_ID_HEX }],
      });
    } catch (e) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: CHAIN_ID_HEX,
            chainName: 'Sepolia',
            nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        });
      } else {
        alert(e.message);
      }
    }
  }

  return (
    <div style={page}>
      <h1>SIWE Auth Demo</h1>
      <div style={row}>
        <button style={btn} onClick={signIn}>🔐 Sign-In with Ethereum</button>
        <button style={btn} onClick={ensureSepolia}>Switch/Add Sepolia</button>
        <button style={btn} onClick={checkSession}>Check Session</button>
        <button style={btn} onClick={callProtected}>Call Protected API</button>
        <button style={btn} onClick={doLogout}>Logout</button>
      </div>

      <section style={card}>
        <div><b>Wallet:</b> {addr || '–'}</div>
        <div><b>Chain ID:</b> {chainId || '–'} (Sepolia=11155111)</div>
        <div><b>Session Address:</b> {sessionAddr || '–'}</div>
      </section>

      <section style={card}>
        <h3>Status</h3>
        <pre style={log}>{status}</pre>
      </section>
    </div>
  );
}

const page = { fontFamily:'system-ui, Arial', maxWidth:900, margin:'32px auto', lineHeight:1.55 };
const row  = { display:'flex', gap:10, flexWrap:'wrap', margin:'10px 0' };
const btn  = { padding:'10px 14px', border:'1px solid #ddd', borderRadius:10, cursor:'pointer' };
const card = { border:'1px solid #eee', borderRadius:12, padding:16, margin:'16px 0' };
const log  = { background:'#f6f6f8', padding:12, borderRadius:12, overflowX:'auto' };
