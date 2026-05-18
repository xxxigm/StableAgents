import type { ReactNode } from "react";
import { Nav } from "./Nav";

interface LayoutProps {
    active: string;
    onSelect: (id: string) => void;
    children: ReactNode;
}

export function Layout({ active, onSelect, children }: LayoutProps) {
    return (
        <div className="relative min-h-full">
            <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
            <Nav active={active} onSelect={onSelect} />
            <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
            <Footer />
        </div>
    );
}

function Footer() {
    return (
        <footer className="mt-24 border-t border-line">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                <p>
                    StableAgents — on-chain marketplace for accountable AI agents.{" "}
                    <span className="text-zinc-600">No warranty. MIT licensed.</span>
                </p>
                <p className="font-mono">
                    chain id <span className="text-zinc-400">5042002</span> · USDC = gas
                </p>
            </div>
        </footer>
    );
}
