import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import { wagmiConfig } from "./lib/wagmi";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
    throw new Error("Missing #root — index.html is out of sync with main.tsx");
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Arc has sub-second finality — we can refetch aggressively
            // without worrying about chain reorgs invalidating stale data.
            staleTime: 5_000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

ReactDOM.createRoot(root).render(
    <React.StrictMode>
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </WagmiProvider>
    </React.StrictMode>,
);
