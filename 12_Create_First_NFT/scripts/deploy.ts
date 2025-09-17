import { ethers } from "hardhat";

async function main() {
  console.log("Deploying MyNFT contract...");
  
  const MyNFT = await ethers.getContractFactory("MyNFT");
  const myNFT = await MyNFT.deploy("MyNFT", "MNFT");
  
  await myNFT.deployed();
  const address = myNFT.address;
  
  console.log(`MyNFT deployed to: ${address}`);
  
  // Set the NFT_ADDRESS environment variable for the mint script
  process.env.NFT_ADDRESS = address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });