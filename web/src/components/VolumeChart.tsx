import { useMemo } from "react";
import { useActivity } from "../hooks/useActivity";

/**
 * Inline SVG sparkline of the last 24h of escrow events bucketed by
 * hour. Bars are split into:
 *   - opened (zinc, base bar)
 *   - accepted overlay (accent, painted on top, full bar)
 *   - slashed overlay (danger, only the slice that was slashed)
 *
 * Plain SVG, no recharts/d3 — keeps the bundle under 200KB gz.
 *
 * Note: without per-event timestamps from the chain we approximate
 * "time" by binning the latest events into 24 equal slots. Wiring real
 * block timestamps is a one-line change once we have an indexer.
 */
export function VolumeChart() {
    const { data, isLoading } = useActivity(100_000);

    const buckets = useMemo(() => {
        const arr = Array.from({ length: 24 }, () => ({
            opened: 0,
            accepted: 0,
            slashed: 0,
        }));
        if (!data) return arr;
        const events = data.slice().reverse();
        if (events.length === 0) return arr;
        events.forEach((e, i) => {
            const slot = Math.min(23, Math.floor((i / events.length) * 24));
            const b = arr[slot]!;
            if (e.kind === "opened") b.opened += 1;
            if (e.kind === "accepted") b.accepted += 1;
            if (e.kind === "slashed") b.slashed += 1;
        });
        return arr;
    }, [data]);

    const max = Math.max(1, ...buckets.map((b) => b.opened + b.accepted + b.slashed));

    return (
        <div className="rounded-lg border border-line bg-surface-1 p-4">
            <header className="flex items-center justify-between">
                <h3 className="text-eyebrow uppercase text-zinc-500">24-hour volume</h3>
                <span className="font-mono text-[10px] text-zinc-500">events / hour</span>
            </header>
            {isLoading ? (
                <div className="mt-4 h-24 animate-pulse rounded bg-surface-2" />
            ) : (
                <svg viewBox="0 0 240 80" className="mt-3 h-24 w-full" preserveAspectRatio="none">
                    {buckets.map((b, i) => {
                        const total = b.opened + b.accepted + b.slashed;
                        const h = (total / max) * 70;
                        const slashedH = (b.slashed / max) * 70;
                        const acceptedH = (b.accepted / max) * 70;
                        const x = i * 10 + 1;
                        const base = 76;
                        return (
                            <g key={i}>
                                <rect
                                    x={x}
                                    y={base - h}
                                    width={8}
                                    height={h}
                                    rx={1}
                                    fill="var(--surface-2)"
                                />
                                {acceptedH > 0 && (
                                    <rect
                                        x={x}
                                        y={base - acceptedH}
                                        width={8}
                                        height={acceptedH}
                                        rx={1}
                                        fill="var(--accent)"
                                        opacity={0.85}
                                    />
                                )}
                                {slashedH > 0 && (
                                    <rect
                                        x={x}
                                        y={base - slashedH}
                                        width={8}
                                        height={slashedH}
                                        rx={1}
                                        fill="var(--danger)"
                                        opacity={0.85}
                                    />
                                )}
                            </g>
                        );
                    })}
                    <line x1="0" y1="76" x2="240" y2="76" stroke="var(--line)" strokeWidth="0.5" />
                </svg>
            )}
            <div className="mt-3 flex items-center gap-4 text-[10px] text-zinc-500">
                <Legend dotClass="bg-surface-2 border border-line" label="opened" />
                <Legend dotClass="bg-accent" label="accepted" />
                <Legend dotClass="bg-danger" label="slashed" />
            </div>
        </div>
    );
}

function Legend({ dotClass, label }: { dotClass: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-sm ${dotClass}`} />
            <span className="uppercase tracking-wider text-zinc-500">{label}</span>
        </span>
    );
}
