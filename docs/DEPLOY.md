# Deployment guide

End-to-end recipe for deploying StableAgents to Arc Testnet.

---

## 1. Fund the deployer wallet with USDC

Arc charges gas in USDC. Open [`faucet.circle.com`](https://faucet.circle.com),
choose **Arc Testnet**, paste the deployer address, and request 20 USDC.
Deploy spends ~1 USDC of gas; 20 USDC is comfortable.

## 2. Import the deployer key into the Foundry keystore

```bash
cast wallet import deployer --interactive
```

You will be asked for the private key (paste, no echo) and a password
(remember it — every deploy will prompt). The encrypted keystore lives at
`~/.foundry/keystores/deployer`.

To remove it later: `rm ~/.foundry/keystores/deployer`.

## 3. Fill `.env`

```bash
cp .env.example .env
```

At minimum:

```
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
USDC_ADDRESS=0x3600000000000000000000000000000000000000
```

The `AGENT_REGISTRY_ADDRESS` / `JOB_ESCROW_ADDRESS` / etc lines stay empty
until step 5.

## 4. Dry-run

```bash
source .env

forge script script/Deploy.s.sol:Deploy \
  --account deployer \
  --sender 0xYOUR_DEPLOYER \
  --rpc-url arc_testnet
```

(no `--broadcast`). Expected output:

```
Deployer            : 0xYOUR_DEPLOYER
USDC                : 0x3600000000000000000000000000000000000000
Min stake (6 dec)   : 10000000
AgentRegistry       : 0x... (preview)
JobEscrow           : 0x... (preview)
Wired JobEscrow -> AgentRegistry
CrossChainGateway   : 0x... (preview)
X402Middleware      : 0x... (preview)
OneShotEnroll       : 0x... (preview)
```

Green-light checklist:

- Deployer address is correct
- USDC is `0x3600...0000`
- "Wired JobEscrow -> AgentRegistry" line is present

## 5. Real deploy

```bash
forge script script/Deploy.s.sol:Deploy \
  --account deployer \
  --sender 0xYOUR_DEPLOYER \
  --rpc-url arc_testnet \
  --broadcast
```

Five contract deploys + one `setJobEscrow` call land in a single
broadcast batch. Because Arc has sub-second deterministic finality, the
whole script settles in 3-5 seconds.

Copy the five addresses from the script output and paste them into:

- `.env` (`AGENT_REGISTRY_ADDRESS`, `JOB_ESCROW_ADDRESS`, ...)
- `web/src/lib/contracts.ts` (the `contracts.*` placeholders)

The web app reads `contracts.ts` at build time — restart `npm run dev`
after the edit.

## 6. Smoke test

```bash
source .env

# admin is the deployer?
cast call $AGENT_REGISTRY_ADDRESS "admin()(address)" --rpc-url arc_testnet

# jobEscrow is wired to the right address?
cast call $AGENT_REGISTRY_ADDRESS "jobEscrow()(address)" --rpc-url arc_testnet

# escrow knows its registry?
cast call $JOB_ESCROW_ADDRESS "registry()(address)" --rpc-url arc_testnet
```

Expected:

1. = deployer address
2. = `JOB_ESCROW_ADDRESS`
3. = `AGENT_REGISTRY_ADDRESS`

If all three match, the deploy is wired correctly.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `signer is not authorized` | `--sender` does not match the keystore address | `cast wallet list` to confirm |
| `insufficient funds` | Deployer needs more USDC for gas | Faucet for more USDC |
| `no such keystore` | Skipped step 2 | Re-run `cast wallet import deployer --interactive` |
| `EvmError: InvalidFEOpcode` | Solc 0.8.24 + Arc opcode mismatch | Set `solc_version = "0.8.20"` in `foundry.toml`, then `forge clean && forge build` |
| Dry-run OK but `--broadcast` hangs | Slow RPC | Wait 30s, Ctrl-C, retry |
