// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, Vm } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { AgentRegistry } from "../src/AgentRegistry.sol";
import { IAgentRegistry } from "../src/interfaces/IAgentRegistry.sol";
import { JobEscrow } from "../src/JobEscrow.sol";
import { MockUSDC } from "./helpers/MockUSDC.sol";

contract JobEscrowTest is Test {
    MockUSDC internal usdc;
    AgentRegistry internal registry;
    JobEscrow internal escrow;

    address internal admin = makeAddr("admin");
    address internal agentOwner = makeAddr("agentOwner");
    address internal caller = makeAddr("caller");

    uint256 internal signerPk = uint256(keccak256("agent-signer"));
    address internal signerAddr;

    uint256 internal constant MIN_STAKE = 10e6;
    uint256 internal constant STAKE = 100e6;
    uint256 internal constant PRICE = 1e6;
    uint32 internal constant MAX_RESP = 30;
    uint32 internal constant SLASH_BPS = 2_000; // 20%
    uint256 internal agentId;

    function setUp() public {
        signerAddr = vm.addr(signerPk);

        vm.startPrank(admin);
        usdc = new MockUSDC();
        registry = new AgentRegistry(IERC20(address(usdc)), MIN_STAKE);
        escrow = new JobEscrow(IERC20(address(usdc)), IAgentRegistry(address(registry)));
        registry.setJobEscrow(address(escrow));
        vm.stopPrank();

        usdc.mint(agentOwner, 1_000e6);
        usdc.mint(caller, 1_000e6);

        vm.prank(agentOwner);
        usdc.approve(address(registry), type(uint256).max);
        vm.prank(caller);
        usdc.approve(address(escrow), type(uint256).max);

        vm.prank(agentOwner);
        agentId = registry.register(signerAddr, STAKE, PRICE, MAX_RESP, SLASH_BPS, "https://a");
    }

    // ---- openJob --------------------------------------------------------

    function test_openJob_escrowsUSDC() public {
        uint256 before_ = usdc.balanceOf(caller);
        vm.prank(caller);
        escrow.openJob(agentId, keccak256("r"));
        assertEq(usdc.balanceOf(caller), before_ - PRICE);
        assertEq(usdc.balanceOf(address(escrow)), PRICE);
    }

    function test_openJob_incrementsPending() public {
        vm.prank(caller);
        escrow.openJob(agentId, keccak256("r"));
        assertEq(registry.pendingJobs(agentId), 1);
    }

    function test_openJob_inactiveAgent_reverts() public {
        vm.prank(agentOwner);
        registry.deactivate(agentId);

        vm.prank(caller);
        vm.expectRevert(JobEscrow.AgentNotActive.selector);
        escrow.openJob(agentId, keccak256("r"));
    }

    // ---- submitReceipt — happy path ------------------------------------

    function test_submitReceipt_paysAgentAndCloses() public {
        bytes32 jobId = _open(keccak256("r"));
        bytes32 respHash = keccak256("response");
        bytes memory sig = _sign(signerPk, jobId, respHash);

        uint256 ownerBalBefore = usdc.balanceOf(agentOwner);
        vm.prank(agentOwner);
        escrow.submitReceipt(jobId, respHash, sig);

        assertEq(usdc.balanceOf(agentOwner), ownerBalBefore + PRICE);
        JobEscrow.Job memory j = escrow.getJob(jobId);
        assertEq(uint8(j.status), uint8(JobEscrow.JobStatus.Completed));
        assertEq(j.responseHash, respHash);
        assertEq(registry.pendingJobs(agentId), 0);
        assertEq(registry.reputationScore(agentId), 75);
    }

    function test_submitReceipt_wrongSigner_reverts() public {
        bytes32 jobId = _open(keccak256("r"));
        bytes32 respHash = keccak256("response");
        bytes memory sig = _sign(uint256(keccak256("not the signer")), jobId, respHash);

        vm.prank(agentOwner);
        vm.expectRevert(JobEscrow.InvalidSignature.selector);
        escrow.submitReceipt(jobId, respHash, sig);
    }

    function test_submitReceipt_tamperedHash_reverts() public {
        bytes32 jobId = _open(keccak256("r"));
        bytes32 respHash = keccak256("response");
        bytes memory sig = _sign(signerPk, jobId, respHash);

        vm.prank(agentOwner);
        vm.expectRevert(JobEscrow.InvalidSignature.selector);
        escrow.submitReceipt(jobId, keccak256("tampered"), sig);
    }

    function test_submitReceipt_afterDeadline_reverts() public {
        bytes32 jobId = _open(keccak256("r"));
        bytes32 respHash = keccak256("response");
        bytes memory sig = _sign(signerPk, jobId, respHash);
        skip(MAX_RESP + 1);

        vm.prank(agentOwner);
        vm.expectRevert(JobEscrow.DeadlineExceeded.selector);
        escrow.submitReceipt(jobId, respHash, sig);
    }

    function test_submitReceipt_replay_isBlocked() public {
        bytes32 jobId = _open(keccak256("r"));
        bytes32 respHash = keccak256("response");
        bytes memory sig = _sign(signerPk, jobId, respHash);

        vm.prank(agentOwner);
        escrow.submitReceipt(jobId, respHash, sig);

        // Open a "new" job with identical inputs and try to reuse the
        // exact same signature — the digest is the same, so usedReceipts
        // must short-circuit it.
        bytes32 jobId2 = _open(keccak256("r"));
        assertTrue(jobId != jobId2, "nonce/timestamp should differ");
        // signature is bound to old jobId, so InvalidSignature would have
        // fired anyway — but we want to prove the digest-level block.
        bytes memory sig2 = _sign(signerPk, jobId2, respHash);
        vm.prank(agentOwner);
        escrow.submitReceipt(jobId2, respHash, sig2);

        // Now try to re-submit the *first* signature again. Job is
        // Completed so status check fires first — but if we somehow
        // re-opened to Pending in the future, usedReceipts is the
        // last line of defense and would also revert.
        vm.prank(agentOwner);
        vm.expectRevert(JobEscrow.InvalidStatus.selector);
        escrow.submitReceipt(jobId, respHash, sig);
    }

    // ---- claimTimeout --------------------------------------------------

    function test_claimTimeout_refundsAndSlashes() public {
        bytes32 jobId = _open(keccak256("r"));
        skip(MAX_RESP + 1);

        uint256 callerBalBefore = usdc.balanceOf(caller);
        vm.prank(caller);
        escrow.claimTimeout(jobId);

        uint256 expectedSlash = (STAKE * SLASH_BPS) / 10_000;
        assertEq(usdc.balanceOf(caller), callerBalBefore + PRICE + expectedSlash);
        assertEq(registry.getAgent(agentId).stake, STAKE - expectedSlash);
        assertEq(registry.reputationScore(agentId), 50);
    }

    function test_claimTimeout_beforeDeadline_reverts() public {
        bytes32 jobId = _open(keccak256("r"));
        vm.prank(caller);
        vm.expectRevert(JobEscrow.DeadlineNotReached.selector);
        escrow.claimTimeout(jobId);
    }

    function test_claimTimeout_afterReceipt_reverts() public {
        bytes32 jobId = _open(keccak256("r"));
        bytes32 respHash = keccak256("response");
        bytes memory sig = _sign(signerPk, jobId, respHash);
        vm.prank(agentOwner);
        escrow.submitReceipt(jobId, respHash, sig);

        skip(MAX_RESP + 1);
        vm.prank(caller);
        vm.expectRevert(JobEscrow.InvalidStatus.selector);
        escrow.claimTimeout(jobId);
    }

    // ---- multi-job independence ----------------------------------------

    function test_multipleJobs_independentLifecycles() public {
        bytes32 id1 = _open(keccak256("r1"));
        bytes32 id2 = _open(keccak256("r2"));
        bytes32 id3 = _open(keccak256("r3"));
        assertTrue(id1 != id2 && id2 != id3 && id1 != id3);
        assertEq(registry.pendingJobs(agentId), 3);

        // Complete the middle one.
        bytes32 h = keccak256("r2-out");
        bytes memory s = _sign(signerPk, id2, h);
        vm.prank(agentOwner);
        escrow.submitReceipt(id2, h, s);
        assertEq(registry.pendingJobs(agentId), 2);

        // Time out the first one.
        skip(MAX_RESP + 1);
        vm.prank(caller);
        escrow.claimTimeout(id1);
        assertEq(registry.pendingJobs(agentId), 1);

        assertEq(uint8(escrow.getJob(id1).status), uint8(JobEscrow.JobStatus.Slashed));
        assertEq(uint8(escrow.getJob(id2).status), uint8(JobEscrow.JobStatus.Completed));
        assertEq(uint8(escrow.getJob(id3).status), uint8(JobEscrow.JobStatus.Pending));
    }

    // ---- helpers --------------------------------------------------------

    function _open(bytes32 requestHash) internal returns (bytes32 jobId) {
        vm.prank(caller);
        jobId = escrow.openJob(agentId, requestHash);
    }

    function _sign(uint256 pk, bytes32 jobId, bytes32 responseHash)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = escrow.hashReceipt(
            JobEscrow.Receipt({ jobId: jobId, responseHash: responseHash })
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }
}
