/**
 * Subset of JobEscrow ABI consumed by the dApp. Receipt struct type
 * mirrors the on-chain `Receipt(bytes32 jobId, bytes32 responseHash)`.
 */
export const jobEscrowAbi = [
    {
        type: "function",
        name: "openJob",
        inputs: [
            { name: "agentId", type: "uint256" },
            { name: "requestHash", type: "bytes32" },
        ],
        outputs: [{ type: "bytes32" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "submitReceipt",
        inputs: [
            { name: "jobId", type: "bytes32" },
            { name: "responseHash", type: "bytes32" },
            { name: "signature", type: "bytes" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "claimTimeout",
        inputs: [{ name: "jobId", type: "bytes32" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "getJob",
        inputs: [{ name: "jobId", type: "bytes32" }],
        outputs: [
            {
                type: "tuple",
                components: [
                    { name: "agentId", type: "uint256" },
                    { name: "caller", type: "address" },
                    { name: "amount", type: "uint256" },
                    { name: "openedAt", type: "uint32" },
                    { name: "deadline", type: "uint32" },
                    { name: "requestHash", type: "bytes32" },
                    { name: "responseHash", type: "bytes32" },
                    { name: "status", type: "uint8" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "JobOpened",
        inputs: [
            { name: "jobId", type: "bytes32", indexed: true },
            { name: "agentId", type: "uint256", indexed: true },
            { name: "caller", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
            { name: "requestHash", type: "bytes32", indexed: false },
            { name: "deadline", type: "uint32", indexed: false },
        ],
    },
    {
        type: "event",
        name: "ReceiptAccepted",
        inputs: [
            { name: "jobId", type: "bytes32", indexed: true },
            { name: "responseHash", type: "bytes32", indexed: false },
        ],
    },
    {
        type: "event",
        name: "JobSlashed",
        inputs: [
            { name: "jobId", type: "bytes32", indexed: true },
            { name: "refunded", type: "uint256", indexed: false },
            { name: "slashed", type: "uint256", indexed: false },
        ],
    },
] as const;
