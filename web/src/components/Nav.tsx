import { ConnectButton } from "./ConnectButton";

type Tab = { id: string; label: string };

const TABS: Tab[] = [
    { id: "agents", label: "Agents" },
    { id: "jobs", label: "Jobs" },
    { id: "activity", label: "Activity" },
    { id: "walkthrough", label: "Hướng dẫn" },
];

interface NavProps {
    active: string;
    onSelect: (id: string) => void;
}

export function Nav({ active, onSelect }: NavProps) {
    return (
        <header className="sticky top-0 z-30 border-b border-line bg-surface-0/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                        <Mark />
                        <span className="font-mono text-sm font-medium tracking-tight">
                            stableagents
                        </span>
                        <span className="hidden text-eyebrow uppercase text-zinc-500 sm:inline">
                            on arc
                        </span>
                    </div>

                    <nav className="hidden items-center gap-1 sm:flex">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => onSelect(t.id)}
                                className={
                                    "rounded-md px-3 py-1.5 text-sm transition-colors " +
                                    (active === t.id
                                        ? "bg-surface-2 text-zinc-100"
                                        : "text-zinc-400 hover:bg-surface-1 hover:text-zinc-200")
                                }
                            >
                                {t.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <ConnectButton />
            </div>
        </header>
    );
}

function Mark() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            className="text-accent"
            aria-hidden="true"
        >
            <rect
                x="1"
                y="1"
                width="18"
                height="18"
                rx="4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <path d="M5 13l3-6 2 4 2-3 3 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}
