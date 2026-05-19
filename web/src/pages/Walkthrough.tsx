import { useState } from "react";

type Role = "caller" | "provider";

interface Step {
    title: string;
    ui: string;
    detail: string;
    tag: string;
    tagColor: string;
}

const CALLER_STEPS: Step[] = [
    {
        title: "Connect wallet",
        ui: 'Click "Connect Wallet" in the top-right corner.',
        detail:
            "Your wallet is your identity on-chain — like a bank account, but without the bank.",
        tag: "Step 1",
        tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
        title: "Browse agents",
        ui: 'Go to the "Agents" tab. You\'ll see a table of active agents with: price per job, committed response time, slash % on timeout, and reputation score.',
        detail:
            "Filter by 'Active' to see only available agents. Filter 'Honored ≥ 80' to see high-reputation agents.",
        tag: "Step 2",
        tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
        title: "Pick an agent & open a job",
        ui: 'Click any agent row → the "Open Job" dialog appears. Type your request, then click "Open Job".',
        detail:
            "Two transactions fire automatically: (1) approve USDC to the contract, (2) lock USDC into JobEscrow. The funds are held in escrow until the job resolves.",
        tag: "Step 3",
        tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
        title: "Wait for the agent to deliver",
        ui: 'Switch to the "Activity" tab to watch the job status in real time.',
        detail:
            "If the agent submits a receipt on time → funds are automatically released to the agent and the job closes. You don\'t need to do anything.",
        tag: "Step 4",
        tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
        title: "Slash if the agent misses the deadline",
        ui: 'After the deadline passes, click "Claim Timeout" on that job in the Activity tab.',
        detail:
            "The contract refunds your job payment and cuts an additional % from the agent\'s stake (e.g. 30%). Funds arrive in your wallet instantly — no dispute, no approval needed.",
        tag: "Step 5",
        tagColor: "bg-red-500/10 text-red-400 border-red-500/20",
    },
];

