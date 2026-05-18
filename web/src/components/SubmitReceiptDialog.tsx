import { useState } from "react";
import { keccak256, stringToBytes } from "viem";
import { useAccount, useSignTypedData, useWriteContract } from "wagmi";

import { Dialog } from "./Dialog";
import { jobEscrowAbi } from "../lib/abi/jobEscrow";
import { contracts, receiptDomain, receiptTypes } from "../lib/contracts";

interface SubmitReceiptDialogProps {
    open: boolean;
    onClose: () => void;
    jobId?: `0x${string}`;
}

/**
 * Two-step receipt flow:
 *   1. Sign an EIP-712 Receipt(jobId, responseHash) with the agent's
 *      signer key. The wallet displays each field by name so the operator
 *      audits exactly what is being attested.
 *   2. Anyone (in practice the agent's backend) submits the signature
 *      on-chain via JobEscrow.submitReceipt(jobId, responseHash, sig).
 *
 * The signer key and the on-chain caller can be different — the contract
 * verifies signer == registry.getAgent(agentId).signer, not msg.sender.
 */
export function SubmitReceiptDialog({ open, onClose, jobId }: SubmitReceiptDialogProps) {
    const { isConnected } = useAccount();
    const { signTypedDataAsync, isPending: signing } = useSignTypedData();
    const { writeContractAsync, isPending: submitting } = useWriteContract();

    const [responseText, setResponseText] = useState("");
    const [signature, setSignature] = useState<`0x${string}` | null>(null);
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

    if (!jobId) return null;

    const responseHash = (
        responseText.length > 0
            ? keccak256(stringToBytes(responseText))
            : "0x" + "00".repeat(32)
    ) as `0x${string}`;

    async function onSign() {
        const sig = await signTypedDataAsync({
            domain: receiptDomain,
            types: receiptTypes,
            primaryType: "Receipt",
            message: { jobId: jobId!, responseHash },
        });
        setSignature(sig);
    }

    async function onSubmit() {
        if (!signature) return;
        const hash = await writeContractAsync({
            address: contracts.jobEscrow,
            abi: jobEscrowAbi,
            functionName: "submitReceipt",
            args: [jobId!, responseHash, signature],
        });
        setTxHash(hash);
    }

    return (
        <Dialog
            open={open}
            onClose={() => {
                onClose();
                setResponseText("");
                setSignature(null);
                setTxHash(null);
            }}
            eyebrow="agent action"
            title="Submit receipt"
        >
            <div className="rounded-md border border-line bg-surface-0 p-3 font-mono text-[11px] text-zinc-400">
                <p>
                    jobId{" "}
                    <span className="text-zinc-200">{jobId.slice(0, 18)}…{jobId.slice(-6)}</span>
                </p>
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
                        disabled={!isConnected || signing}
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
                        disabled={!signature || submitting}
                        onClick={onSubmit}
                        className="rounded-md bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
                    >
                        {submitting ? "Submitting…" : "Submit"}
                    </button>
                </li>
            </ol>

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
