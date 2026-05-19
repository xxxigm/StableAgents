import { useEffect, useMemo, useState } from "react";
import { keccak256, stringToBytes } from "viem";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";

import { Dialog } from "./Dialog";
import { agentRegistryAbi } from "../lib/abi/agentRegistry";
import { jobEscrowAbi } from "../lib/abi/jobEscrow";
import { erc20Abi } from "../lib/abi/erc20";
import { contracts } from "../lib/contracts";
import { arcTestnet } from "../lib/chains";
import type { AgentRow } from "../hooks/useAgents";
import { formatBps, formatDuration, formatUsdc, shortAddr } from "../lib/format";

interface OpenJobDialogProps {
    open: boolean;
    onClose: () => void;
    agent: AgentRow | null;
    /** Called after a job is successfully opened — parent can switch tabs. */
    onJobOpened?: () => void;
}

export function OpenJobDialog({ open, onClose, agent, onJobOpened }: OpenJobDialogProps) {
    const { address } = useAccount();
    const chainId = useChainId();
    const onWrongChain = chainId !== arcTestnet.id;
    const [request, setRequest] = useState("");
    const { writeContractAsync, isPending } = useWriteContract();
    const [step, setStep] = useState<"compose" | "approving" | "opening" | "done">("compose");
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Reset form every time the dialog opens (new agent picked).
    useEffect(() => {
        if (open) {
            setRequest("");
            setStep("compose");
            setTxHash(null);
            setError(null);
        }
    }, [open]);

    // Pull live agent metadata in case the caller selected a stale row.
    const { data: live } = useReadContract({
        address: contracts.agentRegistry,
        abi: agentRegistryAbi,
        functionName: "getAgent",
        args: agent ? [BigInt(agent.id)] : undefined,
        query: { enabled: open && agent !== null },
    });

    const { data: allowance } = useReadContract({
        address: contracts.usdc,
        abi: erc20Abi,
        functionName: "allowance",
        args: address ? [address, contracts.jobEscrow] : undefined,
        query: { enabled: open && address !== undefined },
    });

    const { data: usdcBalance } = useReadContract({
        address: contracts.usdc,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        query: { enabled: open && address !== undefined },
    });

    const price = live?.pricePerJob ?? agent?.pricePerJob ?? 0n;
    const needsApproval = useMemo(
        () => (allowance ?? 0n) < price,
        [allowance, price],
    );
    const insufficientBalance = usdcBalance !== undefined && usdcBalance < price;

    if (!agent) return null;

    const requestHash =
        request.length > 0
            ? keccak256(stringToBytes(request))
            : ("0x" + "00".repeat(32)) as `0x${string}`;

    async function onSubmit() {
        if (!agent) return;
        setError(null);
        try {
            if (needsApproval) {
                setStep("approving");
                await writeContractAsync({
                    address: contracts.usdc,
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [contracts.jobEscrow, price],
                });
            }
            setStep("opening");
            const hash = await writeContractAsync({
                address: contracts.jobEscrow,
                abi: jobEscrowAbi,
                functionName: "openJob",
                args: [BigInt(agent.id), requestHash],
            });
            setTxHash(hash);
            setStep("done");
            onJobOpened?.();
        } catch (err) {
            console.error(err);
            const msg = (err as { shortMessage?: string }).shortMessage
                ?? (err as Error).message
                ?? "Transaction failed";
            setError(msg);
            setStep("compose");
        }
    }

    return (
        <Dialog
            open={open}
            onClose={() => {
                onClose();
                setStep("compose");
                setRequest("");
                setTxHash(null);
                setError(null);
            }}
            eyebrow={`agent #${agent.id} · ${shortAddr(agent.owner)}`}
            title="Open a job"
        >
            <dl className="grid grid-cols-3 gap-3 rounded-md border border-line bg-surface-0 p-3 text-sm">
                <Cell label="Price" value={`$${formatUsdc(price)}`} />
                <Cell label="SLA" value={formatDuration(agent.maxResponseTime)} />
                <Cell label="Slash on miss" value={formatBps(agent.slashBps)} />
            </dl>

            {/* Wallet USDC balance */}
            {usdcBalance !== undefined && (
                <p className="mt-2 text-right font-mono text-[11px] text-zinc-500">
                    Your balance:{" "}
                    <span className={insufficientBalance ? "text-red-400" : "text-zinc-300"}>
                        ${formatUsdc(usdcBalance)}
                    </span>
                    {" "}USDC
                </p>
            )}

            <label className="mt-4 block">
                <span className="text-eyebrow uppercase text-zinc-500">Request payload</span>
                <textarea
                    value={request}
                    onChange={(e) => setRequest(e.target.value)}
                    placeholder="Summarize this document…"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-line bg-surface-0 px-3 py-2 font-mono text-xs text-zinc-200 outline-none focus:border-line-strong"
                />
                <p className="mt-1 font-mono text-[10px] text-zinc-500">
                    requestHash = keccak256(payload) ={" "}
                    <span className="text-zinc-400">{requestHash.slice(0, 18)}…</span>
                </p>
            </label>

            {/* Wrong chain warning */}
            {onWrongChain && (
                <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    ⚠ Your wallet is not on Arc Testnet. Switch network in MetaMask before submitting.
                </p>
            )}

            {/* Insufficient balance */}
            {!onWrongChain && insufficientBalance && (
                <p className="mt-3 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                    ⚠ Insufficient USDC balance. You need ${formatUsdc(price)} USDC to open this job.
                    Get testnet USDC from the Arc faucet.
                </p>
            )}

            {/* Error message */}
            {error && (
                <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {error}
                </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
                <button
                    onClick={onClose}
                    className="rounded-md border border-line bg-surface-1 px-3 py-1.5 text-sm hover:bg-surface-2"
                >
                    Cancel
                </button>
                {step === "done" ? (
                    <a
                        href={`https://testnet.arcscan.app/tx/${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-zinc-900 hover:brightness-95"
                    >
                        View on ArcScan →
                    </a>
                ) : (
                    <button
                        onClick={onSubmit}
                        disabled={isPending || !address || onWrongChain || insufficientBalance}
                        className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
                    >
                        {step === "approving"
                            ? "Approving USDC…"
                            : step === "opening"
                              ? "Opening job…"
                              : needsApproval
                                ? "Approve & open"
                                : "Open job"}
                    </button>
                )}
            </div>
        </Dialog>
    );
}

function Cell({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-eyebrow uppercase text-zinc-500">{label}</p>
            <p className="tnum mt-1 text-zinc-100">{value}</p>
        </div>
    );
}
