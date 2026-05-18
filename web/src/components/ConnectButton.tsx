import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { arcTestnet } from "../lib/chains";

export function ConnectButton() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();
    const { switchChain } = useSwitchChain();

    if (!isConnected) {
        const metaMask = connectors.find((c) => c.id === "metaMask") ?? connectors[0];
        return (
            <button
                onClick={() => metaMask && connect({ connector: metaMask })}
                disabled={isPending || !metaMask}
                className="rounded-md border border-line bg-surface-1 px-3 py-1.5 text-sm font-medium hover:bg-surface-2 disabled:opacity-50"
            >
                {isPending ? "Connecting…" : "Connect wallet"}
            </button>
        );
    }

    if (chainId !== arcTestnet.id) {
        return (
            <button
                onClick={() => switchChain({ chainId: arcTestnet.id })}
                className="rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 text-sm font-medium text-rose-200 hover:bg-danger/20"
            >
                Switch to Arc Testnet
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className="hidden h-2 w-2 rounded-full bg-accent sm:inline-block" />
            <span className="tnum hidden text-xs text-zinc-400 sm:inline">
                {short(address ?? "")}
            </span>
            <button
                onClick={() => disconnect()}
                className="rounded-md border border-line bg-surface-1 px-3 py-1.5 text-xs text-zinc-300 hover:bg-surface-2"
            >
                Disconnect
            </button>
        </div>
    );
}

function short(addr: string) {
    if (!addr) return "";
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
