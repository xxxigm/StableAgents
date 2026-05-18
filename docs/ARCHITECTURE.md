# Architecture

Design decisions and the reasoning behind each, in the order they were
made.

---

## 1. SLA enforcement model

The central question: **how does the contract know whether the provider
delivered?** A smart contract lives on-chain; an API call happens
off-chain. The two worlds do not intersect unless you build a bridge.

### Options considered

- **Optimistic dispute (Kleros / UMA pattern).** Provider claims delivery,
  caller has N minutes to dispute. Rejected: arbitration is slow and
  expensive; the overhead exceeds the value of a sub-dollar API call.

- **Pure caller acknowledgment.** Caller has N minutes to acknowledge.
  Rejected: the caller can always lie — receive a perfectly good response,
  refuse to ack, then trigger a slash. Adverse.

- **Signed receipts (provider proves delivery).** Adopted. The provider
  signs an EIP-712 receipt over `(jobId, responseHash)` and submits it
  on-chain. The contract verifies the signature came from the provider's
  registered signer key without knowing anything about the response
  content.

### The final design

```
1. Caller opens a job. USDC locked in escrow.
2. Provider has `maxResponseTime` seconds to submit a signed receipt.
3a. Receipt arrives, signature checks out:
    → escrow released to provider's owner
    → completedJobs++ (reputation up)
3b. Deadline passes without a receipt:
    → anyone can call claimTimeout
    → escrow refunded to caller
    → stake slashed by slashBps, paid to caller
    → slashedJobs++ (reputation down)
```

### What this model does not do

It enforces **"a response arrived on time."** It does not enforce
**"the response was correct."** If the provider signs
`responseHash = keccak256("garbage")`, the contract accepts the receipt
and releases the escrow. The caller has off-chain proof (the hash doesn't
match what they received) and can blacklist the provider in their UI, but
there is no on-chain recourse.

Handling response quality would require an optimistic challenge period
(option A), a TEE-based attestation, or a ZK proof — each a research
project in its own right. Phase 1 solves the simpler half of the problem
(timeliness) and leaves quality to a future iteration.

---

## 2. Owner / signer separation

```solidity
struct Agent {
    address owner;   // cold wallet, receives payouts, governs the record
    address signer;  // hot key embedded in the agent's backend service
    ...
}
```

The `owner` is typically a cold wallet or multisig that receives payouts
and can rotate the signer with `updateSigner`. The `signer` is a hot key
embedded in the agent's runtime, used only to sign receipts.

Separation means a compromised hot key exposes only the revenue stream of
a single agent for the time it takes to rotate, not the entire stake.

---

## 3. `setJobEscrow` is one-shot

The admin sets the JobEscrow address exactly once immediately after
deploy. A second call reverts.

This removes a rug-pull vector where a compromised admin could later swap
in a malicious escrow that calls `slash(allAgents, attacker)`. Immutability
via `require(jobEscrow == address(0))` is simpler than a full timelock /
governance pattern and is appropriate for a testnet deployment. For a
mainnet launch this should be replaced with a timelocked multisig.

---

## 4. jobId construction

```solidity
jobId = keccak256(abi.encodePacked(
    agentId,
    msg.sender,
    nonce++,
    block.timestamp,
    requestHash,
    block.chainid
));
```

- `nonce` and `block.timestamp` guarantee two identical requests from the
  same caller produce distinct ids.
- `block.chainid` prevents a captured receipt from being replayed against
  this contract deployed on a different chain.

---

## 5. EIP-712 typed receipts

We chose EIP-712 over the older personal_sign / EIP-191 path because:

- Hot signers usually live in backend services. Operators need to audit
  what their key signs; structured fields render in wallets as
  `jobId: 0x… / responseHash: 0x…` instead of an opaque hex blob.
- The domain separator binds the signature to `(name, version, chainId,
  verifyingContract)` so a signature is unusable against a different
  deployment of the contract.
- `usedReceipts[digest]` is defense-in-depth — even if a future code path
  ever sets a Pending job back to Pending, the digest-level flag would
  still reject the replay.

---

## 6. Bayesian reputation

```solidity
score = (completed + alpha) / (completed + slashed + alpha + beta) * 100
       = (completed + 2)    / (completed + slashed + 3)             * 100
```

A Beta-Binomial posterior mean with a `Beta(alpha=2, beta=1)` prior.

| completed | slashed | score | comment                            |
| --------: | ------: | ----: | ---------------------------------- |
|         0 |       0 |    66 | unknown, not perfect               |
|         1 |       0 |    75 | one success is suggestive          |
|        10 |       0 |    92 | score asymptotes to 100            |
|         0 |       1 |    50 | single slash is recoverable        |
|       100 |       5 |    94 | evidence beats a fresh "100"       |
|         2 |       0 |    80 | a brand-new agent cannot fake 100  |

The score is computed in storage rather than from events because other
contracts — including a future reputation-weighted router — need to read
it as a single view call. Indexer-derived scores are useless to an
on-chain consumer.

---

## 7. Cross-chain on-ramps

Two on-ramp contracts share the same internal interface (`IJobEscrow.openJob`):

- **CrossChainGateway** receives CCTP V2 inbound USDC. The canonical
  MessageTransmitterV2 invokes `handleReceiveFinalizedTransfer` with
  hookData encoding `(agentId, requestHash, originalPayer)`. The gateway
  approves the escrow and opens the job atomically.

- **X402Middleware** is the x402 payTo target. After an agent sends
  `usdc.approve(middleware, price)` and `executePayment(agentId,
  requestHash, amount)` runs, the middleware pulls USDC and calls
  `openJob` in the same transaction.

Both contracts emit an event carrying the original payer so off-chain
dashboards can attribute jobs back to the real user even though
`msg.sender` inside `openJob` is the middleware contract.

---

## 8. What is out of scope for Phase 1

- Response-quality disputes
- Variable / surge pricing (every agent has one `pricePerJob`)
- Partial refunds
- Subscriptions
- Privacy on requestHash / responseHash (callers who care should hash a
  salted payload)
- Reputation-weighted on-chain router
- EIP-1271 contract-wallet callers

Each is a follow-up phase.
