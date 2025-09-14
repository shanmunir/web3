import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(__dirname, "../../.data");
const ADDR_FILE = resolve(DATA_DIR, "addresses.json");
const PROP_FILE = resolve(DATA_DIR, "proposals.json");

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);
}

export type Addresses = {
  token: `0x${string}`;
  timelock: `0x${string}`;
  governor: `0x${string}`;
  box: `0x${string}`;
};

export function saveAddresses(addrs: Addresses) {
  ensureDir();
  writeFileSync(ADDR_FILE, JSON.stringify(addrs, null, 2));
  console.log(`Saved addresses → ${ADDR_FILE}`);
}

export function loadAddresses(): Addresses {
  const raw = readFileSync(ADDR_FILE, "utf8");
  return JSON.parse(raw);
}

export function saveProposal(network: string, proposalId: string) {
  ensureDir();
  let json: Record<string, string[]> = {};
  if (existsSync(PROP_FILE)) json = JSON.parse(readFileSync(PROP_FILE, "utf8"));
  if (!json[network]) json[network] = [];
  if (!json[network].includes(proposalId)) json[network].push(proposalId);
  writeFileSync(PROP_FILE, JSON.stringify(json, null, 2));
  console.log(`Saved proposal ${proposalId} → ${PROP_FILE} [${network}]`);
}

export function loadLatestProposal(network: string): string | undefined {
  if (!existsSync(PROP_FILE)) return undefined;
  const json: Record<string, string[]> = JSON.parse(readFileSync(PROP_FILE, "utf8"));
  const arr = json[network] || [];
  return arr[arr.length - 1];
}
