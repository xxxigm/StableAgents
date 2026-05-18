// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice Test-only ERC-20 that mirrors Circle's 6-decimal USDC interface.
///         Mint is open so test actors can fund themselves without a faucet.
///         DO NOT deploy outside `forge test` — production code should
///         consume the native USDC at 0x3600000000000000000000000000000000000000.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
