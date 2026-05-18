import type { Config } from "tailwindcss";

export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    darkMode: "class",
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "ui-monospace", "Menlo", "monospace"],
            },
            colors: {
                // Surface scale — backgrounds layered with subtle contrast.
                surface: {
                    0: "rgb(9 9 11)", // page
                    1: "rgb(15 15 18)", // card
                    2: "rgb(24 24 27)", // hover / inset
                },
                // Line scale — borders and rules.
                line: {
                    DEFAULT: "rgb(39 39 42)",
                    strong: "rgb(63 63 70)",
                },
                // Accent — single hue, only used for interactive affordance
                // and the SLA "honor" indicator. Intentionally muted so the
                // page stays mono-feeling.
                accent: {
                    DEFAULT: "rgb(132 204 22)", // lime-500
                    soft: "rgb(132 204 22 / 0.12)",
                },
                danger: {
                    DEFAULT: "rgb(244 63 94)", // rose-500
                    soft: "rgb(244 63 94 / 0.12)",
                },
            },
            boxShadow: {
                ring: "0 0 0 1px rgb(39 39 42)",
                inset: "inset 0 0 0 1px rgb(39 39 42)",
            },
            letterSpacing: {
                eyebrow: "0.14em",
            },
            fontSize: {
                eyebrow: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.14em" }],
            },
        },
    },
    plugins: [],
} satisfies Config;
