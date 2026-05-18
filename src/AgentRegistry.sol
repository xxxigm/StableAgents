// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IAgentRegistry } from "./interfaces/IAgentRegistry.sol";

/// @title AgentRegistry
/// @notice On-chain catalog of accountable AI agents on Arc Testnet.
///
///         Each agent stakes USDC and commits to an SLA: a maximum response
///         time and a slash percentage. The JobEscrow contract (set once
///         by the admin via `setJobEscrow`) is the only address allowed
///         to mutate per-agent counters or pull from the stake.
///
/// @dev    Arc Testnet's USDC is a 6-decimal ERC-20 living at
///         0x3600000000000000000000000000000000000000. This contract talks
///         to it through the standard IERC20 interface only.
contract AgentRegistry is IAgentRegistry, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error AlreadyRegistered();
    error NotOwner();
    error BelowMinStake();
    error InvalidSlashBps();
    error InvalidResponseTime();
    error InvalidSigner();
    error AgentInactive();
    error StillActive();
    error JobsPending();
    error CooldownNotElapsed();
    error OnlyJobEscrow();
    error UnknownAgent();
    error InsufficientStake();
    error EscrowAlreadyWired();

    // ---------------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------------

    uint32 public constant MIN_RESPONSE_TIME = 5; // seconds
    uint32 public constant MAX_SLASH_BPS = 10_000;
    uint32 public constant UNSTAKE_COOLDOWN = 1 hours;

    // ---------------------------------------------------------------------
    // Types & storage
    // ---------------------------------------------------------------------

    struct Agent {
        address owner;
        address signer;
        uint256 stake;
        uint256 pricePerJob;
        uint32 maxResponseTime;
        uint32 slashBps;
        uint32 deactivatedAt; // 0 = active
        uint32 pendingJobs;
        uint32 completedJobs;
        uint32 slashedJobs;
        string endpoint;
        bool active;
    }

    IERC20 public immutable usdc;
    uint256 public immutable minStake;
    address public jobEscrow;
    address public admin;

    mapping(uint256 => Agent) internal _agents;
    mapping(address => uint256) public agentIdOf; // owner => id, 0 = none
    uint256 public nextAgentId = 1;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        address signer,
        uint256 stake,
        uint256 pricePerJob,
        uint32 maxResponseTime,
        uint32 slashBps,
        string endpoint
    );
    event AgentDeactivated(uint256 indexed agentId, uint32 deactivatedAt);
    event AgentUnstaked(uint256 indexed agentId, uint256 amount);
    event AgentSlashed(uint256 indexed agentId, uint256 amount, address recipient);
    event PriceUpdated(uint256 indexed agentId, uint256 newPrice);
    event SignerUpdated(uint256 indexed agentId, address newSigner);
    event JobEscrowSet(address indexed escrow);
    event ReputationUpdated(uint256 indexed agentId, uint32 completedJobs, uint32 slashedJobs);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyJobEscrow() {
        if (msg.sender != jobEscrow) revert OnlyJobEscrow();
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotOwner();
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(IERC20 _usdc, uint256 _minStake) {
        usdc = _usdc;
        minStake = _minStake;
        admin = msg.sender;
    }

    /// @notice One-shot wiring of the JobEscrow address. Admin sets this
    ///         immediately after deploying the escrow contract; the slot
    ///         then becomes effectively immutable, removing a rug-pull
    ///         vector where the admin could later install a malicious
    ///         escrow that drains every agent's stake.
    function setJobEscrow(address _escrow) external onlyAdmin {
        if (jobEscrow != address(0)) revert EscrowAlreadyWired();
        jobEscrow = _escrow;
        emit JobEscrowSet(_escrow);
    }

    // ---------------------------------------------------------------------
    // Agent lifecycle
    // ---------------------------------------------------------------------

    function register(
        address signer,
        uint256 stakeAmount,
        uint256 pricePerJob,
        uint32 maxResponseTime,
        uint32 slashBps,
        string calldata endpoint
    ) external nonReentrant returns (uint256 agentId) {
        if (agentIdOf[msg.sender] != 0) revert AlreadyRegistered();
        if (stakeAmount < minStake) revert BelowMinStake();
        if (slashBps > MAX_SLASH_BPS) revert InvalidSlashBps();
        if (maxResponseTime < MIN_RESPONSE_TIME) revert InvalidResponseTime();
        if (signer == address(0)) revert InvalidSigner();

        agentId = nextAgentId++;
        _agents[agentId] = Agent({
            owner: msg.sender,
            signer: signer,
            stake: stakeAmount,
            pricePerJob: pricePerJob,
            maxResponseTime: maxResponseTime,
            slashBps: slashBps,
            deactivatedAt: 0,
            pendingJobs: 0,
            completedJobs: 0,
            slashedJobs: 0,
            endpoint: endpoint,
            active: true
        });
        agentIdOf[msg.sender] = agentId;

        usdc.safeTransferFrom(msg.sender, address(this), stakeAmount);

        emit AgentRegistered(
            agentId, msg.sender, signer, stakeAmount, pricePerJob, maxResponseTime, slashBps, endpoint
        );
    }

    function deactivate(uint256 agentId) external {
        Agent storage a = _agents[agentId];
        if (a.owner != msg.sender) revert NotOwner();
        if (!a.active) revert AgentInactive();

        a.active = false;
        a.deactivatedAt = uint32(block.timestamp);

        emit AgentDeactivated(agentId, a.deactivatedAt);
    }

    function unstake(uint256 agentId) external nonReentrant {
        Agent storage a = _agents[agentId];
        if (a.owner != msg.sender) revert NotOwner();
        if (a.active) revert StillActive();
        if (a.pendingJobs != 0) revert JobsPending();
        if (block.timestamp < a.deactivatedAt + UNSTAKE_COOLDOWN) {
            revert CooldownNotElapsed();
        }

        uint256 amount = a.stake;
        a.stake = 0;

        usdc.safeTransfer(msg.sender, amount);
        emit AgentUnstaked(agentId, amount);
    }

    // ---------------------------------------------------------------------
    // JobEscrow hooks — stake movement and lifecycle accounting
    // ---------------------------------------------------------------------

    function slash(uint256 agentId, uint256 amount, address recipient)
        external
        onlyJobEscrow
        nonReentrant
    {
        Agent storage a = _agents[agentId];
        if (a.owner == address(0)) revert UnknownAgent();
        if (a.stake < amount) revert InsufficientStake();

        a.stake -= amount;
        usdc.safeTransfer(recipient, amount);

        emit AgentSlashed(agentId, amount, recipient);
    }

    function markJobOpened(uint256 agentId) external onlyJobEscrow {
        Agent storage a = _agents[agentId];
        if (a.owner == address(0)) revert UnknownAgent();
        unchecked {
            a.pendingJobs += 1;
        }
    }

    function markJobClosed(uint256 agentId) external onlyJobEscrow {
        Agent storage a = _agents[agentId];
        if (a.pendingJobs == 0) revert("no pending");
        unchecked {
            a.pendingJobs -= 1;
        }
    }

    function bumpCompleted(uint256 agentId) external onlyJobEscrow {
        Agent storage a = _agents[agentId];
        if (a.owner == address(0)) revert UnknownAgent();
        unchecked {
            a.completedJobs += 1;
        }
        emit ReputationUpdated(agentId, a.completedJobs, a.slashedJobs);
    }

    function bumpSlashed(uint256 agentId) external onlyJobEscrow {
        Agent storage a = _agents[agentId];
        if (a.owner == address(0)) revert UnknownAgent();
        unchecked {
            a.slashedJobs += 1;
        }
        emit ReputationUpdated(agentId, a.completedJobs, a.slashedJobs);
    }

    // ---------------------------------------------------------------------
    // Owner-configurable fields
    // ---------------------------------------------------------------------

    function updatePrice(uint256 agentId, uint256 newPrice) external {
        Agent storage a = _agents[agentId];
        if (a.owner != msg.sender) revert NotOwner();
        a.pricePerJob = newPrice;
        emit PriceUpdated(agentId, newPrice);
    }

    function updateSigner(uint256 agentId, address newSigner) external {
        if (newSigner == address(0)) revert InvalidSigner();
        Agent storage a = _agents[agentId];
        if (a.owner != msg.sender) revert NotOwner();
        a.signer = newSigner;
        emit SignerUpdated(agentId, newSigner);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getAgent(uint256 agentId) external view returns (AgentView memory) {
        Agent storage a = _agents[agentId];
        return AgentView({
            owner: a.owner,
            signer: a.signer,
            stake: a.stake,
            pricePerJob: a.pricePerJob,
            maxResponseTime: a.maxResponseTime,
            slashBps: a.slashBps,
            active: a.active
        });
    }

    function getEndpoint(uint256 agentId) external view returns (string memory) {
        return _agents[agentId].endpoint;
    }

    function pendingJobs(uint256 agentId) external view returns (uint32) {
        return _agents[agentId].pendingJobs;
    }

    function completedJobs(uint256 agentId) external view returns (uint32) {
        return _agents[agentId].completedJobs;
    }

    function slashedJobs(uint256 agentId) external view returns (uint32) {
        return _agents[agentId].slashedJobs;
    }

    // ---------------------------------------------------------------------
    // Reputation — Bayesian score on a 0-100 scale
    // ---------------------------------------------------------------------

    /// @notice Reputation score derived from a Beta-Binomial posterior mean
    ///         with prior `Beta(alpha = 2, beta = 1)`.
    ///
    ///         score = (completed + alpha) / (completed + slashed + alpha + beta) * 100
    ///
    /// @dev    Properties this formula gives us:
    ///         - A fresh agent (0/0) starts at 66, not 100. This prevents a
    ///           spam attack where someone registers, lands one lucky call,
    ///           looks "perfect", and steals trust from real long-running
    ///           providers.
    ///         - One slash is recoverable: a 0/1 agent is at 50, not 0.
    ///         - Evidence accumulates: 100/5 (94) beats 2/0 (80) because
    ///           the long-running provider has a larger sample size.
    ///
    ///         Returning a uint8 keeps the value cheap to read from other
    ///         contracts and trivial to render in a UI badge.
    function reputationScore(uint256 agentId) external view returns (uint8) {
        Agent storage a = _agents[agentId];
        if (a.owner == address(0)) return 0;
        uint256 alpha = 2;
        uint256 beta = 1;
        uint256 numerator = uint256(a.completedJobs) + alpha;
        uint256 denominator = uint256(a.completedJobs) + uint256(a.slashedJobs) + alpha + beta;
        return uint8((numerator * 100) / denominator);
    }
}
