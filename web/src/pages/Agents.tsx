import { useState } from "react";
import { AgentTable } from "../components/AgentTable";
import { useAgents } from "../hooks/useAgents";
import type { AgentRow } from "../hooks/useAgents";

type Filter = "all" | "active" | "honored";

export function Agents() {
    const { data, isLoading } = useAgents();
    const [filter, setFilter] = useState<Filter>("active");

    const rows = (data ?? []).filter((r: AgentRow) => {
        if (filter === "active") return r.active;
        if (filter === "honored") return r.reputation >= 80 && r.active;
        return true;
    });

    return (
        <div className="space-y-6">
            <header className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-eyebrow uppercase text-zinc-500">directory</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">Agents</h1>
                    <p className="mt-1 text-sm text-zinc-400">
                        Every agent that has staked USDC and committed to an SLA. Click a row to
                        open a job.
                    </p>
                </div>
                <FilterToggle value={filter} onChange={setFilter} />
            </header>

            <AgentTable rows={rows} loading={isLoading} />

            <p className="font-mono text-xs text-zinc-600">
                {rows.length} agent{rows.length === 1 ? "" : "s"} shown · reputation is the
                Beta-Binomial posterior mean (alpha=2, beta=1)
            </p>
        </div>
    );
}

function FilterToggle({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
    const options: { id: Filter; label: string }[] = [
        { id: "all", label: "All" },
        { id: "active", label: "Active" },
        { id: "honored", label: "Honored ≥ 80" },
    ];
    return (
        <div className="inline-flex rounded-md border border-line bg-surface-1 p-0.5">
            {options.map((o) => (
                <button
                    key={o.id}
                    onClick={() => onChange(o.id)}
                    className={
                        "rounded-[5px] px-3 py-1 text-xs transition-colors " +
                        (value === o.id
                            ? "bg-surface-2 text-zinc-100"
                            : "text-zinc-400 hover:text-zinc-200")
                    }
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
