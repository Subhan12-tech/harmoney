import { WORKFLOW_STAGES } from "@/lib/data";

/**
 * The seven-stage document workflow, rendered as pill chips.
 * Past stages are accent-tinted, the current stage is filled, future stages
 * sit on `--bg-elev` in muted text.
 */
export function WorkflowStepper({ currentIndex }: { currentIndex: number }) {
  return (
    <ol
      className="flex items-center overflow-auto"
      aria-label="Document workflow"
      style={{ listStyle: "none", margin: "0 0 20px", padding: 0, gap: 0 }}
    >
      {WORKFLOW_STAGES.map((label, i) => {
        const isCurrent = i === currentIndex;
        const isPast = i < currentIndex;

        return (
          <li key={label} className="flex flex-none items-center">
            <span
              aria-current={isCurrent ? "step" : undefined}
              className="flex items-center gap-1.5"
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                whiteSpace: "nowrap",
                ...(isCurrent
                  ? { background: "var(--accent)", color: "var(--on-accent)", fontWeight: 600 }
                  : isPast
                    ? { color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }
                    : { color: "var(--muted)", background: "var(--bg-elev)" }),
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: i <= currentIndex ? "currentColor" : "rgba(238,241,244,.3)",
                }}
              />
              {label}
            </span>
            {i < WORKFLOW_STAGES.length - 1 && (
              <span aria-hidden="true" style={{ width: 20, height: 1, background: "var(--border)" }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
