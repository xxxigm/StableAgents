import { useEffect, useMemo, useState } from "react";
import { keccak256, stringToBytes } from "viem";
import { useAccount, useSignTypedData, useWriteContract } from "wagmi";

import { Dialog } from "./Dialog";
import { jobEscrowAbi } from "../lib/abi/jobEscrow";
import { contracts, receiptDomain, receiptTypes } from "../lib/contracts";

interface SubmitReceiptDialogProps {
    open: boolean;
    onClose: () => void;
    /** Prefilled value when the dialog opens (from clicking a row in
     *  ActivityFeed). User can still edit / paste another jobId. */
    initialJobId?: `0x${string}`;
}

const JOB_ID_REGEX = /^0x[0-9a-fA-F]{64}$/;

export function SubmitReceiptDialog({ open, onClose, initialJobId }: SubmitReceiptDialogProps) {
    const { isConnected } = useAccount();
    const { signTypedDataAsync, isPending: signing } = useSignTypedData();
    const { writeContractAsync, isPending: submitting } = useWriteContract();

    const [jobIdInput, setJobIdInput] = useState("");
    const [responseText, setResponseText] = useState("");
    const [signature, setSignature] = useState<`0x${string}` | null>(null);
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && initialJobId) {
            setJobIdInput(initialJobId);
        }
    }, [open, initialJobId]);

    const trimmedJobId = jobIdInput.trim();
    const jobId: `0x${string}` | undefined = JOB_ID_REGEX.test(trimmedJobId)
        ? (trimmedJobId as `0x${string}`)
        : undefined;

    const responseHash = useMemo(
        () =>
            (responseText.length > 0
                ? keccak256(stringToBytes(responseText))
                : "0x" + "00".repeat(32)) as `0x${string}`,
        [responseText],
    );

    function reset() {
        setJobIdInput("");
        setResponseText("");
        setSignature(null);
        setTxHash(null);
        setError(null);
    }

    async function onSign() {
        if (!jobId) return;
        setError(null);
        try {
            const sig = await signTypedDataAsync({
                domain: receiptDomain,
                types: receiptTypes,
                primaryType: "Receipt",
                message: { jobId, responseHash },
            });
            setSignature(sig);
        } catch (err) {
            setError((err as Error).message ?? "Sign failed");
        }
    }

    async function onSubmit() {
        if (!signature || !jobId) return;
        setError(null);
        try {
            const hash = await writeContractAsync({
                address: contracts.jobEscrow,
                abi: jobEscrowAbi,
                functionName: "submitReceipt",
                args: [jobId, responseHash, signature],
            });
            setTxHash(hash);
        } catch (err) {
            setError((err as Error).message ?? "Submit failed");
        }
    }

    return (
        <Dialog
            open={open}
            onClose={() => {
                onClose();
                reset();
            }}
            eyebrow="agent action"
            title="Submit receipt"
        >
            <label className="block">
                <span className="text-eyebrow uppercase text-zinc-500">Job ID</span>
                <input
                    value={jobIdInput}
                    onChange={(e) => setJobIdInput(e.target.value)}
                    placeholder="0x… (64 hex chars, paste from Activity feed)"
                    spellCheck={false}
                    className="mt-1 w-full rounded-md border border-line bg-surface-0 px-3 py-2 font-mono text-xs text-zinc-200 outline-none focus:border-line-strong"
                />
                {jobIdInput.length > 0 && !jobId ? (
                    <p className="mt-1 font-mono text-[10px] text-danger">
                        not a valid bytes32 — expected 0x + 64 hex chars
                    </p>
                ) : null}
            </label>

            <div className="mt-4 rounded-md border border-line bg-surface-0 p-3 font-mono text-[11px] text-zinc-400">
                <p>
                    responseHash <span className="text-zinc-200">{responseHash.slice(0, 18)}…</span>
                </p>
                <p>
                    domain{" "}
                    <span className="text-zinc-200">
                        {receiptDomain.name} v{receiptDomain.version}
                    </span>
                </p>
            </div>

            <label className="mt-4 block">
                <span className="text-eyebrow uppercase text-zinc-500">Response payload</span>
                <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="The summary the agent returned to the caller…"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-line bg-surface-0 px-3 py-2 font-mono text-xs text-zinc-200 outline-none focus:border-line-strong"
                />
            </label>

            <ol className="mt-5 space-y-2 text-sm">
                <li className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-0 px-3 py-2">
                    <span className="text-zinc-300">
                        <span className="tnum text-zinc-500">1.</span> Sign EIP-712 receipt
                    </span>
                    <button
                        disabled={!isConnected || !jobId || signing}
                        onClick={onSign}
                        className="rounded-md border border-line bg-surface-1 px-3 py-1 text-xs hover:bg-surface-2 disabled:opacity-50"
                    >
                        {signature ? "Re-sign" : signing ? "Signing…" : "Sign"}
                    </button>
                </li>
                <li className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-0 px-3 py-2">
                    <span className="text-zinc-300">
                        <span className="tnum text-zinc-500">2.</span> Submit on-chain
                    </span>
                    <button
                        disabled={!signature || !jobId || submitting}
                        onClick={onSubmit}
                        className="rounded-md bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
                    >
                        {submitting ? "Submitting…" : "Submit"}
                    </button>
                </li>
            </ol>

            {error ? (
                <p className="mt-3 font-mono text-[10px] text-danger break-words">{error}</p>
            ) : null}

            {txHash ? (
                <p className="mt-4 text-xs text-zinc-400">
                    Receipt accepted ·{" "}
                    <a
                        href={`https://testnet.arcscan.app/tx/${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent underline-offset-2 hover:underline"
                    >
                        view tx →
                    </a>
                </p>
            ) : null}
        </Dialog>
    );
}
