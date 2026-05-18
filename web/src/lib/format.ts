/**
 * Tiny formatting helpers shared across the UI. Pure functions, no
 * dependencies — keep them tree-shake-friendly.
 */

/** "0x12ab…cdef" — for table cells and inline references. */
export function shortAddr(addr?: string | null) {
    if (!addr || addr.length < 10) return addr ?? "—";
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Format a USDC base-units value (6 decimals) as a USD string. */
export function formatUsdc(value: bigint | number, opts: { digits?: number } = {}) {
    const digits = opts.digits ?? 2;
    const v = typeof value === "bigint" ? value : BigInt(value);
    const whole = v / 1_000_000n;
    const frac = v % 1_000_000n;
    const fracStr = frac.toString().padStart(6, "0").slice(0, digits);
    return `${whole.toString()}.${fracStr}`;
}

/** "12s", "1m 30s", "1h 12m" — for SLA windows shown in tables. */
export function formatDuration(seconds: number) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return s ? `${m}m ${s}s` : `${m}m`;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
}

/** "20%" — slashBps is in 1/10000ths. */
export function formatBps(bps: number) {
    return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}
