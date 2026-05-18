# Security notes

Phase-1 testnet release. Not audited. Use at your own risk.

## Threat model

| Actor               | Capability                                            | Mitigation                                           |
| ------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| Agent operator      | Can deliver garbage, sign anyway, take payment        | Caller has off-chain proof and can blacklist         |
| Agent operator      | Can deactivate then unstake to dodge a slash          | `pendingJobs == 0` gate + 1h cooldown on unstake     |
| Agent operator      | Can rotate signer to a freshly compromised key        | Only `owner` (cold key / multisig) can `updateSigner` |
| Hot signer attacker | Can sign arbitrary receipts for the agent             | Loss bounded to revenue until owner rotates key      |
| Caller              | Can refuse to acknowledge a legitimate response       | Provider proves delivery via signed receipt, not ack |
| Random observer     | Can submit `claimTimeout` against a real provider     | Only fires after deadline; only refunds + slashes    |
| Admin               | Could swap in a malicious escrow contract             | `setJobEscrow` is one-shot — cannot be re-pointed    |
| Replay attacker     | Could resend a captured receipt against another chain | Receipt digest includes EIP-712 domain + chainId      |
| Replay attacker     | Could resend a captured receipt against same chain    | `usedReceipts[digest]` defense-in-depth              |

## Known limitations

- **Response quality is not enforced.** A provider that signs
  `responseHash = keccak256("garbage")` collects the escrow. Out-of-scope
  for Phase 1; mitigations require optimistic challenge + arbitration,
  TEE attestation, or ZK proofs.

- **CCTP attestation latency.** Circle Iris attestations take 1-4 minutes
  on Sepolia. UI should communicate this clearly.

- **Direct log reads.** The activity feed scans the last 50k blocks. Old
  events will eventually fall out of view. Migrate to a dedicated indexer
  (Goldsky / Envio) before mainnet.

- **No EIP-1271.** Contract-wallet callers cannot sign receipts via 1271
  yet. Planned for Phase 2.
