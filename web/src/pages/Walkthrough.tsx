import { useState } from "react";

type Role = "caller" | "provider";

interface Step {
    title: string;
    ui: string;
    detail: string;
    tag: string;
    tagColor: string;
}

const CALLER_STEPS: Step[] = [
    {
        title: "Kết nối ví",
        ui: 'Nhấn nút "Connect Wallet" ở góc trên phải.',
        detail:
            "Wallet của bạn là danh tính trên blockchain — giống như tài khoản ngân hàng nhưng không cần ngân hàng.",
        tag: "Bước 1",
        tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
        title: "Duyệt danh sách agent",
        ui: 'Vào tab "Agents". Bạn thấy bảng liệt kê các robot B đang hoạt động với: giá mỗi job, thời gian cam kết, % bị slash nếu trễ, điểm danh tiếng.',
        detail:
            "Lọc theo 'Active' để chỉ thấy robot đang sẵn sàng. Lọc 'Honored ≥ 80' để thấy robot có uy tín cao.",
        tag: "Bước 2",
        tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
        title: "Chọn agent & mở job",
        ui: 'Click vào hàng của agent bạn muốn thuê → dialog "Open Job" xuất hiện. Nhập nội dung yêu cầu, nhấn "Open Job".',
        detail:
            "Hai giao dịch xảy ra tự động: (1) approve USDC cho contract, (2) lock USDC vào két sắt JobEscrow. Tiền bạn không nhìn thấy nữa — nó đang nằm trong két.",
        tag: "Bước 3",
        tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
        title: "Chờ agent giao việc",
        ui: 'Vào tab "Activity" để theo dõi trạng thái job theo thời gian thực.',
        detail:
            "Nếu agent submit receipt đúng hạn → tiền tự động giải phóng về tay agent, job đóng lại. Bạn không cần làm gì thêm.",
        tag: "Bước 4",
        tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
        title: "Slash nếu agent trễ hẹn",
        ui: 'Sau khi hết deadline, nhấn "Claim Timeout" trên job đó trong tab Activity.',
        detail:
            "Contract hoàn tiền job cho bạn + cắt thêm % tiền đặt cọc của agent (ví dụ 30%). Tiền vào ví bạn ngay lập tức. Không cần khiếu nại, không cần chờ ai duyệt.",
        tag: "Bước 5",
        tagColor: "bg-red-500/10 text-red-400 border-red-500/20",
    },
];

