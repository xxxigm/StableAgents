import { useAgents } from "../hooks/useAgents";
import { formatUsdc, shortAddr } from "../lib/format";
import { ReputationDot } from "./ReputationDot";

export function Leaderboard() {
    const { data, isLoading } = useAgents();

    const top = (data ?? [])
        .filter((a) => a.active)
        .sort((a, b) => {
            if (b.reputation !== a.reputation) return b.reputation - a.reputation;
            return Number(b.stake - a.stake);
        })
        .slice(0, 10);

    return (
        <div className="rounded-lg border border-line bg-surface-1">
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
                <h3 className="text-eyebrow uppercase text-zinc-500">Top agents</h3>
                <span className="font-mono text-[10px] text-zinc-500">by reputation · stake</span>
            </header>
            {isLoading ? (
                <div className="space-y-2 p-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-6 animate-pulse rounded bg-surface-2" />
                    ))}
                </div>
            ) : top.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-zinc-500">No agents yet.</div>
            ) : (
                <ol className="divide-y divide-line">
                    {top.map((a, i) => (
                        <li
                            key={a.id}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm"
                        >
                            <span className="tnum w-6 text-right text-xs text-zinc-500">
                                {i + 1}
                            </span>
                            <ReputationDot score={a.reputation} />
                            <span className="tnum truncate text-xs text-zinc-300">
                                {shortAddr(a.owner)}
                            </span>
                            <span className="tnum ml-auto text-xs text-zinc-400">
                                ${formatUsdc(a.stake, { digits: 0 })}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
