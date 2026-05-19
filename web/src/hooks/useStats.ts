import { useMemo } from "react";

import { useActivity } from "./useActivity";
import { useAgents } from "./useAgents";

export interface NetworkStats {
    activeAgents: number;
    totalAgents: number;
    jobsSettled: number;
    slashes: number;
    /** Percentage 0-100 of jobs that ended in a valid receipt vs slash. */
    honorRate: number | null;
    isLoading: boolean;
}

/**
 * Aggregates the registry + escrow feeds into the four hero pills on the
 * landing page. All numbers come from the same lookback window that
 * useActivity uses, so the time slice is internally consistent.
 *
 * `honorRate` returns null when there have been zero closed jobs in the
 * window so the UI can show "—" instead of "0%".
 */
export function useStats(): NetworkStats {
    const { data: agents, isLoading: agentsLoading } = useAgents();
    const { data: activity, isLoading: activityLoading } = useActivity();

    return useMemo(() => {
        const rows = agents ?? [];
        const events = activity ?? [];

        const activeAgents = rows.filter((r) => r.active).length;
        const totalAgents = rows.length;
        const jobsSettled = events.filter((e) => e.kind === "accepted").length;
        const slashes = events.filter((e) => e.kind === "slashed").length;
        const closed = jobsSettled + slashes;
        const honorRate = closed === 0 ? null : Math.round((jobsSettled / closed) * 100);

        return {
            activeAgents,
            totalAgents,
            jobsSettled,
            slashes,
            honorRate,
            isLoading: agentsLoading || activityLoading,
        };
    }, [agents, activity, agentsLoading, activityLoading]);
}
