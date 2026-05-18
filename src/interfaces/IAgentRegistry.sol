// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentRegistry
/// @notice Surface that the JobEscrow contract consumes from the registry.
///         Kept narrow on purpose so JobEscrow does not need the full
///         AgentRegistry storage layout at compile time and can be paired
///         with an alternative registry in the future (e.g. an upgradable
///         proxy or a mock used in invariant tests).
interface IAgentRegistry {
    /// @notice Public-facing view of an agent. Returned by `getAgent`.
    /// @dev Mirrors the on-chain Agent struct but drops fields that only
    ///      matter for internal accounting (pendingJobs, deactivatedAt, etc).
    struct AgentView {
        address owner;
        address signer;
        uint256 stake;
        uint256 pricePerJob;
        uint32 maxResponseTime;
        uint32 slashBps;
        bool active;
    }

    // --- Reads -----------------------------------------------------------

    function getAgent(uint256 agentId) external view returns (AgentView memory);

    // --- Mutations callable by JobEscrow only ---------------------------

    function slash(uint256 agentId, uint256 amount, address recipient) external;

    function markJobOpened(uint256 agentId) external;

    function markJobClosed(uint256 agentId) external;

    function bumpCompleted(uint256 agentId) external;

    function bumpSlashed(uint256 agentId) external;
}
