import { type AgentRow } from "../hooks/useAgents";
import { ReputationDot } from "./ReputationDot";
import { formatBps, formatDuration, formatUsdc, shortAddr } from "../lib/format";

interface AgentTableProps {
    rows: AgentRow[];
    loading?: boolean;
    onPick?: (row: AgentRow) => void;
}

export function AgentTable({ rows, loading, onPick }: AgentTableProps) {
    if (loading) return <SkeletonRows />;
    if (rows.length === 0) return <EmptyState />;

    return (
        <div className="overflow-hidden rounded-lg border border-line bg-surface-1">
            <table className="w-full text-sm">
                <thead className="border-b border-line text-eyebrow uppercase text-zinc-500">
                    <tr>
                        <Th className="w-12 text-center">#</Th>
                        <Th>Owner</Th>
                        <Th className="text-right">Reputation</Th>
                        <Th className="text-right">Price</Th>
                        <Th className="text-right">SLA</Th>
                        <Th className="text-right">Slash</Th>
                        <Th className="text-right">Stake</Th>
                        <Th>Status</Th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {rows.map((r) => (
                        <tr
                            key={r.id}
                            onClick={() => onPick?.(r)}
                            className={
                                "transition-colors " +
                                (onPick ? "cursor-pointer hover:bg-surface-2" : "")
                            }
                        >
                            <Td className="tnum text-center text-zinc-500">{r.id}</Td>
                            <Td>
                                <div className="flex flex-col">
                                    <span className="tnum text-zinc-200">
                                        {shortAddr(r.owner)}
                                    </span>
                                    <span className="text-xs text-zinc-500">{r.endpoint}</span>
                                </div>
                            </Td>
                            <Td className="text-right">
                                <ReputationDot score={r.reputation} />
                                <div className="tnum text-xs text-zinc-500">
                                    {r.completed} ok · {r.slashed} slashed
                                </div>
                            </Td>
                            <Td className="tnum text-right text-zinc-200">
                                ${formatUsdc(r.pricePerJob)}
                            </Td>
                            <Td className="tnum text-right text-zinc-300">
                                {formatDuration(r.maxResponseTime)}
                            </Td>
                            <Td className="tnum text-right text-zinc-300">
                                {formatBps(r.slashBps)}
                            </Td>
                            <Td className="tnum text-right text-zinc-200">
                                ${formatUsdc(r.stake, { digits: 0 })}
                            </Td>
                            <Td>
                                <StatusBadge active={r.active} />
                            </Td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <th
            scope="col"
            className={`px-4 py-3 text-left font-normal ${className}`}
        >
            {children}
        </th>
    );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs " +
                (active
                    ? "bg-accent/10 text-lime-200"
                    : "bg-zinc-800 text-zinc-400")
            }
        >
            <span
                className={
                    "inline-block h-1.5 w-1.5 rounded-full " +
                    (active ? "bg-accent" : "bg-zinc-500")
                }
            />
            {active ? "active" : "inactive"}
        </span>
    );
}

function SkeletonRows() {
    return (
        <div className="overflow-hidden rounded-lg border border-line bg-surface-1">
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-4 border-b border-line px-4 py-4 last:border-b-0"
                >
                    <div className="h-3 w-6 animate-pulse rounded bg-surface-2" />
                    <div className="h-3 flex-1 animate-pulse rounded bg-surface-2" />
                    <div className="h-3 w-16 animate-pulse rounded bg-surface-2" />
                    <div className="h-3 w-12 animate-pulse rounded bg-surface-2" />
                    <div className="h-3 w-20 animate-pulse rounded bg-surface-2" />
                </div>
            ))}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="rounded-lg border border-dashed border-line bg-surface-1 px-6 py-16 text-center">
            <p className="text-eyebrow uppercase text-zinc-500">no agents yet</p>
            <p className="mt-2 text-sm text-zinc-400">
                Be the first to stake. Run the deploy script and call{" "}
                <code className="font-mono text-zinc-300">AgentRegistry.register(…)</code>.
            </p>
        </div>
    );
}
