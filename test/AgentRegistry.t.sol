// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { AgentRegistry } from "../src/AgentRegistry.sol";
import { IAgentRegistry } from "../src/interfaces/IAgentRegistry.sol";
import { MockUSDC } from "./helpers/MockUSDC.sol";

contract AgentRegistryTest is Test {
    MockUSDC internal usdc;
    AgentRegistry internal registry;

    address internal admin = makeAddr("admin");
    address internal escrow = makeAddr("escrow");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal aliceSigner = makeAddr("aliceSigner");

    uint256 internal constant MIN_STAKE = 10e6;
    uint256 internal constant STAKE = 100e6;
    uint256 internal constant PRICE = 1e6;
    uint32 internal constant MAX_RESP = 30;
    uint32 internal constant SLASH_BPS = 2_000;

    function setUp() public {
        vm.startPrank(admin);
        usdc = new MockUSDC();
        registry = new AgentRegistry(IERC20(address(usdc)), MIN_STAKE);
        registry.setJobEscrow(escrow);
        vm.stopPrank();

        usdc.mint(alice, 1_000e6);
        usdc.mint(bob, 1_000e6);

        vm.prank(alice);
        usdc.approve(address(registry), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(registry), type(uint256).max);
    }

    // ---- register --------------------------------------------------------

    function test_register_storesAgentAndPullsStake() public {
        uint256 balBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        uint256 id = registry.register(aliceSigner, STAKE, PRICE, MAX_RESP, SLASH_BPS, "https://a");

        assertEq(id, 1);
        assertEq(usdc.balanceOf(alice), balBefore - STAKE);
        assertEq(usdc.balanceOf(address(registry)), STAKE);

        IAgentRegistry.AgentView memory a = registry.getAgent(id);
        assertEq(a.owner, alice);
        assertEq(a.signer, aliceSigner);
        assertEq(a.stake, STAKE);
        assertTrue(a.active);
    }

    function test_register_duplicateOwner_reverts() public {
        vm.startPrank(alice);
        registry.register(aliceSigner, STAKE, PRICE, MAX_RESP, SLASH_BPS, "https://a");
        vm.expectRevert(AgentRegistry.AlreadyRegistered.selector);
        registry.register(aliceSigner, STAKE, PRICE, MAX_RESP, SLASH_BPS, "https://a");
        vm.stopPrank();
    }

    function test_register_belowMinStake_reverts() public {
        vm.prank(alice);
        vm.expectRevert(AgentRegistry.BelowMinStake.selector);
        registry.register(aliceSigner, MIN_STAKE - 1, PRICE, MAX_RESP, SLASH_BPS, "https://a");
    }

    function test_register_invalidSlashBps_reverts() public {
        vm.prank(alice);
        vm.expectRevert(AgentRegistry.InvalidSlashBps.selector);
        registry.register(aliceSigner, STAKE, PRICE, MAX_RESP, 10_001, "https://a");
    }

    function test_register_invalidResponseTime_reverts() public {
        vm.prank(alice);
        vm.expectRevert(AgentRegistry.InvalidResponseTime.selector);
        registry.register(aliceSigner, STAKE, PRICE, 4, SLASH_BPS, "https://a");
    }

    function test_register_zeroSigner_reverts() public {
        vm.prank(alice);
        vm.expectRevert(AgentRegistry.InvalidSigner.selector);
        registry.register(address(0), STAKE, PRICE, MAX_RESP, SLASH_BPS, "https://a");
    }

    // ---- deactivate / unstake --------------------------------------------

    function test_unstake_requiresInactive() public {
        uint256 id = _registerAlice();
        vm.prank(alice);
        vm.expectRevert(AgentRegistry.StillActive.selector);
        registry.unstake(id);
    }

    function test_unstake_requiresCooldown() public {
        uint256 id = _registerAlice();
        vm.startPrank(alice);
        registry.deactivate(id);
        vm.expectRevert(AgentRegistry.CooldownNotElapsed.selector);
        registry.unstake(id);
        vm.stopPrank();
    }

    function test_unstake_blocksWithPendingJobs() public {
        uint256 id = _registerAlice();
        vm.prank(alice);
        registry.deactivate(id);

        // Simulate an open job from the escrow
        vm.prank(escrow);
        registry.markJobOpened(id);

        skip(2 hours);
        vm.prank(alice);
        vm.expectRevert(AgentRegistry.JobsPending.selector);
        registry.unstake(id);
    }

    function test_unstake_happyPath() public {
        uint256 id = _registerAlice();
        vm.prank(alice);
        registry.deactivate(id);
        skip(2 hours);

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        registry.unstake(id);

        assertEq(usdc.balanceOf(alice), balBefore + STAKE);
    }

    // ---- slash / escrow gating ------------------------------------------

    function test_slash_onlyEscrow() public {
        uint256 id = _registerAlice();
        vm.expectRevert(AgentRegistry.OnlyJobEscrow.selector);
        registry.slash(id, 1e6, bob);
    }

    function test_slash_movesFundsAndReducesStake() public {
        uint256 id = _registerAlice();
        uint256 balBefore = usdc.balanceOf(bob);

        vm.prank(escrow);
        registry.slash(id, 10e6, bob);

        assertEq(usdc.balanceOf(bob), balBefore + 10e6);
        assertEq(registry.getAgent(id).stake, STAKE - 10e6);
    }

    // ---- setJobEscrow one-shot semantics --------------------------------

    function test_setJobEscrow_isOneShot() public {
        vm.prank(admin);
        vm.expectRevert(AgentRegistry.EscrowAlreadyWired.selector);
        registry.setJobEscrow(makeAddr("evil"));
    }

    // ---- reputation -----------------------------------------------------

    function test_reputation_freshAgentIs66() public {
        uint256 id = _registerAlice();
        assertEq(registry.reputationScore(id), 66);
    }

    function test_reputation_singleSuccessIs75() public {
        uint256 id = _registerAlice();
        vm.prank(escrow);
        registry.bumpCompleted(id);
        assertEq(registry.reputationScore(id), 75);
    }

    function test_reputation_singleSlashIs50() public {
        uint256 id = _registerAlice();
        vm.prank(escrow);
        registry.bumpSlashed(id);
        assertEq(registry.reputationScore(id), 50);
    }

    function test_reputation_evidenceAccumulates() public {
        uint256 id = _registerAlice();
        for (uint256 i; i < 100; i++) {
            vm.prank(escrow);
            registry.bumpCompleted(id);
        }
        for (uint256 i; i < 5; i++) {
            vm.prank(escrow);
            registry.bumpSlashed(id);
        }
        // (100 + 2) / (100 + 5 + 3) * 100 = 102 / 108 * 100 = 94
        assertEq(registry.reputationScore(id), 94);
    }

    // ---- helpers --------------------------------------------------------

    function _registerAlice() internal returns (uint256 id) {
        vm.prank(alice);
        id = registry.register(aliceSigner, STAKE, PRICE, MAX_RESP, SLASH_BPS, "https://a");
    }
}
