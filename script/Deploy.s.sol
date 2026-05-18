// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { AgentRegistry } from "../src/AgentRegistry.sol";
import { JobEscrow } from "../src/JobEscrow.sol";
import { CrossChainGateway } from "../src/CrossChainGateway.sol";
import { X402Middleware } from "../src/X402Middleware.sol";
import { OneShotEnroll, IAgentRegistryEnroll } from "../src/OneShotEnroll.sol";

import { IAgentRegistry } from "../src/interfaces/IAgentRegistry.sol";
import { IJobEscrow } from "../src/interfaces/IJobEscrow.sol";

/// @title Deploy
/// @notice One-shot deploy script for the full StableAgents stack on Arc
///         Testnet. Sends five contract deploys and one wire-up tx in a
///         single broadcast batch — Arc's sub-second finality means the
///         whole script settles in well under five seconds.
///
/// Usage (Arc Testnet, encrypted keystore):
///
///   cast wallet import deployer --interactive   # one-time
///   source .env
///   forge script script/Deploy.s.sol:Deploy \
///       --account deployer \
///       --sender 0xYOUR_DEPLOYER \
///       --rpc-url arc_testnet \
///       --broadcast
///
/// Required env vars:
///   USDC_ADDRESS  — Arc Testnet USDC (0x3600000000000000000000000000000000000000)
/// Optional:
///   MIN_STAKE     — minimum stake in USDC base units; defaults to 10 USDC
contract Deploy is Script {
    function run()
        external
        returns (
            AgentRegistry registry,
            JobEscrow escrow,
            CrossChainGateway gateway,
            X402Middleware x402,
            OneShotEnroll enroll
        )
    {
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        uint256 minStake = vm.envOr("MIN_STAKE", uint256(10e6));

        console2.log("Deployer            :", msg.sender);
        console2.log("USDC                :", usdcAddress);
        console2.log("Min stake (6 dec)   :", minStake);

        vm.startBroadcast();

        // 1. AgentRegistry (with ERC-8004 binding baked in)
        registry = new AgentRegistry(IERC20(usdcAddress), minStake);
        console2.log("AgentRegistry       :", address(registry));

        // 2. JobEscrow (depends on registry)
        escrow = new JobEscrow(IERC20(usdcAddress), IAgentRegistry(address(registry)));
        console2.log("JobEscrow           :", address(escrow));

        // 3. One-shot wire-up — admin authorizes the escrow on the registry
        registry.setJobEscrow(address(escrow));
        console2.log("Wired JobEscrow -> AgentRegistry");

        // 4. CrossChainGateway — CCTP V2 inbound USDC -> openJob
        gateway = new CrossChainGateway(IERC20(usdcAddress), IJobEscrow(address(escrow)));
        console2.log("CrossChainGateway   :", address(gateway));

        // 5. X402Middleware — HTTP 402 payment -> openJob
        x402 = new X402Middleware(IERC20(usdcAddress), IJobEscrow(address(escrow)));
        console2.log("X402Middleware      :", address(x402));

        // 6. OneShotEnroll — mint ERC-8004 + registerWithIdentity in one tx
        enroll = new OneShotEnroll(IAgentRegistryEnroll(address(registry)));
        console2.log("OneShotEnroll       :", address(enroll));

        vm.stopBroadcast();
    }
}
