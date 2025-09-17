// scripts/mint.ts
import "dotenv/config";               // <- ensures TOKEN_URI / NFT_ADDRESS exist in both IDE & terminal
import { ethers } from "hardhat";

async function main() {
  const tokenUri = process.env.TOKEN_URI;
  if (!tokenUri) {
    throw new Error("❌ Set TOKEN_URI in your .env file");
  }

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log("👤 Minting with account:", signerAddress);

  const nftAddress = process.env.NFT_ADDRESS;   // no '!' here
  if (!nftAddress) {
    throw new Error("❌ NFT_ADDRESS not set in .env");
  }

  const nft = await ethers.getContractAt("MyNFT", nftAddress, signer);
  console.log("🔗 Connected to contract at:", nftAddress);

  console.log("🚀 Sending mint tx...");
  const tx = await nft.mintTo(signerAddress, tokenUri); // Ethers v6: returns ContractTransactionResponse
  console.log("⏳ tx hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Minted NFT with URI:", tokenUri, " | block:", receipt?.blockNumber);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1; // friendlier in HH3 than process.exit(1)
});
