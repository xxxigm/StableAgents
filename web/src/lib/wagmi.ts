import { http, createConfig } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";

import { arcTestnet } from "./chains";

/**
 * Single wagmi config shared by every component in the app.
 *
 * We deliberately stay on injected + MetaMask connectors only — the dApp
 * never needs WalletConnect or social login for the agent operator
 * audience, and keeping the connector list short keeps the connect modal
 * one decision tall.
 */
export const wagmiConfig = createConfig({
    chains: [arcTestnet],
    connectors: [injected({ shimDisconnect: true }), metaMask()],
    transports: {
        [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
    },
    ssr: false,
});

declare module "wagmi" {
    interface Register {
        config: typeof wagmiConfig;
    }
}
