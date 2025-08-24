import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { generateNonce, SiweMessage } from 'siwe';
import crypto from 'crypto';

const app = express();
const PORT = Number(process.env.PORT || 8787);
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || 'false') === 'true';
const STRICT_DOMAIN = String(process.env.STRICT_DOMAIN || 'false') === 'true';

app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const sessions = new Map();
const setCookie = (res, name, value, maxAgeSec) => {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: 'lax',     // works for localhost http
    secure: COOKIE_SECURE, // false locally, true behind HTTPS
    maxAge: maxAgeSec * 1000,
    path: '/',
  });
};

// Health
app.get('/ping', (req, res) => res.json({ ok: true }));

app.get('/nonce', (req, res) => {
  const nonce = generateNonce();
  setCookie(res, 'siwe_nonce', nonce, 300);
  res.json({ nonce });
});

app.post('/verify', async (req, res) => {
  try {
    const { message, signature } = req.body || {};
    if (!message || !signature) return res.status(400).json({ ok: false, error: 'Missing message/signature' });

    const nonceCookie = req.cookies.siwe_nonce;
    if (!nonceCookie) return res.status(400).json({ ok: false, error: 'Missing nonce cookie' });

    const msg = new SiweMessage(message);
    const { data } = await msg.verify({ signature, nonce: nonceCookie });

    const expectedDomain = (req.headers.host || '').split(':')[0]; // 'localhost'
    if (STRICT_DOMAIN && data.domain !== expectedDomain) {
      return res.status(400).json({ ok: false, error: `Invalid domain: got ${data.domain} expected ${expectedDomain}` });
    }

    const sessionId = crypto.randomBytes(32).toString('hex');
    sessions.set(sessionId, { address: data.address.toLowerCase(), issuedAt: Date.now() });

    setCookie(res, 'siwe_nonce', '', 0); // clear
    setCookie(res, 'siwe_session', sessionId, Number(process.env.SESSION_TTL_SECONDS || 86400));

    res.json({ ok: true, address: data.address });
  } catch (e) {
    console.error('/verify error', e);
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.get('/me', (req, res) => {
  const sid = req.cookies.siwe_session;
  const sess = sid && sessions.get(sid);
  if (!sess) return res.status(401).json({ ok: false, error: 'Not signed in' });
  res.json({ ok: true, address: sess.address });
});

app.get('/secret', (req, res) => {
  const sid = req.cookies.siwe_session;
  const sess = sid && sessions.get(sid);
  if (!sess) return res.status(401).json({ ok: false, error: 'Not signed in' });
  res.json({ ok: true, msg: `Hello ${sess.address}, here is your protected data.` });
});

app.post('/logout', (req, res) => {
  const sid = req.cookies.siwe_session;
  if (sid) sessions.delete(sid);
  setCookie(res, 'siwe_session', '', 0);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`SIWE auth server listening on http://localhost:${PORT}`);
});
