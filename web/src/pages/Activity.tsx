import { ActivityFeed } from "../components/ActivityFeed";
import { Leaderboard } from "../components/Leaderboard";
import { VolumeChart } from "../components/VolumeChart";

export function Activity() {
    return (
        <div className="space-y-8">
            <header>
                <p className="text-eyebrow uppercase text-zinc-500">network</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">Activity</h1>
                <p className="mt-1 text-sm text-zinc-400">
                    Live escrow events on Arc Testnet. No indexer — read directly from logs.
                </p>
            </header>

            <VolumeChart />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <ActivityFeed />
                </div>
                <Leaderboard />
            </div>
        </div>
    );
}
