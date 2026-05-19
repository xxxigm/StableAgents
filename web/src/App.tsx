import { useState } from "react";

import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Agents } from "./pages/Agents";
import { Activity } from "./pages/Activity";
import { AgentTable } from "./components/AgentTable";
import { OpenJobDialog } from "./components/OpenJobDialog";
import { SubmitReceiptDialog } from "./components/SubmitReceiptDialog";

import { useAgents, type AgentRow } from "./hooks/useAgents";
import { Walkthrough } from "./pages/Walkthrough";

export default function App() {
    // In-memory router — three tabs do not warrant react-router.
    const [tab, setTab] = useState<"agents" | "jobs" | "activity" | "walkthrough">("agents");
    const [picked, setPicked] = useState<AgentRow | null>(null);
    const [receiptOpen, setReceiptOpen] = useState(false);
    const [receiptJobId, setReceiptJobId] = useState<`0x${string}` | undefined>(undefined);

    function openReceiptDialog(jobId?: `0x${string}`) {
        setReceiptJobId(jobId);
        setReceiptOpen(true);
    }

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
                <JobsTab onSubmitReceipt={() => openReceiptDialog()} onPick={setPicked} />
            ) : tab === "activity" ? (
                <Activity onSubmitReceipt={(id) => openReceiptDialog(id)} />
            ) : (
                <Walkthrough />
            )}

            <OpenJobDialog open={picked !== null} onClose={() => setPicked(null)} agent={picked} />
            <SubmitReceiptDialog
                open={receiptOpen}
                onClose={() => {
                    setReceiptOpen(false);
                    setReceiptJobId(undefined);
                }}
                initialJobId={receiptJobId}
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

