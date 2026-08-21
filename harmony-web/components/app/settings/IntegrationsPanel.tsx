"use client";

import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { useAsyncData } from "@/lib/useAsyncData";
import { getIntegrations } from "@/lib/data";
import { accentChipStyle, neutralChipStyle, secondaryButtonStyle } from "@/lib/style";
import { useToast } from "../Toast";

export function IntegrationsPanel() {
  const { orgId, canManageSecurity } = useRole();
  const { toast } = useToast();

  const seed = useAsyncData(() => getIntegrations(orgId), [orgId], []);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  useEffect(() => setToggled({}), [orgId]);

  const integrations = useMemo(
    () => seed.map((i) => ({ ...i, connected: toggled[i.name] ?? i.connected })),
    [seed, toggled],
  );

  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 xl:grid-cols-3">
      {integrations.map((i) => (
        <section
          key={i.name}
          className="app-card flex flex-col"
          style={{ padding: 18 }}
          aria-labelledby={`integration-${i.name.replace(/\W+/g, "-")}`}
        >
          <div className="flex items-center justify-between gap-2" style={{ marginBottom: 8 }}>
            <span className="kicker">{i.category}</span>
            <span style={i.connected ? accentChipStyle : { ...neutralChipStyle, color: "var(--muted)" }}>
              {i.connected ? "Connected" : "Not connected"}
            </span>
          </div>

          <h2
            id={`integration-${i.name.replace(/\W+/g, "-")}`}
            className="font-heading"
            style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}
          >
            {i.name}
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", minHeight: 36, margin: "0 0 12px" }}>{i.desc}</p>

          {canManageSecurity ? (
            <div className="flex gap-2" style={{ marginTop: "auto" }}>
              {i.connected && (
                <button
                  type="button"
                  onClick={() => toast(`${i.name} settings opened.`)}
                  style={{ ...secondaryButtonStyle, flex: 1, padding: 8, fontSize: 13 }}
                >
                  Configure
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const next = !i.connected;
                  setToggled((prev) => ({ ...prev, [i.name]: next }));
                  toast(next ? `${i.name} connected.` : `${i.name} disconnected.`);
                }}
                style={{
                  ...secondaryButtonStyle,
                  flex: 1,
                  padding: 8,
                  fontSize: 13,
                  ...(i.connected
                    ? {
                        background: "transparent",
                        color: "color-mix(in srgb, var(--danger) 78%, white)",
                        border: "1px solid color-mix(in srgb, var(--danger) 35%, transparent)",
                      }
                    : {}),
                }}
              >
                {i.connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "auto 0 0" }}>
              Integrations are managed by your workspace Admins.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
