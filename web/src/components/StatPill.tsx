import type { ReactNode } from "react";

interface StatPillProps {
    label: string;
    value: ReactNode;
    sub?: ReactNode;
}

export function StatPill({ label, value, sub }: StatPillProps) {
    return (
        <div className="rounded-lg border border-line bg-surface-1 p-4">
            <p className="text-eyebrow uppercase text-zinc-500">{label}</p>
            <p className="tnum mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
            {sub ? <p className="mt-1 text-xs text-zinc-500">{sub}</p> : null}
        </div>
    );
}
