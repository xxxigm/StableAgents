import { useState } from "react";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";

export default function App() {
    // Tiny in-memory router — react-router would be overkill for three tabs.
    const [tab, setTab] = useState("agents");

    return (
        <Layout active={tab} onSelect={setTab}>
            {tab === "agents" ? (
                <Home />
            ) : (
                <Placeholder tab={tab} />
            )}
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
