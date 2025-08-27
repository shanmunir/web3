// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


contract StakingRewards is ReentrancyGuard {
    IERC20 public stakingToken;
    IERC20 public rewardsToken;

    uint256 public rewardRate;        // rewards per second
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public balances;
    uint256 public totalSupply;

    constructor(address _stakingToken, address _rewardsToken) {
        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) return rewardPerTokenStored;
        uint256 timeDelta = block.timestamp - lastUpdateTime;
        // scale by 1e18
        return rewardPerTokenStored + (timeDelta * rewardRate * 1e18) / totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        uint256 calc = (balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18;
        return rewards[account] + calc;
    }

    // Owner pre-funds rewards to this contract & sets rate (e.g., tokens per second)
    function notifyRewardRate(uint256 _rewardRate) external updateReward(address(0)) {
        // In production: onlyOwner + sanity checks
        rewardRate = _rewardRate;
    }

    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Amount=0");
        totalSupply += amount;
        balances[msg.sender] += amount;
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "transferFrom failed");
    }

    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Amount=0");
        totalSupply -= amount;
        balances[msg.sender] -= amount;
        require(stakingToken.transfer(msg.sender, amount), "transfer failed");
    }

    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            require(rewardsToken.transfer(msg.sender, reward), "reward transfer failed");
        }
    }

    function exit() external {
        withdraw(balances[msg.sender]);
        getReward();
    }
}
