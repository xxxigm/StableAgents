/**
 * Reputation indicator — a small filled circle whose hue maps to the
 * Bayesian score returned by AgentRegistry.reputationScore().
 *
 * Three buckets so a glance is enough:
 *   >= 80  honored  (lime)
 *   60–79  watch    (zinc)
 *   < 60   slashed  (rose)
 */
export function ReputationDot({ score }: { score: number }) {
    const tone =
        score >= 80
            ? "bg-accent"
            : score >= 60
              ? "bg-zinc-500"
              : "bg-danger";
    return (
        <span className="inline-flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${tone}`} />
            <span className="tnum text-zinc-200">{score}</span>
        </span>
    );
}
