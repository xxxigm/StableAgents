import { useEffect, useState } from "react";
import { useWriteContract } from "wagmi";

import { useActivity, type ActivityItem } from "../hooks/useActivity";
import { jobEscrowAbi } from "../lib/abi/jobEscrow";
import { contracts } from "../lib/contracts";
import { formatUsdc } from "../lib/format";

interface ActivityFeedProps {
    /** Called when the user clicks "Submit receipt" on an opened-and-still-pending
     *  job. Parent opens SubmitReceiptDialog with the jobId prefilled. */
    onSubmitReceipt?: (jobId: `0x${string}`) => void;
}

export function ActivityFeed({ onSubmitReceipt }: ActivityFeedProps) {
    const { data, isLoading } = useActivity();
    const items = data ?? [];

    // Tick once per second so deadline countdowns / "Claim timeout" enable
    // states are accurate without re-fetching logs.
    const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
    useEffect(() => {
        const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="rounded-lg border border-line bg-surface-1">
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
                <h3 className="text-eyebrow uppercase text-zinc-500">Live activity</h3>
                <span className="font-mono text-[10px] text-zinc-500">
                    last 50 events · refresh 8s
                </span>
            </header>
            {isLoading ? (
                <div className="space-y-2 p-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-5 animate-pulse rounded bg-surface-2" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-zinc-500">
                    No events in scan window.
                </div>
            ) : (
                <ol className="divide-y divide-line">
                    {items.map((item, i) => (
                        <li key={`${item.txHash}-${i}`} className="px-4 py-3">
                            <Row item={item} now={now} onSubmitReceipt={onSubmitReceipt} />
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

function Row({
    item,
    now,
    onSubmitReceipt,
}: {
    item: ActivityItem;
    now: number;
    onSubmitReceipt?: (jobId: `0x${string}`) => void;
}) {
    const dotTone =
        item.kind === "opened"
            ? "bg-zinc-400"
            : item.kind === "accepted"
              ? "bg-accent"
              : "bg-danger";

    const label =
        item.kind === "opened"
            ? "Job opened"
            : item.kind === "accepted"
              ? "Receipt accepted"
              : "Slashed";

    const isOpenAndPending = item.kind === "opened" && !item.closed;
    const deadline = item.deadline ?? 0;
    const pastDeadline = isOpenAndPending && now >= deadline;
    const secsLeft = isOpenAndPending && deadline > now ? deadline - now : 0;

    return (
        <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} />
            <span className="text-zinc-200">{label}</span>
            {item.kind !== "accepted" && item.agentId > 0n ? (
                <span className="tnum text-xs text-zinc-500">agent #{item.agentId.toString()}</span>
            ) : null}
            {isOpenAndPending ? (
                <span
                    className={`tnum text-[10px] font-mono ${
                        pastDeadline ? "text-danger" : "text-zinc-500"
                    }`}
                >
                    {pastDeadline ? "expired" : `${secsLeft}s left`}
                </span>
            ) : null}
            <span className="tnum ml-auto text-xs text-zinc-500">
                {item.amount ? `$${formatUsdc(item.amount)}` : ""}
            </span>
            {isOpenAndPending && onSubmitReceipt ? (
                <button
                    onClick={() => onSubmitReceipt(item.jobId)}
                    className="rounded-md border border-line bg-surface-1 px-2 py-1 text-[11px] hover:bg-surface-2"
                >
                    Submit receipt
                </button>
            ) : null}
            {isOpenAndPending && pastDeadline ? (
                <ClaimTimeoutButton jobId={item.jobId} />
            ) : null}
            <a
                href={`https://testnet.arcscan.app/tx/${item.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="tnum text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            >
                {item.txHash.slice(0, 10)}…
            </a>
        </div>
    );
}

function ClaimTimeoutButton({ jobId }: { jobId: `0x${string}` }) {
    const { writeContractAsync, isPending } = useWriteContract();
    const [claimed, setClaimed] = useState(false);

    async function onClaim() {
        try {
            await writeContractAsync({
                address: contracts.jobEscrow,
                abi: jobEscrowAbi,
                functionName: "claimTimeout",
                args: [jobId],
            });
            setClaimed(true);
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <button
            onClick={onClaim}
            disabled={isPending || claimed}
            className="rounded-md border border-danger/40 bg-surface-1 px-2 py-1 text-[11px] text-danger hover:bg-surface-2 disabled:opacity-50"
        >
            {claimed ? "Claimed" : isPending ? "Claiming…" : "Claim timeout"}
        </button>
    );
}