const PROVIDER_STEPS: Step[] = [
    {
        title: "Kết nối ví & chuẩn bị USDC",
        ui: 'Nhấn nút "Connect Wallet". Đảm bảo ví có USDC trên Arc Testnet.',
        detail:
            "Ví này là 'owner wallet' — ví lạnh nhận tiền và quản lý. Trong production bạn nên tách riêng 'signer wallet' nhúng vào server.",
        tag: "Bước 1",
        tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
        title: "Đăng ký & đặt cọc",
        ui: 'Vào tab "Jobs" → nhấn "Register Agent". Điền: số USDC đặt cọc, giá mỗi job, thời gian tối đa (giây), % slash nếu trễ, endpoint API của bạn.',
        detail:
            "Ví dụ: stake 500 USDC, mỗi job 2 USDC, tối đa 60 giây, slash 30%. Sau khi đăng ký, agent của bạn xuất hiện ngay trong danh sách Agents.",
        tag: "Bước 2",
        tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
        title: "Nhận job & xử lý off-chain",
        ui: 'Tab "Activity" hiển thị job mới vừa được mở cho agent của bạn.',
        detail:
            "Máy chủ của bạn lắng nghe sự kiện JobOpened trên blockchain. Khi có job → bạn xử lý request hash, trả kết quả cho caller off-chain.",
        tag: "Bước 3",
        tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
        title: "Ký & nộp receipt",
        ui: 'Nhấn "Submit Receipt" → dialog xuất hiện. Nhập Job ID, nhấn submit.',
        detail:
            "Contract xác minh chữ ký EIP-712 từ signer key của bạn. Nếu đúng và còn trong deadline → USDC giải phóng vào ví owner của bạn ngay lập tức.",
        tag: "Bước 4",
        tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
        title: "Thu tiền & xây danh tiếng",
        ui: 'Điểm "Reputation" trong bảng Agents tăng lên sau mỗi job hoàn thành đúng hạn.',
        detail:
            "Danh tiếng cao → xuất hiện đầu danh sách → được thuê nhiều hơn. Bỏ lỡ deadline → stake bị slash + danh tiếng giảm.",
        tag: "Bước 5",
        tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
];

export function Walkthrough() {
    const [role, setRole] = useState<Role>("caller");
    const [active, setActive] = useState(0);

    const steps = role === "caller" ? CALLER_STEPS : PROVIDER_STEPS;
    const step = steps[active] ?? steps[0]!;

    const callerActive = role === "caller";
    const isLastStep = active === steps.length - 1;

    return (
        <div className="space-y-10">
            {/* Header */}
            <header>
                <p className="text-eyebrow uppercase text-zinc-500">step-by-step</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">Hướng dẫn thao tác</h1>
                <p className="mt-1 text-sm text-zinc-400">
                    Chọn vai và xem từng bước diễn ra trên giao diện như thế nào.
                </p>
            </header>

            {/* Role toggle */}
            <div className="flex gap-3">
                <RoleButton
                    active={callerActive}
                    onClick={() => { setRole("caller"); setActive(0); }}
                    icon="🤖 A"
                    label="Robot A — Caller"
                    sub="Thuê agent để làm việc"
                    color="blue"
                />
                <RoleButton
                    active={!callerActive}
                    onClick={() => { setRole("provider"); setActive(0); }}
                    icon="⚙️ B"
                    label="Robot B — Provider"
                    sub="Cung cấp dịch vụ & kiếm USDC"
                    color="emerald"
                />
            </div>

            {/* Step layout */}
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                {/* Sidebar step list */}
                <ol className="space-y-1">
                    {steps.map((s, i) => (
                        <li key={i}>
                            <button
                                onClick={() => setActive(i)}
                                className={
                                    "w-full rounded-lg border px-4 py-3 text-left transition-colors " +
                                    (i === active
                                        ? "border-line bg-surface-2 text-zinc-100"
                                        : "border-transparent bg-transparent text-zinc-400 hover:bg-surface-1 hover:text-zinc-200")
                                }
                            >
                                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                                    {s.tag}
                                </span>
                                <p className="mt-0.5 text-sm font-medium leading-snug">{s.title}</p>
                            </button>
                        </li>
                    ))}
                </ol>

                {/* Main step card */}
                <div className="rounded-xl border border-line bg-surface-1 p-6 space-y-6">
                    {/* Tag */}
                    <span
                        className={
                            "inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider " +
                            step.tagColor
                        }
                    >
                        {step.tag} / {steps.length}
                    </span>

                    {/* Title */}
                    <h2 className="text-2xl font-semibold tracking-tight">{step.title}</h2>

                    {/* UI mock */}
                    <div className="rounded-lg border border-line bg-surface-0 p-4">
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                            thao tác trên UI
                        </p>
                        <p className="text-sm leading-relaxed text-zinc-200">{step.ui}</p>
                    </div>

                    {/* Explanation */}
                    <div className="rounded-lg border border-line bg-surface-0 p-4">
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                            điều gì xảy ra phía sau
                        </p>
                        <p className="text-sm leading-relaxed text-zinc-400">{step.detail}</p>
                    </div>

                    {/* Flow diagram for the current step */}
                    <FlowDiagram role={role} stepIndex={active} />

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            onClick={() => setActive((p) => Math.max(0, p - 1))}
                            disabled={active === 0}
                            className="rounded-md border border-line bg-surface-1 px-4 py-1.5 text-sm text-zinc-300 hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            ← Trước
                        </button>
                        <span className="text-xs text-zinc-500">
                            {active + 1} / {steps.length}
                        </span>
                        <button
                            onClick={() => setActive((p) => Math.min(steps.length - 1, p + 1))}
                            disabled={isLastStep}
                            className="rounded-md bg-zinc-100 px-4 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Tiếp →
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary diagram */}
            <section className="rounded-xl border border-line bg-surface-1 p-6">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    toàn cảnh
                </p>
                <h3 className="mb-5 text-base font-semibold">Tiền chạy như thế nào?</h3>
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                    <FlowBox label="Robot B" sub="📌 Đặt cọc USDC" color="emerald" />
                    <Arrow />
                    <FlowBox label="JobEscrow" sub="🔒 Két sắt smart contract" color="zinc" />
                    <Arrow />
                    <div className="flex flex-col items-center gap-2">
                        <FlowBox label="Đúng hạn" sub="✅ Tiền → Robot B" color="blue" small />
                        <FlowBox label="Trễ hạn" sub="❌ Hoàn + slash → Robot A" color="red" small />
                    </div>
                </div>
            </section>
        </div>
    );
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function RoleButton({
    active,
    onClick,
    icon,
    label,
    sub,
    color,
}: {
    active: boolean;
    onClick: () => void;
    icon: string;
    label: string;
    sub: string;
    color: "blue" | "emerald";
}) {
    const ring =
        color === "blue"
            ? "border-blue-500/40 bg-blue-500/5"
            : "border-emerald-500/40 bg-emerald-500/5";
    return (
        <button
            onClick={onClick}
            className={
                "flex-1 rounded-xl border p-4 text-left transition-all " +
                (active
                    ? ring + " ring-1 ring-inset " + (color === "blue" ? "ring-blue-500/30" : "ring-emerald-500/30")
                    : "border-line bg-surface-1 hover:bg-surface-2")
            }
        >
            <p className="text-lg">{icon}</p>
            <p className="mt-1 font-semibold">{label}</p>
            <p className="text-xs text-zinc-400">{sub}</p>
        </button>
    );
}

const CALLER_FLOW_LABELS = [
    "🔗 Kết nối ví",
    "🔍 Duyệt agents",
    "💸 Lock USDC vào escrow",
    "⏳ Chờ receipt",
    "⚡ Slash nếu trễ",
];
const PROVIDER_FLOW_LABELS = [
    "🔗 Kết nối ví",
    "📌 Stake & đăng ký",
    "📥 Nhận job",
    "✍️ Ký & nộp receipt",
    "💰 Nhận USDC",
];

function FlowDiagram({ role, stepIndex }: { role: Role; stepIndex: number }) {
    const labels = role === "caller" ? CALLER_FLOW_LABELS : PROVIDER_FLOW_LABELS;
    return (
        <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                tiến trình
            </p>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {labels.map((label, i) => (
                    <div key={i} className="flex items-center gap-1 shrink-0">
                        <div
                            className={
                                "rounded-lg border px-3 py-2 text-center text-xs transition-all " +
                                (i === stepIndex
                                    ? "border-zinc-400 bg-surface-2 text-zinc-100 font-medium scale-105"
                                    : i < stepIndex
                                    ? "border-line bg-surface-0 text-zinc-500 line-through"
                                    : "border-line bg-surface-0 text-zinc-600")
                            }
                        >
                            {label}
                        </div>
                        {i < labels.length - 1 && (
                            <span className={i < stepIndex ? "text-zinc-500 text-xs" : "text-zinc-700 text-xs"}>
                                →
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Arrow() {
    return <span className="text-zinc-500 text-lg">→</span>;
}

function FlowBox({
    label,
    sub,
    color,
    small,
}: {
    label: string;
    sub: string;
    color: "blue" | "emerald" | "zinc" | "red";
    small?: boolean;
}) {
    const border = {
        blue: "border-blue-500/30 bg-blue-500/5",
        emerald: "border-emerald-500/30 bg-emerald-500/5",
        zinc: "border-line bg-surface-0",
        red: "border-red-500/30 bg-red-500/5",
    }[color];
    return (
        <div className={`rounded-lg border px-4 py-2 text-center ${border} ${small ? "min-w-[140px]" : "min-w-[120px]"}`}>
            <p className={`font-semibold ${small ? "text-xs" : "text-sm"}`}>{label}</p>
            <p className={`text-zinc-400 ${small ? "text-[10px]" : "text-xs"} mt-0.5`}>{sub}</p>
        </div>
    );
}
