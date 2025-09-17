// scripts/pinata-upload.ts
import "dotenv/config";
import fs from "fs";
import path from "path";
import pinataSDK from "@pinata/sdk";

async function main() {
  const [fileArg, nameArg, descArg] = process.argv.slice(2);
  if (!fileArg || !nameArg) {
    console.error("Usage: npx tsx scripts/pinata-upload.ts <filePath> <name> [description]");
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);
  const name = nameArg;
  const description = descArg ?? "";

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Prefer JWT if present, else fall back to API key/secret
  const jwt = process.env.PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;

  const pinata = jwt
    ? new (pinataSDK as any)({ pinataJWTKey: jwt })
    : pinataSDK(apiKey!, apiSecret!);

  // 1) Upload the asset (image/file)
  const stream = fs.createReadStream(filePath);
  const filePinRes = await pinata.pinFileToIPFS(stream, {
    pinataMetadata: {
      name: path.basename(filePath),
      keyvalues: { uploadedBy: "hardhat-script" },
    },
  });

  const imageCid = filePinRes.IpfsHash; // CID (e.g., Qm... / bafy...)
  const imageUrl = `ipfs://${imageCid}`;

  // 2) Upload NFT metadata JSON
  const metadata = {
    name,
    description,
    image: imageUrl,
  };

  const jsonPinRes = await pinata.pinJSONToIPFS(metadata, {
    pinataMetadata: { name: `${name}.metadata.json` },
  });

  const metadataCid = jsonPinRes.IpfsHash;
  const metadataUrl = `ipfs://${metadataCid}`;

  console.log("✅ Upload complete!");
  console.log("Image CID:    ", imageCid);
  console.log("Image Gateway:", `https://gateway.pinata.cloud/ipfs/${imageCid}`);
  console.log("Metadata CID: ", metadataCid);
  console.log("Token URI:    ", metadataUrl);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
