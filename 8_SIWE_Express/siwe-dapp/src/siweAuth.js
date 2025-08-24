import { SiweMessage } from 'siwe';

/** GET /nonce (sets siwe_nonce cookie) */
export async function fetchNonce(apiBase) {
  const r = await fetch(`${apiBase}/nonce`, {
    credentials: 'include',            // <<< important
  });
  if (!r.ok) throw new Error('Failed to get nonce');
  const { nonce } = await r.json();
  return nonce;
}

/** Build EIP-4361 message */
// Put this helper above your component (same file is fine)
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


/** POST /verify (sets siwe_session cookie) */
export async function verify(apiBase, message, signature) {
  const r = await fetch(`${apiBase}/verify`, {
    method: 'POST',
    credentials: 'include',            // <<< important
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, signature }),
  });
  return r.json();
}

/** GET /me (requires siwe_session cookie) */
export async function me(apiBase) {
  const r = await fetch(`${apiBase}/me`, {
    credentials: 'include',            // <<< important
  });
  return r.json();
}

/** POST /logout (clears cookie) */
export async function logout(apiBase) {
  const r = await fetch(`${apiBase}/logout`, {
    method: 'POST',
    credentials: 'include',            // <<< important
  });
  return r.json();
}
