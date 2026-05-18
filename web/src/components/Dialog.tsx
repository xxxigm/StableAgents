import { useEffect, type ReactNode } from "react";

interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    eyebrow?: string;
    children: ReactNode;
}

/**
 * Minimal headless modal. No portals, no animations, no focus traps —
 * everything ships in a single round-trip. If you need real a11y, swap
 * in radix-ui/react-dialog at the call sites; the prop shape matches.
 */
export function Dialog({ open, onClose, title, eyebrow, children }: DialogProps) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-lg border border-line bg-surface-1 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                    <div>
                        {eyebrow ? (
                            <p className="text-eyebrow uppercase text-zinc-500">{eyebrow}</p>
                        ) : null}
                        <h2 className="mt-0.5 text-base font-medium text-zinc-100">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded p-1 text-zinc-400 hover:bg-surface-2 hover:text-zinc-100"
                        aria-label="Close"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path
                                d="M3 3l8 8M11 3l-8 8"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </header>
                <div className="px-5 py-5">{children}</div>
            </div>
        </div>
    );
}
