import { defineChain } from "viem";

/**
 * Arc Testnet — Circle's stablecoin-native L1 where USDC is the gas token.
 *
 * Network details are kept in sync with
 *   https://docs.arc.io/arc/references/connect-to-arc
 *
 * Notable wrinkles for client code:
 *   - The "native" currency is USDC at 18-decimal accounting precision.
 *     For ERC-20 transfers the standard 6-decimal interface lives at
 *     0x3600...0000 (see `contracts.ts`).
 *   - Block time is sub-second; transactions reach deterministic finality
 *     in well under a second. No need for confirmation polling.
 */
export const arcTestnet = defineChain({
    id: 5_042_002,
    name: "Arc Testnet",
    nativeCurrency: {
        name: "USDC",
        symbol: "USDC",
        decimals: 18,
    },
    rpcUrls: {
        default: { http: ["https://rpc.testnet.arc.network"] },
        public: { http: ["https://rpc.testnet.arc.network"] },
    },
    blockExplorers: {
        default: {
            name: "ArcScan",
            url: "https://testnet.arcscan.app",
            apiUrl: "https://testnet.arcscan.app/api",
        },
    },
    testnet: true,
});
