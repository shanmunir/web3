const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const TestToken = await ethers.getContractFactory("TestToken");
  const stakeToken = await TestToken.deploy("Stake Token", "STK");
  await stakeToken.waitForDeployment();
  const STK = await stakeToken.getAddress();
  console.log("StakeToken:", STK);

  const RewardToken = await ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy();
  await rewardToken.waitForDeployment();
  const RWD = await rewardToken.getAddress();
  console.log("RewardToken:", RWD);

  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  const staking = await StakingRewards.deploy(STK, RWD);
  await staking.waitForDeployment();
  const STAKING = await staking.getAddress();
  console.log("StakingRewards:", STAKING);

  // seed tokens
  const mintAmt = ethers.parseUnits("1000000", 18);
  await (await stakeToken.mint(deployer.address, mintAmt)).wait();
  await (await rewardToken.mint(STAKING, mintAmt)).wait();
  console.log("Seeded: STK to deployer, RWD to staking");

  // start at 0.05 RWD/sec
  await (await staking.notifyRewardRate(ethers.parseUnits("0.05", 18))).wait();
  console.log("Reward rate set");

  console.log("DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
