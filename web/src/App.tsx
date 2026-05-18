import { useState } from "react";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Agents } from "./pages/Agents";

export default function App() {
    // Tiny in-memory router — three tabs do not warrant react-router.
    const [tab, setTab] = useState<"agents" | "jobs" | "activity">("agents");

    return (
        <Layout active={tab} onSelect={(id) => setTab(id as typeof tab)}>
            <div className="space-y-16">
                {tab === "agents" ? (
                    <>
                        <Home />
                        <section id="agents">
                            <Agents />
                        </section>
                    </>
                ) : (
                    <Placeholder tab={tab} />
                )}
            </div>
        </Layout>
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
