import { expect } from "chai";
import hardhat from "hardhat";

describe("MyNFT", () => {
  it("mints and exposes tokenURI", async () => {
  const [owner, alice] = await hardhat.ethers.getSigners();
  const MyNFT = await hardhat.ethers.getContractFactory("MyNFT");
  const my = await MyNFT.deploy("TestNFT", "TNFT");
  await my.waitForDeployment();

  const uri = "ipfs://bafyFakeCid";
  const tx = await my.connect(owner).mintTo(alice.address, uri);
  await tx.wait();

  // token id should be 1 on first mint
  expect(await my.tokenURI(1)).to.equal(uri);
  expect(await my.ownerOf(1)).to.equal(alice.address);
  });
});
