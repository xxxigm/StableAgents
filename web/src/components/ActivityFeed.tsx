import { useActivity, type ActivityItem } from "../hooks/useActivity";
import { formatUsdc } from "../lib/format";

export function ActivityFeed() {
    const { data, isLoading } = useActivity();
    const items = data ?? [];

    return (
        <div className="rounded-lg border border-line bg-surface-1">
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
                <h3 className="text-eyebrow uppercase text-zinc-500">Live activity</h3>
                <span className="font-mono text-[10px] text-zinc-500">
                    last 50 events · refresh 8s
                </span>
            </header>
            {isLoading ? (
                <div className="space-y-2 p-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-5 animate-pulse rounded bg-surface-2" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-zinc-500">
                    No events in scan window.
                </div>
            ) : (
                <ol className="divide-y divide-line">
                    {items.map((item, i) => (
                        <li key={`${item.txHash}-${i}`} className="px-4 py-3">
                            <Row item={item} />
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

function Row({ item }: { item: ActivityItem }) {
    const dotTone =
        item.kind === "opened"
            ? "bg-zinc-400"
            : item.kind === "accepted"
              ? "bg-accent"
              : "bg-danger";

    const label =
        item.kind === "opened"
            ? "Job opened"
            : item.kind === "accepted"
              ? "Receipt accepted"
              : "Slashed";

    return (
        <div className="flex items-center gap-3 text-sm">
            <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} />
            <span className="text-zinc-200">{label}</span>
            {item.kind !== "accepted" && item.agentId > 0n ? (
                <span className="tnum text-xs text-zinc-500">agent #{item.agentId.toString()}</span>
            ) : null}
            <span className="tnum ml-auto text-xs text-zinc-500">
                {item.amount ? `$${formatUsdc(item.amount)}` : ""}
            </span>
            <a
                href={`https://testnet.arcscan.app/tx/${item.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="tnum text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            >
                {item.txHash.slice(0, 10)}…
            </a>
        </div>
    );
}
