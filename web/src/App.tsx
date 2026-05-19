import { useState } from "react";

import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Agents } from "./pages/Agents";
import { Activity } from "./pages/Activity";
import { AgentTable } from "./components/AgentTable";
import { OpenJobDialog } from "./components/OpenJobDialog";
import { SubmitReceiptDialog } from "./components/SubmitReceiptDialog";
import { RegisterAgentDialog } from "./components/RegisterAgentDialog";

import { useAgents, type AgentRow } from "./hooks/useAgents";
import { Walkthrough } from "./pages/Walkthrough";

export default function App() {
    // In-memory router — three tabs do not warrant react-router.
    const [tab, setTab] = useState<"agents" | "jobs" | "activity" | "walkthrough">("agents");
    const [picked, setPicked] = useState<AgentRow | null>(null);
    const [receiptOpen, setReceiptOpen] = useState(false);
    const [receiptJobId, setReceiptJobId] = useState<`0x${string}` | undefined>(undefined);
    const [registerOpen, setRegisterOpen] = useState(false);

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
                <JobsTab onSubmitReceipt={() => openReceiptDialog()} onPick={setPicked} onRegister={() => setRegisterOpen(true)} />
            ) : tab === "activity" ? (
                <Activity onSubmitReceipt={(id) => openReceiptDialog(id)} />
            ) : (
                <Walkthrough />
            )}

            <RegisterAgentDialog open={registerOpen} onClose={() => setRegisterOpen(false)} />
            <OpenJobDialog
                open={picked !== null}
                onClose={() => setPicked(null)}
                agent={picked}
                onJobOpened={() => { setPicked(null); setTab("activity"); }}
            />
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
    onRegister,
}: {
    onPick: (a: AgentRow) => void;
    onSubmitReceipt: () => void;
    onRegister: () => void;
}) {
    const { data, isLoading } = useAgents();
    return (
        <div className="space-y-6">
            {/* Two-column role callout */}
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-blue-400">
                        🤖 Caller — hire an agent
                    </p>
                    <p className="mt-1 text-sm text-zinc-300">
                        Click any row in the table below to open a job and lock USDC into escrow.
                    </p>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
                        ⚙️ Provider — offer a service
                    </p>
                    <p className="mt-1 text-sm text-zinc-300">
                        Register your agent to appear in the directory, or submit a receipt after completing a job.
                    </p>
                </div>
            </div>

            <header className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-eyebrow uppercase text-zinc-500">directory</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">Jobs</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onRegister}
                        className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white"
                    >
                        Register Agent
                    </button>
                    <button
                        onClick={onSubmitReceipt}
                        className="rounded-md border border-line bg-surface-1 px-3 py-1.5 text-sm hover:bg-surface-2"
                    >
                        Submit receipt
                    </button>
                </div>
            </header>
            <AgentTable rows={data ?? []} loading={isLoading} onPick={onPick} />
        </div>
    );
}

