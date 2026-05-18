import { useState } from "react";

import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Agents } from "./pages/Agents";
import { AgentTable } from "./components/AgentTable";
import { OpenJobDialog } from "./components/OpenJobDialog";
import { SubmitReceiptDialog } from "./components/SubmitReceiptDialog";

import { useAgents, type AgentRow } from "./hooks/useAgents";

export default function App() {
    // In-memory router — three tabs do not warrant react-router.
    const [tab, setTab] = useState<"agents" | "jobs" | "activity">("agents");
    const [picked, setPicked] = useState<AgentRow | null>(null);
    const [receiptOpen, setReceiptOpen] = useState(false);

    return (
        <Layout active={tab} onSelect={(id) => setTab(id as typeof tab)}>
            {tab === "agents" ? (
                <div className="space-y-16">
                    <Home />
                    <section id="agents">
                        <Agents />
                    </section>
                </div>
            ) : tab === "jobs" ? (
                <JobsTab onSubmitReceipt={() => setReceiptOpen(true)} onPick={setPicked} />
            ) : (
                <Placeholder tab={tab} />
            )}

            <OpenJobDialog open={picked !== null} onClose={() => setPicked(null)} agent={picked} />
            <SubmitReceiptDialog
                open={receiptOpen}
                onClose={() => setReceiptOpen(false)}
                jobId={undefined}
            />
        </Layout>
    );
}

function JobsTab({
    onPick,
    onSubmitReceipt,
}: {
    onPick: (a: AgentRow) => void;
    onSubmitReceipt: () => void;
}) {
    const { data, isLoading } = useAgents();
    return (
        <div className="space-y-6">
            <header className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-eyebrow uppercase text-zinc-500">jobs</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">Open a job</h1>
                    <p className="mt-1 text-sm text-zinc-400">
                        Pick an agent to escrow USDC against, or submit a receipt for a job you
                        already accepted.
                    </p>
                </div>
                <button
                    onClick={onSubmitReceipt}
                    className="rounded-md border border-line bg-surface-1 px-3 py-1.5 text-sm hover:bg-surface-2"
                >
                    Submit receipt
                </button>
            </header>
            <AgentTable rows={data ?? []} loading={isLoading} onPick={onPick} />
        </div>
    );
}

function Placeholder({ tab }: { tab: string }) {
    return (
        <div className="grid place-items-center py-24 text-center">
            <p className="text-eyebrow uppercase text-zinc-500">{tab}</p>
            <p className="mt-2 text-sm text-zinc-400">Lands in a later commit.</p>
        </div>
    );
}
