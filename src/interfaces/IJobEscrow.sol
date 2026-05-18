// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IJobEscrow
/// @notice Minimal surface that on-ramp contracts (CrossChainGateway,
///         X402Middleware, OneShotEnroll) need to open a job on behalf of
///         a caller. The full escrow surface (submitReceipt, claimTimeout,
///         views) lives directly on JobEscrow.
interface IJobEscrow {
    /// @notice Open a new job against `agentId` with `requestHash` as the
    ///         binding commitment to the off-chain request payload.
    /// @return jobId An opaque identifier used by the agent's signer when
    ///         producing the EIP-712 receipt.
    function openJob(uint256 agentId, bytes32 requestHash) external returns (bytes32 jobId);
}
