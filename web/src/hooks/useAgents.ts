import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { readContract } from "wagmi/actions";

import { agentRegistryAbi } from "../lib/abi/agentRegistry";
import { contracts } from "../lib/contracts";
import { wagmiConfig } from "../lib/wagmi";

export interface AgentRow {
    id: number;
    owner: `0x${string}`;
    signer: `0x${string}`;
    stake: bigint;
    pricePerJob: bigint;
    maxResponseTime: number;
    slashBps: number;
    active: boolean;
    endpoint: string;
    reputation: number;
    completed: number;
    slashed: number;
}

/** Read nextAgentId; the directory walks from 1 up to nextAgentId - 1. */
export function useAgentCount() {
    return useReadContract({
        address: contracts.agentRegistry,
        abi: agentRegistryAbi,
        functionName: "nextAgentId",
        query: { refetchInterval: 10_000 },
    });
}

/**
 * Fetch the full agent directory. We fan out a fixed batch of view
 * calls per agent (getAgent, reputation, counters, endpoint) and stitch
 * them into AgentRow shape for the table.
 *
 * The implementation here is intentionally simple — a paginated /
 * indexer-backed version is on the roadmap once the registry exceeds
 * a few thousand entries.
 */
export function useAgents() {
    const { data: nextId } = useAgentCount();

    return useQuery<AgentRow[]>({
        queryKey: ["agents", nextId?.toString()],
        enabled: typeof nextId === "bigint",
        queryFn: async () => {
            const total = Number(nextId ?? 1n) - 1;
            if (total <= 0) return [];

            const ids = Array.from({ length: total }, (_, i) => i + 1);
            const rows = await Promise.all(ids.map(loadAgent));
            return rows.filter((r): r is AgentRow => r !== null);
        },
        staleTime: 10_000,
    });
}

async function loadAgent(id: number): Promise<AgentRow | null> {
    try {
        const [agent, reputation, completed, slashed, endpoint] = await Promise.all([
            readContract(wagmiConfig, {
                address: contracts.agentRegistry,
                abi: agentRegistryAbi,
                functionName: "getAgent",
                args: [BigInt(id)],
            }),
            readContract(wagmiConfig, {
                address: contracts.agentRegistry,
                abi: agentRegistryAbi,
                functionName: "reputationScore",
                args: [BigInt(id)],
            }),
            readContract(wagmiConfig, {
                address: contracts.agentRegistry,
                abi: agentRegistryAbi,
                functionName: "completedJobs",
                args: [BigInt(id)],
            }),
            readContract(wagmiConfig, {
                address: contracts.agentRegistry,
                abi: agentRegistryAbi,
                functionName: "slashedJobs",
                args: [BigInt(id)],
            }),
            readContract(wagmiConfig, {
                address: contracts.agentRegistry,
                abi: agentRegistryAbi,
                functionName: "getEndpoint",
                args: [BigInt(id)],
            }),
        ]);

        if (!agent || agent.owner === "0x0000000000000000000000000000000000000000") {
            return null;
        }

        return {
            id,
            owner: agent.owner,
            signer: agent.signer,
            stake: agent.stake,
            pricePerJob: agent.pricePerJob,
            maxResponseTime: agent.maxResponseTime,
            slashBps: agent.slashBps,
            active: agent.active,
            endpoint,
            reputation,
            completed,
            slashed,
        };
    } catch {
        return null;
    }
}
