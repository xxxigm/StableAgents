// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import { IAgentRegistry } from "./interfaces/IAgentRegistry.sol";
import { IJobEscrow } from "./interfaces/IJobEscrow.sol";

/// @title JobEscrow
/// @notice Holds the per-job USDC escrow for the StableAgents marketplace
///         and releases it to the agent only when a valid EIP-712 receipt
///         arrives before the SLA deadline.
///
/// @dev    Signing scheme: providers sign a structured `Receipt(callId,
///         responseHash)` under the `StableAgents v1` EIP-712 domain. The
///         signed payload binds the receipt to a specific job, a specific
///         response hash, and the current chainId — so a captured signature
///         cannot be replayed against a different job, a different
///         response, or a deployment of this contract on another chain.
contract JobEscrow is IJobEscrow, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // EIP-712 type hash for the Receipt struct
    // ---------------------------------------------------------------------

    /// @dev Type string must match EIP-712 canonical form exactly: no
    ///      whitespace, comma-separated fields, struct name + parens.
    bytes32 public constant RECEIPT_TYPEHASH = keccak256(
        "Receipt(bytes32 jobId,bytes32 responseHash)"
    );

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error AgentNotActive();
    error InvalidStatus();
    error DeadlineExceeded();
    error InvalidSignature();
    error JobIdCollision();

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    enum JobStatus {
        None,
        Pending,
        Completed,
        Slashed
    }

    struct Job {
        uint256 agentId;
        address caller;
        uint256 amount;
        uint32 openedAt;
        uint32 deadline;
        bytes32 requestHash;
        bytes32 responseHash;
        JobStatus status;
    }

    /// @notice EIP-712 typed struct that the agent's signer signs off-chain.
    struct Receipt {
        bytes32 jobId;
        bytes32 responseHash;
    }

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------

    IERC20 public immutable usdc;
    IAgentRegistry public immutable registry;

    mapping(bytes32 => Job) internal _jobs;
    uint256 public nonce; // global counter, bumped on every openJob

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event JobOpened(
        bytes32 indexed jobId,
        uint256 indexed agentId,
        address indexed caller,
        uint256 amount,
        bytes32 requestHash,
        uint32 deadline
    );
    event ReceiptAccepted(bytes32 indexed jobId, bytes32 responseHash);

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(IERC20 _usdc, IAgentRegistry _registry) EIP712("StableAgents", "1") {
        usdc = _usdc;
        registry = _registry;
    }

    // ---------------------------------------------------------------------
    // EIP-712 helpers — exposed so off-chain signers can build the same
    // digest the contract verifies, byte for byte
    // ---------------------------------------------------------------------

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function hashReceipt(Receipt memory receipt) public view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            RECEIPT_TYPEHASH,
            receipt.jobId,
            receipt.responseHash
        ));
        return _hashTypedDataV4(structHash);
    }

    // ---------------------------------------------------------------------
    // Open a job — caller funds escrow
    // ---------------------------------------------------------------------

    function openJob(uint256 agentId, bytes32 requestHash)
        external
        nonReentrant
        returns (bytes32 jobId)
    {
        IAgentRegistry.AgentView memory a = registry.getAgent(agentId);
        if (!a.active) revert AgentNotActive();

        uint256 currentNonce = nonce++;
        jobId = keccak256(
            abi.encodePacked(
                agentId,
                msg.sender,
                currentNonce,
                block.timestamp,
                requestHash,
                block.chainid
            )
        );
        if (_jobs[jobId].status != JobStatus.None) revert JobIdCollision();

        uint32 deadline = uint32(block.timestamp) + a.maxResponseTime;

        _jobs[jobId] = Job({
            agentId: agentId,
            caller: msg.sender,
            amount: a.pricePerJob,
            openedAt: uint32(block.timestamp),
            deadline: deadline,
            requestHash: requestHash,
            responseHash: bytes32(0),
            status: JobStatus.Pending
        });

        // Pull USDC into escrow BEFORE notifying the registry — if the
        // transfer reverts, the registry's pendingJobs counter does not
        // drift out of sync with the on-chain escrow state.
        usdc.safeTransferFrom(msg.sender, address(this), a.pricePerJob);
        registry.markJobOpened(agentId);

        emit JobOpened(jobId, agentId, msg.sender, a.pricePerJob, requestHash, deadline);
    }

    // ---------------------------------------------------------------------
    // Close a job — happy path (EIP-712 typed receipt)
    // ---------------------------------------------------------------------

    function submitReceipt(bytes32 jobId, bytes32 responseHash, bytes calldata signature)
        external
        nonReentrant
    {
        Job storage j = _jobs[jobId];
        if (j.status != JobStatus.Pending) revert InvalidStatus();
        if (block.timestamp > j.deadline) revert DeadlineExceeded();

        bytes32 digest = hashReceipt(Receipt({ jobId: jobId, responseHash: responseHash }));
        address signer = ECDSA.recover(digest, signature);

        IAgentRegistry.AgentView memory a = registry.getAgent(j.agentId);
        if (signer != a.signer) revert InvalidSignature();

        // Effects before interactions.
        j.responseHash = responseHash;
        j.status = JobStatus.Completed;

        registry.markJobClosed(j.agentId);
        registry.bumpCompleted(j.agentId);
        usdc.safeTransfer(a.owner, j.amount);

        emit ReceiptAccepted(jobId, responseHash);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getJob(bytes32 jobId) external view returns (Job memory) {
        return _jobs[jobId];
    }
}
