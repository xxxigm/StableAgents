// Placeholder shell — replaced in commit 16 with the real Layout/Nav and
// in commits 17-19 with the page tree. We render a quick scaffold here
// so the build pipeline can be exercised end-to-end immediately.

export default function App() {
    return (
        <main className="grid h-full place-items-center">
            <div className="text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                    stableagents
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">Scaffolded.</h1>
                <p className="mt-2 text-sm text-zinc-400">
                    Run <code className="font-mono text-zinc-300">npm run dev</code> to start.
                </p>
            </div>
        </main>
    );
}
