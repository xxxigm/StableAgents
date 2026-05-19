import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useWriteContract, useReadContract } from "wagmi";

import { Dialog } from "./Dialog";
import { agentRegistryAbi } from "../lib/abi/agentRegistry";
import { erc20Abi } from "../lib/abi/erc20";
import { contracts } from "../lib/contracts";

interface RegisterAgentDialogProps {
    open: boolean;
    onClose: () => void;
}

type Step = "form" | "approving" | "registering" | "done";

export function RegisterAgentDialog({ open, onClose }: RegisterAgentDialogProps) {
    const { address, isConnected } = useAccount();
    const { writeContractAsync, isPending } = useWriteContract();

    const [step, setStep] = useState<Step>("form");
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form fields
    const [signer, setSigner] = useState("");
    const [stake, setStake] = useState("");
    const [price, setPrice] = useState("");
    const [maxTime, setMaxTime] = useState("60");
    const [slashPct, setSlashPct] = useState("30");
    const [endpoint, setEndpoint] = useState("");

    const stakeAmount = parseUsdc(stake);
    const priceAmount = parseUsdc(price);
    const slashBps = Math.round(parseFloat(slashPct || "0") * 100);
    const maxResponseTime = parseInt(maxTime || "0");

    const { data: allowance } = useReadContract({
        address: contracts.usdc,
        abi: erc20Abi,
        functionName: "allowance",
        args: address ? [address, contracts.agentRegistry] : undefined,
        query: { enabled: open && !!address },
    });

    const { data: minStake } = useReadContract({
        address: contracts.agentRegistry,
        abi: agentRegistryAbi,
        functionName: "minStake",
        query: { enabled: open },
    });

    const { data: existingAgentId } = useReadContract({
        address: contracts.agentRegistry,
        abi: agentRegistryAbi,
        functionName: "agentIdOf",
        args: address ? [address] : undefined,
        query: { enabled: open && !!address },
    });

    const alreadyRegistered = !!existingAgentId && existingAgentId > 0n;
    const minStakeUsdc = minStake ? Number(minStake) / 1e6 : 10;
    const belowMinStake = stakeAmount > 0n && minStake !== undefined && stakeAmount < minStake;
    const belowMinTime = maxResponseTime > 0 && maxResponseTime < 5;
    const needsApproval = stakeAmount > 0n && (allowance ?? 0n) < stakeAmount;

    const signerAddr = signer.trim() as `0x${string}`;
    const isValidSigner = /^0x[0-9a-fA-F]{40}$/.test(signerAddr);
    const canSubmit =
        isConnected &&
        !alreadyRegistered &&
        isValidSigner &&
        stakeAmount > 0n &&
        !belowMinStake &&
        priceAmount > 0n &&
        maxResponseTime >= 5 &&
        !belowMinTime &&
        slashBps >= 0 &&
        slashBps <= 10_000 &&
        endpoint.trim().length > 0 &&
        step === "form" &&
        !isPending;

    function reset() {
        setSigner(""); setStake(""); setPrice("");
        setMaxTime("60"); setSlashPct("30"); setEndpoint("");
        setStep("form"); setTxHash(null); setError(null);
    }

    function handleClose() {
        reset();
        onClose();
    }

    async function onSubmit() {
        if (!canSubmit) return;
        setError(null);
        try {
            if (needsApproval) {
                setStep("approving");
                await writeContractAsync({
                    address: contracts.usdc,
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [contracts.agentRegistry, stakeAmount],
                });
            }
            setStep("registering");
            const hash = await writeContractAsync({
                address: contracts.agentRegistry,
                abi: agentRegistryAbi,
                functionName: "register",
                args: [
                    signerAddr,
                    stakeAmount,
                    priceAmount,
                    maxResponseTime,
                    slashBps,
                    endpoint.trim(),
                ],
            });
            setTxHash(hash);
            setStep("done");
        } catch (err) {
            setError((err as { shortMessage?: string }).shortMessage ?? (err as Error).message ?? "Transaction failed");
            setStep("form");
        }
    }

    return (
        <Dialog open={open} onClose={handleClose} eyebrow="provider" title="Register Agent">
            {step === "done" ? (
                <div className="space-y-4">
                    <p className="text-sm text-zinc-300">
                        ✅ Agent registered successfully! USDC has been staked into the contract.
                    </p>
                    {txHash && (
                        <p className="break-all font-mono text-xs text-zinc-500">tx: {txHash}</p>
                    )}
                    <button
                        onClick={handleClose}
                        className="w-full rounded-md bg-zinc-100 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
                    >
                        Close
                    </button>
                </div>
            ) : (
                <form
                    onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
                    className="space-y-4"
                >
                    <Field label="Signer address" hint="Hot-key address embedded in your server">
                        <input
                            type="text"
                            placeholder="0x..."
                            value={signer}
                            onChange={(e) => setSigner(e.target.value)}
                            className={inputCls + (!signer || isValidSigner ? "" : " border-red-500/60")}
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-3 items-end">
                        <Field label="Stake (USDC)">
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="e.g. 100"
                                value={stake}
                                onChange={(e) => setStake(e.target.value)}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Price per job (USDC)">
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="e.g. 1"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-end">
                        <Field label="Max response time (sec)">
                            <input
                                type="number"
                                min="1"
                                placeholder="e.g. 60"
                                value={maxTime}
                                onChange={(e) => setMaxTime(e.target.value)}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Slash on timeout (%)">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                placeholder="e.g. 30"
                                value={slashPct}
                                onChange={(e) => setSlashPct(e.target.value)}
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <Field label="Endpoint URL" hint="Your agent's API endpoint">
                        <input
                            type="url"
                            placeholder="https://my-agent.example.com/run"
                            value={endpoint}
                            onChange={(e) => setEndpoint(e.target.value)}
                            className={inputCls}
                        />
                    </Field>

                    {/* Info row */}
                    <div className="rounded-md bg-surface-0 px-3 py-2 text-xs text-zinc-400 space-y-0.5">
                        <p>Minimum stake: <span className="text-zinc-200">{minStakeUsdc} USDC</span></p>
                        <p>Slash on timeout: <span className="text-zinc-200">{slashBps / 100}%</span> of stake</p>
                        {needsApproval && (
                            <p className="text-amber-400">⚠ Tx 1: approve USDC · Tx 2: register</p>
                        )}
                    </div>

                    {alreadyRegistered && (
                        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                            ⚠ This wallet is already registered as agent #{existingAgentId!.toString()}. Each address can only register once.
                        </p>
                    )}
                    {belowMinStake && (
                        <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
                            Stake must be at least {minStakeUsdc} USDC.
                        </p>
                    )}
                    {belowMinTime && (
                        <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
                            Max response time must be at least 5 seconds.
                        </p>
                    )}

                    {error && (
                        <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full rounded-md bg-zinc-100 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {step === "approving"
                            ? "Approving USDC…"
                            : step === "registering"
                            ? "Registering…"
                            : needsApproval
                            ? "Approve & Register"
                            : "Register Agent"}
                    </button>
                </form>
            )}
        </Dialog>
    );
}

function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-400">
                {label}
                {hint && <span className="ml-1 text-zinc-600">· {hint}</span>}
            </label>
            {children}
        </div>
    );
}

const inputCls =
    "w-full rounded-md border border-line bg-surface-0 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500";

function parseUsdc(val: string): bigint {
    try {
        const n = parseFloat(val);
        if (isNaN(n) || n < 0) return 0n;
        return parseUnits(val, 6);
    } catch {
        return 0n;
    }
}
