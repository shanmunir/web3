// test/crowdfunding.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";

// version-agnostic parseEther + deployed helpers
const parseEth = (n: number | string = 1) =>
  // @ts-ignore
  (ethers as any).parseEther
    // @ts-ignore
    ? (ethers as any).parseEther(n.toString())
    // @ts-ignore
    : (ethers as any).utils.parseEther(n.toString());

const waitDeployed = async (contract: any) => {
  if (typeof contract.waitForDeployment === "function") {
    await contract.waitForDeployment(); // ethers v6
  } else if (typeof contract.deployed === "function") {
    await contract.deployed();          // ethers v5
  }
};

describe("Crowdfunding", function () {
  it("should launch, pledge, and claim/refund correctly", async () => {
    const [, alice] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Crowdfunding");
    const cf = await Factory.deploy();
    await waitDeployed(cf);

    // Launch (goal 2 ETH, duration 3s)
    await cf.launch("Title", "Desc", parseEth(2), 3);
    const id = await cf.campaignCount();

    // Pledge 1 ETH
    await cf.connect(alice).pledge(id, { value: parseEth(1) });
    let c = await cf.campaigns(id);
    expect(c.pledged).to.equal(parseEth(1));

    // Fast-forward past deadline
    await ethers.provider.send("evm_increaseTime", [5]);
    await ethers.provider.send("evm_mine", []);

    // Refund (goal not met)
    await expect(cf.connect(alice).refund(id))
      .to.emit(cf, "Refund")
      .withArgs(id, alice.address, parseEth(1));
  });
});
