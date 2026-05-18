// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IJobEscrow } from "./interfaces/IJobEscrow.sol";

/// @title CrossChainGateway
/// @notice Receives USDC minted on Arc by Circle's CCTP V2 and atomically
///         opens a job in JobEscrow on behalf of the original payer on
///         the source chain.
///
/// @dev    Trust model: only Circle's canonical MessageTransmitterV2 on
///         Arc Testnet is allowed to invoke `handleReceiveFinalizedTransfer`.
///         The transmitter is hardcoded to keep the deployment
///         self-contained and to remove "the admin can rotate the source"
///         as an attack surface.
contract CrossChainGateway is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Circle CCTP V2 MessageTransmitterV2 on Arc Testnet.
    ///         https://docs.arc.io/arc/references/contract-addresses
    address public constant MESSAGE_TRANSMITTER = 0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275;

    IERC20 public immutable usdc;
    IJobEscrow public immutable escrow;

    event CrossChainJobOpened(
        bytes32 indexed jobId,
        uint256 indexed agentId,
        address indexed originalPayer,
        uint256 amount
    );

    error UnauthorizedCaller();
    error InvalidHookData();
    error WrongToken();
    error WrongDepositor();

    constructor(IERC20 _usdc, IJobEscrow _escrow) Ownable(msg.sender) {
        usdc = _usdc;
        escrow = _escrow;
    }

    /// @notice Circle CCTP V2 callback fired after USDC is minted on Arc.
    /// @dev hookData is the abi.encode tuple from the source chain:
    ///        (uint256 agentId, bytes32 requestHash, address originalPayer)
    ///      Must be exactly 3 * 32 = 96 bytes.
    function handleReceiveFinalizedTransfer(
        address token,
        uint256 amount,
        address depositor,
        bytes calldata hookData,
        bytes32, /* sourceDomain bytes32 */
        bytes32 /* nonce bytes32 */
    ) external nonReentrant {
        if (msg.sender != MESSAGE_TRANSMITTER) revert UnauthorizedCaller();
        if (token != address(usdc)) revert WrongToken();
        if (hookData.length != 96) revert InvalidHookData();
        if (depositor != address(this)) revert WrongDepositor();

        uint256 agentId = abi.decode(hookData[0:32], (uint256));
        bytes32 requestHash = abi.decode(hookData[32:64], (bytes32));
        address originalPayer = abi.decode(hookData[64:96], (address));

        // Approve the escrow to pull the freshly minted USDC.
        // forceApprove handles tokens (like USDC) that require allowance
        // to be reset to zero before being raised — defensive even when
        // current allowance is already zero.
        usdc.forceApprove(address(escrow), amount);

        // msg.sender inside openJob will be address(this) (the gateway);
        // the original payer is tracked in the event so off-chain indexers
        // can attribute the job to a real user on the source chain.
        bytes32 jobId = escrow.openJob(agentId, requestHash);

        emit CrossChainJobOpened(jobId, agentId, originalPayer, amount);
    }

    /// @notice Owner-only escape hatch for tokens that get stuck in this
    ///         contract (e.g. someone sent USDC directly, bypassing CCTP).
    function recoverTokens(IERC20 token, uint256 amount, address to) external onlyOwner {
        token.safeTransfer(to, amount);
    }
}
