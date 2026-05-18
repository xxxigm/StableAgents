/**
 * Canonical contract addresses for StableAgents on Arc Testnet (chain 5042002).
 *
 * Deployed on 2026-05-18 at blocks 42854917-42854934 by
 * 0xbC1010326F9BBc24e81a985BEC235D3e43B19E59.
 *
 * The three "external" addresses (USDC, IdentityRegistry, CCTP transmitter)
 * are network-canonical and never change for the lifetime of Arc Testnet.
 */
export const contracts = {
    // --- StableAgents stack ---------------------------------------------
    agentRegistry: "0x833D73f977a159854FC29e60522c2FD133E5a567" as const,
    jobEscrow: "0xe219f16D4ef5DFF479f63DbdeBA3a42963af7111" as const,
    crossChainGateway: "0x5c349C215f0D5FB6e1A604db832b6c61B71f5CFE" as const,
    x402Middleware: "0x7962B955AFd80E00448be5E112a2B916D7650eeB" as const,
    oneShotEnroll: "0xE968f419Dc1f6709ee91038a5B1F368597cB6558" as const,

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
