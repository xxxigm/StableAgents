import { useQuery } from "@tanstack/react-query";
import { getPublicClient } from "wagmi/actions";
import { parseAbiItem } from "viem";

import { contracts } from "../lib/contracts";
import { wagmiConfig } from "../lib/wagmi";

export type ActivityKind = "opened" | "accepted" | "slashed";

export interface ActivityItem {
    kind: ActivityKind;
    jobId: `0x${string}`;
    agentId: bigint;
    amount?: bigint;
    txHash: `0x${string}`;
    blockNumber: bigint;
    timestamp?: number;
}

const JOB_OPENED = parseAbiItem(
    "event JobOpened(bytes32 indexed jobId, uint256 indexed agentId, address indexed caller, uint256 amount, bytes32 requestHash, uint32 deadline)",
);
const RECEIPT_ACCEPTED = parseAbiItem(
    "event ReceiptAccepted(bytes32 indexed jobId, bytes32 responseHash)",
);
const JOB_SLASHED = parseAbiItem(
    "event JobSlashed(bytes32 indexed jobId, uint256 refunded, uint256 slashed)",
);

/**
 * Pulls the last `lookbackBlocks` worth of escrow events and merges
 * them into a single feed sorted newest first. A real deployment will
 * eventually outgrow this — at that point the read should move to a
 * dedicated indexer (Goldsky / Envio) — but it is more than enough for
 * the first weeks of testnet usage.
 */
export function useActivity(lookbackBlocks = 50_000) {
    return useQuery<ActivityItem[]>({
        queryKey: ["activity", lookbackBlocks],
        refetchInterval: 8_000,
        queryFn: async () => {
            const client = getPublicClient(wagmiConfig);
            if (!client) return [];

            const head = await client.getBlockNumber();
            const fromBlock = head > BigInt(lookbackBlocks) ? head - BigInt(lookbackBlocks) : 0n;

            const [opened, accepted, slashed] = await Promise.all([
                client.getLogs({
                    address: contracts.jobEscrow,
                    event: JOB_OPENED,
                    fromBlock,
                }),
                client.getLogs({
                    address: contracts.jobEscrow,
                    event: RECEIPT_ACCEPTED,
                    fromBlock,
                }),
                client.getLogs({
                    address: contracts.jobEscrow,
                    event: JOB_SLASHED,
                    fromBlock,
                }),
            ]);

            const items: ActivityItem[] = [];
            for (const log of opened) {
                items.push({
                    kind: "opened",
                    jobId: log.args.jobId!,
                    agentId: log.args.agentId!,
                    amount: log.args.amount,
                    txHash: log.transactionHash,
                    blockNumber: log.blockNumber,
                });
            }
            for (const log of accepted) {
                items.push({
                    kind: "accepted",
                    jobId: log.args.jobId!,
                    agentId: 0n,
                    txHash: log.transactionHash,
                    blockNumber: log.blockNumber,
                });
            }
            for (const log of slashed) {
                items.push({
                    kind: "slashed",
                    jobId: log.args.jobId!,
                    agentId: 0n,
                    amount: log.args.slashed,
                    txHash: log.transactionHash,
                    blockNumber: log.blockNumber,
                });
            }

            return items.sort((a, b) => Number(b.blockNumber - a.blockNumber)).slice(0, 50);
        },
    });
}
