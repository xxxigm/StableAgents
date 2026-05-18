import type { Config } from "tailwindcss";

export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    darkMode: "class",
    theme: {
        extend: {
            // Fonts are wired in commit 16 alongside the design tokens.
            fontFamily: {
                sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "ui-monospace", "Menlo", "monospace"],
            },
        },
    },
    plugins: [],
} satisfies Config;