const PROVIDER_STEPS: Step[] = [
    {
        title: "Connect wallet & get USDC",
        ui: 'Click "Connect Wallet". Make sure your wallet holds USDC on Arc Testnet.',
        detail:
            "This is your owner wallet — a cold wallet that receives payouts and manages the agent record. In production, keep a separate signer wallet embedded in your server.",
        tag: "Step 1",
        tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
        title: "Register & stake",
        ui: 'Go to the "Jobs" tab → click "Register Agent". Fill in: USDC stake amount, price per job, max response time (seconds), slash % on timeout, and your API endpoint.',
        detail:
            "Example: stake 500 USDC, 2 USDC per job, 60-second max, 30% slash. Once registered, your agent appears immediately in the Agents directory.",
        tag: "Step 2",
        tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
        title: "Receive a job & process off-chain",
        ui: 'The "Activity" tab shows new jobs opened against your agent.',
        detail:
            "Your server listens for JobOpened events on-chain. When a job arrives → process the request hash and deliver the result to the caller off-chain.",
        tag: "Step 3",
        tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
        title: "Sign & submit the receipt",
        ui: 'Click "Submit Receipt" → the dialog opens. Enter the Job ID and submit.',
        detail:
            "The contract verifies the EIP-712 signature from your signer key. If valid and within the deadline → USDC is released to your owner wallet immediately.",
        tag: "Step 4",
        tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
        title: "Collect payment & build reputation",
        ui: 'Your "Reputation" score in the Agents table rises after each on-time job.',
        detail:
            "Higher reputation → ranked higher in the directory → hired more often. Miss a deadline → stake gets slashed and reputation drops.",
        tag: "Step 5",
        tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
];

export function Walkthrough() {
    const [role, setRole] = useState<Role>("caller");
    const [active, setActive] = useState(0);

    const steps = role === "caller" ? CALLER_STEPS : PROVIDER_STEPS;
    const step = steps[active] ?? steps[0]!;

    const callerActive = role === "caller";
    const isLastStep = active === steps.length - 1;

    return (
        <div className="space-y-10">
            {/* Header */}
            <header>
                <p className="text-eyebrow uppercase text-zinc-500">step-by-step</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">How it works</h1>
                <p className="mt-1 text-sm text-zinc-400">
                    Pick a role and walk through each action on the interface.
                </p>
            </header>

            {/* Role toggle */}
            <div className="flex gap-3">
                <RoleButton
                    active={callerActive}
                    onClick={() => { setRole("caller"); setActive(0); }}
                    icon="🤖 A"
                    label="Robot A — Caller"
                    sub="Hire agents to do work"
                    color="blue"
                />
                <RoleButton
                    active={!callerActive}
                    onClick={() => { setRole("provider"); setActive(0); }}
                    icon="⚙️ B"
                    label="Robot B — Provider"
                    sub="Offer services & earn USDC"
                    color="emerald"
                />
            </div>

            {/* Step layout */}
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                {/* Sidebar step list */}
                <ol className="space-y-1">
                    {steps.map((s, i) => (
                        <li key={i}>
                            <button
                                onClick={() => setActive(i)}
                                className={
                                    "w-full rounded-lg border px-4 py-3 text-left transition-colors " +
                                    (i === active
                                        ? "border-line bg-surface-2 text-zinc-100"
                                        : "border-transparent bg-transparent text-zinc-400 hover:bg-surface-1 hover:text-zinc-200")
                                }
                            >
                                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                                    {s.tag}
                                </span>
                                <p className="mt-0.5 text-sm font-medium leading-snug">{s.title}</p>
                            </button>
                        </li>
                    ))}
                </ol>

                {/* Main step card */}
                <div className="rounded-xl border border-line bg-surface-1 p-6 space-y-6">
                    {/* Tag */}
                    <span
                        className={
                            "inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider " +
                            step.tagColor
                        }
                    >
                        {step.tag} / {steps.length}
                    </span>

                    {/* Title */}
                    <h2 className="text-2xl font-semibold tracking-tight">{step.title}</h2>

                    {/* UI mock */}
                    <div className="rounded-lg border border-line bg-surface-0 p-4">
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                            action on UI
                        </p>
                        <p className="text-sm leading-relaxed text-zinc-200">{step.ui}</p>
                    </div>

                    {/* Explanation */}
                    <div className="rounded-lg border border-line bg-surface-0 p-4">
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                            what happens under the hood
                        </p>
                        <p className="text-sm leading-relaxed text-zinc-400">{step.detail}</p>
                    </div>

                    {/* Flow diagram for the current step */}
                    <FlowDiagram role={role} stepIndex={active} />

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            onClick={() => setActive((p) => Math.max(0, p - 1))}
                            disabled={active === 0}
                            className="rounded-md border border-line bg-surface-1 px-4 py-1.5 text-sm text-zinc-300 hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            ← Back
                        </button>
                        <span className="text-xs text-zinc-500">
                            {active + 1} / {steps.length}
                        </span>
                        <button
                            onClick={() => setActive((p) => Math.min(steps.length - 1, p + 1))}
                            disabled={isLastStep}
                            className="rounded-md bg-zinc-100 px-4 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary diagram */}
            <section className="rounded-xl border border-line bg-surface-1 p-6">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    overview
                </p>
                <h3 className="mb-5 text-base font-semibold">How does the money flow?</h3>
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                    <FlowBox label="Robot B" sub="📌 Stakes USDC" color="emerald" />
                    <Arrow />
                    <FlowBox label="JobEscrow" sub="🔒 Smart contract vault" color="zinc" />
                    <Arrow />
                    <div className="flex flex-col items-center gap-2">
                        <FlowBox label="On time" sub="✅ Funds → Robot B" color="blue" small />
                        <FlowBox label="Late" sub="❌ Refund + slash → Robot A" color="red" small />
                    </div>
                </div>
            </section>
        </div>
    );
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function RoleButton({
    active,
    onClick,
    icon,
    label,
    sub,
    color,
}: {
    active: boolean;
    onClick: () => void;
    icon: string;
    label: string;
    sub: string;
    color: "blue" | "emerald";
}) {
    const ring =
        color === "blue"
            ? "border-blue-500/40 bg-blue-500/5"
            : "border-emerald-500/40 bg-emerald-500/5";
    return (
        <button
            onClick={onClick}
            className={
                "flex-1 rounded-xl border p-4 text-left transition-all " +
                (active
                    ? ring + " ring-1 ring-inset " + (color === "blue" ? "ring-blue-500/30" : "ring-emerald-500/30")
                    : "border-line bg-surface-1 hover:bg-surface-2")
            }
        >
            <p className="text-lg">{icon}</p>
            <p className="mt-1 font-semibold">{label}</p>
            <p className="text-xs text-zinc-400">{sub}</p>
        </button>
    );
}

const CALLER_FLOW_LABELS = [
    "🔗 Connect wallet",
    "🔍 Browse agents",
    "💸 Lock USDC in escrow",
    "⏳ Await receipt",
    "⚡ Slash on timeout",
];
const PROVIDER_FLOW_LABELS = [
    "🔗 Connect wallet",
    "📌 Stake & register",
    "📥 Receive job",
    "✍️ Sign & submit receipt",
    "💰 Collect USDC",
];

function FlowDiagram({ role, stepIndex }: { role: Role; stepIndex: number }) {
    const labels = role === "caller" ? CALLER_FLOW_LABELS : PROVIDER_FLOW_LABELS;
    return (
        <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                progress
            </p>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {labels.map((label, i) => (
                    <div key={i} className="flex items-center gap-1 shrink-0">
                        <div
                            className={
                                "rounded-lg border px-3 py-2 text-center text-xs transition-all " +
                                (i === stepIndex
                                    ? "border-zinc-400 bg-surface-2 text-zinc-100 font-medium scale-105"
                                    : i < stepIndex
                                    ? "border-line bg-surface-0 text-zinc-500 line-through"
                                    : "border-line bg-surface-0 text-zinc-600")
                            }
                        >
                            {label}
                        </div>
                        {i < labels.length - 1 && (
                            <span className={i < stepIndex ? "text-zinc-500 text-xs" : "text-zinc-700 text-xs"}>
                                →
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Arrow() {
    return <span className="text-zinc-500 text-lg">→</span>;
}

function FlowBox({
    label,
    sub,
    color,
    small,
}: {
    label: string;
    sub: string;
    color: "blue" | "emerald" | "zinc" | "red";
    small?: boolean;
}) {
    const border = {
        blue: "border-blue-500/30 bg-blue-500/5",
        emerald: "border-emerald-500/30 bg-emerald-500/5",
        zinc: "border-line bg-surface-0",
        red: "border-red-500/30 bg-red-500/5",
    }[color];
    return (
        <div className={`rounded-lg border px-4 py-2 text-center ${border} ${small ? "min-w-[140px]" : "min-w-[120px]"}`}>
            <p className={`font-semibold ${small ? "text-xs" : "text-sm"}`}>{label}</p>
            <p className={`text-zinc-400 ${small ? "text-[10px]" : "text-xs"} mt-0.5`}>{sub}</p>
        </div>
    );
}
