"use client";

import { useRole } from "@/context/RoleContext";
import { useAsyncData } from "@/lib/useAsyncData";
import { PLANS, getUsage } from "@/lib/data";
import { BarList } from "../BarList";
import { useToast } from "../Toast";

export function BillingPanel() {
  const { orgId, canManageBilling } = useRole();
  const { toast } = useToast();
  const usage = useAsyncData(() => getUsage(orgId), [orgId], []);

  return (
    <>
      <div
        className="grid grid-cols-1 gap-3.5 lg:grid-cols-3"
        style={{ maxWidth: 900, marginBottom: 20 }}
      >
        {PLANS.map((plan) => (
          <section
            key={plan.id}
            className="flex flex-col"
            style={{
              background: "var(--surface)",
              borderRadius: 14,
              padding: 20,
              border: plan.highlighted ? "1px solid var(--accent)" : "1px solid var(--border)",
              boxShadow: plan.highlighted
                ? "0 10px 30px color-mix(in srgb, var(--accent) 12%, transparent)"
                : undefined,
            }}
            aria-labelledby={`plan-${plan.id}`}
          >
            <h2 id={`plan-${plan.id}`} className="kicker" style={{ marginBottom: 8 }}>
              {plan.name}
              {plan.highlighted && <span style={{ color: "var(--accent)" }}> · current</span>}
            </h2>
            <div className="font-heading" style={{ fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
              {plan.price}
              {plan.cadence && (
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>{plan.cadence}</span>
              )}
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", minHeight: 40, margin: "0 0 12px" }}>{plan.desc}</p>

            {canManageBilling ? (
              <button
                type="button"
                disabled={plan.highlighted}
                onClick={() =>
                  toast(
                    plan.id === "enterprise"
                      ? "Sales will reach out within one business day."
                      : `Plan change to ${plan.name} queued for the next billing cycle.`,
                  )
                }
                style={{
                  width: "100%",
                  borderRadius: 8,
                  padding: 9,
                  fontSize: 13.5,
                  marginTop: "auto",
                  cursor: plan.highlighted ? "default" : "pointer",
                  ...(plan.id === "enterprise"
                    ? {
                        background: "var(--accent)",
                        border: "none",
                        color: "var(--on-accent)",
                        fontWeight: 600,
                        fontFamily: "var(--font-manrope), system-ui, sans-serif",
                      }
                    : {
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        opacity: plan.highlighted ? 0.7 : 1,
                        fontFamily: "inherit",
                      }),
                }}
              >
                {plan.cta}
              </button>
            ) : (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "auto 0 0" }}>
                Billing is managed by your workspace Admins.
              </p>
            )}
          </section>
        ))}
      </div>

      <section className="app-card" style={{ padding: 20, maxWidth: 900 }} aria-labelledby="usage-heading">
        <h2 id="usage-heading" className="kicker" style={{ marginBottom: 8 }}>
          Usage this cycle
        </h2>
        <BarList
          items={usage.map((u) => ({ label: u.label, count: u.value, width: u.width }))}
          defaultToken="var(--accent)"
        />
      </section>
    </>
  );
}
