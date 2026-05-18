// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IJobEscrow } from "./interfaces/IJobEscrow.sol";

/// @title X402Middleware
/// @notice Bridges the x402 HTTP Payment Required protocol to the
///         StableAgents on-chain SLA.
///
/// @dev    The two protocols compose as follows:
///
///           x402         answers "how does the agent pay?" (HTTP 402,
///                        Circle Gateway / USDC payment rails)
///           StableAgents answers "what does the agent get in return?"
///                        (stake-backed SLA, slash on timeout)
///
///         x402 servers respond to an unpaid request with a `402 Payment
///         Required` JSON payload pointing `payTo` at this contract. The
///         calling agent then approves USDC for this contract and calls
///         `executePayment`, which both takes the payment and atomically
///         opens the on-chain job — the SLA timer starts in the same
///         transaction that the agent pays.
contract X402Middleware is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Immutables
    // ---------------------------------------------------------------------

    IERC20 public immutable usdc;
    IJobEscrow public immutable escrow;

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------

    /// @notice requestHash => jobId — lets the agent's backend look up
    ///         the on-chain jobId from the off-chain x402 request payload
    ///         without having to parse logs.
    mapping(bytes32 => bytes32) public jobIdByRequest;

    /// @notice jobId => original agent (caller) address
    mapping(bytes32 => address) public callerByJobId;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event X402JobOpened(
        bytes32 indexed jobId,
        uint256 indexed agentId,
        address indexed caller,
        bytes32 requestHash,
        uint256 amount
    );

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error DuplicateRequest(bytes32 requestHash);

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(IERC20 _usdc, IJobEscrow _escrow) Ownable(msg.sender) {
        usdc = _usdc;
        escrow = _escrow;
    }

    // ---------------------------------------------------------------------
    // Core: x402 payment → openJob
    // ---------------------------------------------------------------------

    /// @notice Called by the paying agent after it receives a 402 response.
    ///         Must be preceded by `usdc.approve(this, amount)`.
    ///
    /// @param agentId      StableAgents agent to call
    /// @param requestHash  keccak256 of the request payload (the same
    ///                     hash the agent put in the X-Payment header)
    /// @param amount       USDC paid; must match the agent's pricePerJob
    function executePayment(uint256 agentId, bytes32 requestHash, uint256 amount)
        external
        nonReentrant
        returns (bytes32 jobId)
    {
        // Idempotency: the same off-chain request payload cannot open two
        // simultaneous on-chain jobs. The x402 server will reuse the same
        // requestHash if the agent retries; we must short-circuit instead
        // of double-charging.
        if (jobIdByRequest[requestHash] != bytes32(0)) {
            revert DuplicateRequest(requestHash);
        }

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.forceApprove(address(escrow), amount);

        jobId = escrow.openJob(agentId, requestHash);

        jobIdByRequest[requestHash] = jobId;
        callerByJobId[jobId] = msg.sender;

        emit X402JobOpened(jobId, agentId, msg.sender, requestHash, amount);
    }

    // ---------------------------------------------------------------------
    // Views — for off-chain integrators
    // ---------------------------------------------------------------------

    function getJobId(bytes32 requestHash) external view returns (bytes32) {
        return jobIdByRequest[requestHash];
    }

    function getCaller(bytes32 jobId) external view returns (address) {
        return callerByJobId[jobId];
    }

    // ---------------------------------------------------------------------
    // Emergency recovery (owner only)
    // ---------------------------------------------------------------------

    function recoverTokens(IERC20 token, uint256 amount, address to) external onlyOwner {
        token.safeTransfer(to, amount);
    }
}
