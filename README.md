# StableAgents

**On-chain marketplace for accountable AI agents on Arc.**

Agents stake USDC to commit to a Service-Level Agreement. Callers pay per
job. Stake is automatically slashed when the SLA is missed — no arbiter,
no oracle, no off-chain dispute system.

Built on [Arc Testnet](https://docs.arc.io/arc-chain), Circle's
stablecoin-native L1 where USDC is the native gas token.

```
StableAgents/
├── src/                # Solidity contracts (Foundry)
│   ├── AgentRegistry.sol
│   ├── JobEscrow.sol
│   ├── CrossChainGateway.sol      (CCTP V2 inbound)
│   ├── X402Middleware.sol         (HTTP 402 → openJob)
│   ├── OneShotEnroll.sol          (mint ERC-8004 + stake in one tx)
│   └── interfaces/
├── test/               # Foundry tests (registry + escrow paths)
├── script/Deploy.s.sol # one-shot deploy of the full stack
├── web/                # Vite + React + TypeScript + Tailwind dApp
└── docs/               # ARCHITECTURE.md, DEPLOY.md, SECURITY.md
```

---

## Why this exists

AI agents are becoming economic actors. A planning agent calls a retrieval
agent. A research agent calls a summarization agent. A trading agent calls a
price-feed agent. Each of these is a paid API call between two autonomous
programs that have never met and have no reason to trust each other.

Today those calls happen through three bad options:

1. **Trust the provider.** Agent pays up front, hopes for a response. Breaks
   at scale.
2. **Trust a custodian.** Both parties deposit into a third-party escrow.
   Adds latency, adds a single point of failure, adds a fee.
3. **Trust a DAO.** Disputes go to human arbitration. Too slow for
   machine-speed transactions.

StableAgents is the fourth option: **trust the code.**

Providers stake USDC, commit to a max response time and slash percentage,
and sign an EIP-712 receipt when they fulfill a job. If they miss the
deadline, anyone can trigger the slash. The contract refunds the caller and
forwards a penalty from the provider's stake. All of this takes seconds on
Arc.

---

## How it works

```
┌─────────────────────┐        openJob(agentId, requestHash)
│   Caller (agent)    │ ─────────────────────────────────────► JobEscrow
└─────────────────────┘                                              │
                                                                     │ pull USDC
                                                                     │ mark pending
                                                                     ▼
                                                            ┌─────────────────┐
                                                            │  AgentRegistry  │
                                                            └─────────────────┘
                                                                     ▲
   Provider delivers off-chain                                       │
   Provider signs EIP-712 Receipt(jobId, responseHash)               │ bump completed
   Provider submits on-chain                                         │ (or bump slashed
                                                                     │  on claimTimeout)
┌─────────────────────┐    submitReceipt / claimTimeout              │
│ Provider (or anyone)│ ───────────────────────────────────► JobEscrow
└─────────────────────┘
```

### Stack

| Layer            | Tech                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| Smart contracts  | Solidity 0.8.24 + Foundry, OpenZeppelin v5.6, EIP-712 + ECDSA        |
| Identity (Arc)   | ERC-8004 IdentityRegistry at `0x8004…BD9e`                           |
| Cross-chain pay  | Circle CCTP V2 (MessageTransmitterV2 at `0xE737…E275`)               |
| HTTP pay         | x402 (HTTP 402 Payment Required) via `X402Middleware`                |
| Frontend         | Vite 5 + React 18 + TypeScript 5.5 + Tailwind 3.4                    |
| On-chain layer   | wagmi v2 + viem v2 + @tanstack/react-query                           |
| Design           | Minimalist dark (Linear/Vercel-inspired), Inter + JetBrains Mono     |

### Special features

- **EIP-712 typed receipts** — wallets render structured fields (`jobId`,
  `responseHash`) instead of an opaque hex blob. Replay-blocked at digest
  level.
- **Bayesian reputation** — `(completed + 2) / (completed + slashed + 3) * 100`.
  Fresh agents start at 66, not 100, so a single lucky job cannot pass for a
  long track record.
- **ERC-8004 binding** — `registerWithIdentity` requires the caller to own a
  canonical Arc agent identity NFT. `OneShotEnroll` mints + stakes in one tx.
- **CCTP V2 inbound** — `CrossChainGateway.handleReceiveFinalizedTransfer`
  decodes hookData, approves the escrow, and opens a job atomically when
  Circle mints USDC on Arc.
- **x402 bridge** — `X402Middleware.executePayment` pairs an HTTP 402
  payment with `JobEscrow.openJob` in a single transaction.

---

## Quickstart

### Prerequisites

```bash
# Foundry (contracts)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Node 18+ (web app)
node --version       # >= 18.18
```

### Install + build

```bash
git clone https://github.com/<you>/stableagents
cd stableagents
git submodule update --init --recursive

# contracts
forge build
forge test -vv

# web
cd web
npm install
npm run dev          # http://localhost:5173
```

### Deploy to Arc Testnet

```bash
cp .env.example .env
# Fill USDC_ADDRESS (0x3600...0000) and ARC_TESTNET_RPC_URL

cast wallet import deployer --interactive    # one-time, encrypted keystore
source .env

forge script script/Deploy.s.sol:Deploy \
  --account deployer \
  --sender 0xYOUR_DEPLOYER \
  --rpc-url arc_testnet \
  --broadcast
```

The script deploys five contracts and wires `setJobEscrow` in a single
broadcast. Arc's sub-second finality means the whole script settles in
well under five seconds.

After the script prints the five addresses, paste them into
`web/src/lib/contracts.ts` and restart `npm run dev`.

See [`docs/DEPLOY.md`](./docs/DEPLOY.md) for the full walkthrough.

---

## License

MIT. Not affiliated with Circle, Arc, or any project mentioned above.
