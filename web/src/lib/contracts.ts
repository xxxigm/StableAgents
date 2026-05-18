/**
 * Canonical contract addresses for StableAgents on Arc Testnet.
 *
 * The four StableAgents addresses below are placeholders for a fresh
 * deploy — fill them in after running `forge script script/Deploy.s.sol`.
 * The three "external" addresses (USDC, IdentityRegistry, CCTP transmitter)
 * are network-canonical and never change for the lifetime of Arc Testnet.
 */
export const contracts = {
    // --- StableAgents stack (fill after deploy) -------------------------
    agentRegistry: "0x0000000000000000000000000000000000000000" as const,
    jobEscrow: "0x0000000000000000000000000000000000000000" as const,
    crossChainGateway: "0x0000000000000000000000000000000000000000" as const,
    x402Middleware: "0x0000000000000000000000000000000000000000" as const,
    oneShotEnroll: "0x0000000000000000000000000000000000000000" as const,

    // --- External anchors (canonical, do not change) --------------------
    usdc: "0x3600000000000000000000000000000000000000" as const,
    identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const,
    cctpMessageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275" as const,
} as const;

/**
 * EIP-712 typed data domain used by JobEscrow when verifying receipts.
 * Mirrors the on-chain constructor call: `EIP712("StableAgents", "1")`.
 */
export const receiptDomain = {
    name: "StableAgents",
    version: "1",
    chainId: 5_042_002,
    verifyingContract: contracts.jobEscrow,
} as const;

export const receiptTypes = {
    Receipt: [
        { name: "jobId", type: "bytes32" },
        { name: "responseHash", type: "bytes32" },
    ],
} as const;
