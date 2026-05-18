// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/// @dev Slice of the ERC-8004 IdentityRegistry on Arc Testnet — we only
///      need register() and transferFrom() to move the freshly minted
///      token from this contract to the end user.
interface IIdentityRegistry {
    function register(string memory agentURI) external returns (uint256 tokenId);
    function transferFrom(address from, address to, uint256 tokenId) external;
}

/// @dev Slice of the AgentRegistry needed to perform the Tier-2 register.
interface IAgentRegistryEnroll {
    function registerWithIdentity(
        uint256 identityTokenId,
        address signer,
        uint256 stakeAmount,
        uint256 pricePerJob,
        uint32 maxResponseTime,
        uint32 slashBps,
        string calldata endpoint
    ) external returns (uint256 agentId);
}

/// @title OneShotEnroll
/// @notice UX helper that mints a fresh ERC-8004 identity token and
///         immediately enrolls the caller as a StableAgents agent — both
///         in a single transaction so the user signs once instead of
///         twice and never has to wait for a mint to confirm before
///         registering.
///
/// @dev    IdentityRegistry.register() uses `_safeMint`, which requires
///         the recipient contract to implement IERC721Receiver. This
///         contract implements the receiver, accepts the mint, runs the
///         agent registration (which checks ownerOf(tokenId) == msg.sender,
///         and msg.sender == this contract during the registry callback),
///         and finally transfers the token to the human caller.
contract OneShotEnroll is ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Canonical Arc Testnet addresses (see docs.arc.io for full list)
    // ---------------------------------------------------------------------

    address public constant IDENTITY_REGISTRY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
    IERC20 public constant USDC = IERC20(0x3600000000000000000000000000000000000000);

    /// @notice AgentRegistry deployment that this helper enrolls into.
    ///         Configured at deploy time so the helper is portable across
    ///         re-deploys without recompilation.
    IAgentRegistryEnroll public immutable agentRegistry;

    // ---------------------------------------------------------------------
    // Events / errors
    // ---------------------------------------------------------------------

    event Enrolled(
        address indexed user,
        uint256 indexed tokenId,
        uint256 indexed agentId,
        uint256 stakeAmount
    );

    error ZeroStake();
    error ZeroSigner();
    error EmptyEndpoint();

    constructor(IAgentRegistryEnroll _agentRegistry) {
        agentRegistry = _agentRegistry;
    }

    /// @inheritdoc IERC721Receiver
    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }

    /// @notice Mint a fresh ERC-8004 identity, stake, and enroll as an
    ///         agent — all in a single transaction.
    /// @dev    The caller must have already approved USDC for this contract
    ///         in an amount >= `stakeAmount`.
    function enroll(
        uint256 stakeAmount,
        uint256 pricePerJob,
        uint32 maxResponseTime,
        uint32 slashBps,
        address signer,
        string calldata endpoint
    ) external nonReentrant returns (uint256 tokenId, uint256 agentId) {
        if (stakeAmount == 0) revert ZeroStake();
        if (signer == address(0)) revert ZeroSigner();
        if (bytes(endpoint).length == 0) revert EmptyEndpoint();

        // 1. Mint ERC-8004 identity to this contract (so registerWithIdentity
        //    sees ownerOf(tokenId) == msg.sender — both are address(this)).
        tokenId = IIdentityRegistry(IDENTITY_REGISTRY).register(endpoint);

        // 2. Pull stake from user into this contract.
        USDC.safeTransferFrom(msg.sender, address(this), stakeAmount);

        // 3. Approve AgentRegistry to pull stake from this contract.
        USDC.forceApprove(address(agentRegistry), stakeAmount);

        // 4. Enroll as a Tier-2 agent.
        agentId = agentRegistry.registerWithIdentity(
            tokenId,
            signer,
            stakeAmount,
            pricePerJob,
            maxResponseTime,
            slashBps,
            endpoint
        );

        // 5. Hand the freshly minted identity token to the user so they
        //    own their identity outside of this helper contract.
        IIdentityRegistry(IDENTITY_REGISTRY).transferFrom(address(this), msg.sender, tokenId);

        emit Enrolled(msg.sender, tokenId, agentId, stakeAmount);
    }
}
