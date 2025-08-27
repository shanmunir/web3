import TestToken from "../artifacts/contracts/TestToken.sol/TestToken.json" with { type: "json" };
import RewardToken from "../artifacts/contracts/RewardToken.sol/RewardToken.json" with { type: "json" };
import StakingRewards from "../artifacts/contracts/StakingRewards.sol/StakingRewards.json" with { type: "json" };

export const ABI_STK = TestToken.abi;
export const ABI_RWD = RewardToken.abi;
export const ABI_STAKING = StakingRewards.abi;
