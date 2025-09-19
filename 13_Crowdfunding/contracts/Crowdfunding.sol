// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Crowdfunding with refunds and goal-based claiming
/// @notice Creators open campaigns; backers pledge; if goal meets by deadline, creator claims; otherwise backers refund.
contract Crowdfunding {
    struct Campaign {
        address creator;
        string title;
        string description;
        uint256 goal;        // in wei
        uint256 pledged;     // total pledged
        uint256 startAt;     // block timestamp
        uint256 endAt;       // deadline (>= startAt)
        bool claimed;        // whether creator has claimed
        bool canceled;       // creator may cancel before end
    }

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    // campaignId => (backer => amount)
    mapping(uint256 => mapping(address => uint256)) public pledgedAmount;

    event Launch(
        uint256 indexed id,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 startAt,
        uint256 endAt
    );
    event Cancel(uint256 indexed id);
    event Pledge(uint256 indexed id, address indexed backer, uint256 amount);
    event Unpledge(uint256 indexed id, address indexed backer, uint256 amount);
    event Claim(uint256 indexed id);
    event Refund(uint256 indexed id, address indexed backer, uint256 amount);

    error NotCreator();
    error AlreadyCanceled();
    error AlreadyClaimed();
    error NotStarted();
    error Ended();
    error NotEnded();
    error GoalNotReached();
    error NothingToRefund();

    modifier onlyCreator(uint256 _id) {
        if (msg.sender != campaigns[_id].creator) revert NotCreator();
        _;
    }

    function launch(
        string calldata _title,
        string calldata _description,
        uint256 _goal,
        uint256 _duration
    ) external returns (uint256 id) {
        require(_goal > 0, "goal=0");
        require(_duration > 0, "duration=0");

        id = ++campaignCount;
        uint256 start = block.timestamp;
        uint256 end = start + _duration;
        campaigns[id] = Campaign({
            creator: msg.sender,
            title: _title,
            description: _description,
            goal: _goal,
            pledged: 0,
            startAt: start,
            endAt: end,
            claimed: false,
            canceled: false
        });
        emit Launch(id, msg.sender, _title, _goal, start, end);
    }

    function cancel(uint256 _id) external onlyCreator(_id) {
        Campaign storage c = campaigns[_id];
        if (c.canceled) revert AlreadyCanceled();
        if (block.timestamp >= c.endAt) revert Ended();
        c.canceled = true;
        emit Cancel(_id);
    }

    function pledge(uint256 _id) external payable {
        Campaign storage c = campaigns[_id];
        if (c.canceled) revert AlreadyCanceled();
        if (block.timestamp < c.startAt) revert NotStarted();
        if (block.timestamp >= c.endAt) revert Ended();
        require(msg.value > 0, "no value");

        c.pledged += msg.value;
        pledgedAmount[_id][msg.sender] += msg.value;
        emit Pledge(_id, msg.sender, msg.value);
    }

    function unpledge(uint256 _id, uint256 _amount) external {
        Campaign storage c = campaigns[_id];
        if (c.canceled) revert AlreadyCanceled();
        if (block.timestamp >= c.endAt) revert Ended();
        uint256 bal = pledgedAmount[_id][msg.sender];
        require(_amount > 0 && _amount <= bal, "invalid amount");

        c.pledged -= _amount;
        pledgedAmount[_id][msg.sender] = bal - _amount;
        (bool ok, ) = msg.sender.call{value: _amount}("");
        require(ok, "transfer failed");
        emit Unpledge(_id, msg.sender, _amount);
    }

    function claim(uint256 _id) external onlyCreator(_id) {
        Campaign storage c = campaigns[_id];
        if (c.canceled) revert AlreadyCanceled();
        if (block.timestamp < c.endAt) revert NotEnded();
        if (c.claimed) revert AlreadyClaimed();
        if (c.pledged < c.goal) revert GoalNotReached();

        c.claimed = true;
        (bool ok, ) = c.creator.call{value: c.pledged}("");
        require(ok, "transfer failed");
        emit Claim(_id);
    }

    function refund(uint256 _id) external {
        Campaign storage c = campaigns[_id];
        if (c.canceled) revert AlreadyCanceled();
        if (block.timestamp < c.endAt) revert NotEnded();
        if (c.pledged >= c.goal) revert GoalNotReached();

        uint256 bal = pledgedAmount[_id][msg.sender];
        if (bal == 0) revert NothingToRefund();
        pledgedAmount[_id][msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "transfer failed");
        emit Refund(_id, msg.sender, bal);
    }
}
