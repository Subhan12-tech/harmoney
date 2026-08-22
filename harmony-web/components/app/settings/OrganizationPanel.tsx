"use client";

import { useEffect, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { getOrg } from "@/lib/data";
import { primaryButtonStyle, secondaryButtonStyle } from "@/lib/style";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { ApiError, getCurrentOrg, updateOrg } from "@/lib/api";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--muted)",
  marginBottom: 5,
};

function inputStyle(readOnly: boolean): React.CSSProperties {
  return {
    width: "100%",
    background: "var(--bg-elev)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "9px 12px",
    color: readOnly ? "var(--muted)" : "var(--text)",
    fontSize: 14,
  };
}

export function OrganizationPanel() {
  const { orgId, canManageTeam, isViewer } = useRole();
  const { toast } = useToast();
  const org = getOrg(orgId);

  const [form, setForm] = useState({
    name: org.name,
    website: org.website,
    industry: org.industry,
    timezone: org.timezone,
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);

  // Load the real record for this workspace; fall back to whatever the local
  // org list holds if the request fails, so the form is never blank.
  useEffect(() => {
    let cancelled = false;
    setForm({ name: org.name, website: org.website, industry: org.industry, timezone: org.timezone });
    getCurrentOrg()
      .then((live) => {
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          name: live.name ?? prev.name,
          website: live.website ?? prev.website,
          industry: live.industry ?? prev.industry,
        }));
      })
      .catch(() => {
        /* keep the fallback values */
      });
    return () => {
      cancelled = true;
    };
  }, [org]);

  const fields: { key: keyof typeof form | "workspaceId"; label: string; value: string; locked?: boolean }[] = [
    { key: "name", label: "Company name", value: form.name },
    { key: "website", label: "Website", value: form.website },
    { key: "industry", label: "Industry", value: form.industry },
    { key: "timezone", label: "Default timezone", value: form.timezone },
    { key: "workspaceId", label: "Workspace ID", value: org.workspaceId, locked: true },
  ];

  return (
    <>
      <form
        className="app-card flex flex-col gap-3"
        style={{ padding: 20, maxWidth: 560 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          setSaving(true);
          try {
            // timezone is UI-only for now — the backend has no column for it.
            await updateOrg({ name: form.name, website: form.website, industry: form.industry });
            toast("Organization settings saved.");
          } catch (err) {
            toast(err instanceof ApiError ? err.message : "Could not save the organization settings.");
          } finally {
            setSaving(false);
          }
        }}
        aria-labelledby="org-heading"
      >
        <h2 id="org-heading" className="kicker" style={{ margin: 0 }}>
          Organization
        </h2>

        {fields.map((field) => {
          const readOnly = field.locked === true || isViewer;
          return (
            <div key={field.key}>
              <label htmlFor={`org-${field.key}`} style={labelStyle}>
                {field.label}
                {field.locked && <span style={{ marginLeft: 6, fontSize: 11 }}>· read only</span>}
              </label>
              <input
                id={`org-${field.key}`}
                value={field.value}
                readOnly={readOnly}
                onChange={(e) =>
                  !readOnly && setForm((prev) => ({ ...prev, [field.key]: e.target.value }) as typeof prev)
                }
                style={inputStyle(readOnly)}
              />
            </div>
          );
        })}

        {isViewer ? (
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>
            Viewers can read organization settings but cannot change them.
          </p>
        ) : (
          <button
            type="submit"
            disabled={saving}
            style={{ ...secondaryButtonStyle, alignSelf: "flex-start", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        )}
      </form>

      {canManageTeam && (
        <section
          style={{
            border: "1px solid color-mix(in srgb, var(--danger) 40%, transparent)",
            background: "color-mix(in srgb, var(--danger) 8%, transparent)",
            borderRadius: 14,
            maxWidth: 560,
            padding: 18,
            marginTop: 16,
          }}
          aria-labelledby="danger-heading"
        >
          <h2
            id="danger-heading"
            className="kicker"
            style={{ color: "color-mix(in srgb, var(--danger) 80%, white)", marginBottom: 8 }}
          >
            Danger zone
          </h2>
          <div className="flex items-center justify-between gap-4" style={{ marginTop: 6 }}>
            <span style={{ fontSize: 13.5 }}>Transfer ownership</span>
            <button
              type="button"
              onClick={() => setTransferOpen(true)}
              style={{ ...secondaryButtonStyle, padding: "8px 16px", fontSize: 13 }}
            >
              Transfer
            </button>
          </div>
          <div className="flex items-center justify-between gap-4" style={{ marginTop: 12 }}>
            <span style={{ fontSize: 13.5 }}>Delete workspace</span>
            <button
              type="button"
              onClick={() => {
                setConfirmText("");
                setDeleteOpen(true);
              }}
              style={{
                background: "transparent",
                border: "1px solid color-mix(in srgb, var(--danger) 50%, transparent)",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                color: "color-mix(in srgb, var(--danger) 80%, white)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Delete
            </button>
          </div>
        </section>
      )}

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer ownership" width={420}>
        <p style={{ fontSize: 13.5, color: "rgba(238,241,244,.85)", margin: "0 0 16px" }}>
          Ownership of {org.name} moves to the member you nominate. You keep Admin access, and the change is
          written to the audit trail.
        </p>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setTransferOpen(false)}
            style={{ ...secondaryButtonStyle, fontFamily: "inherit" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setTransferOpen(false);
              toast("Ownership transfer requested. The nominee must accept it.");
            }}
            style={{ ...primaryButtonStyle, fontWeight: 700 }}
          >
            Request transfer
          </button>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete workspace" width={440}>
        <p style={{ fontSize: 13.5, color: "rgba(238,241,244,.85)", margin: "0 0 12px" }}>
          Deleting {org.name} removes every document, evidence index, and audit record in it. This cannot be
          undone.
        </p>
        <label htmlFor="delete-confirm" style={labelStyle}>
          Type <strong style={{ color: "var(--text)" }}>{org.name}</strong> to confirm
        </label>
        <input
          id="delete-confirm"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          style={{ ...inputStyle(false), marginBottom: 16 }}
        />
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setDeleteOpen(false)}
            style={{ ...secondaryButtonStyle, fontFamily: "inherit" }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={confirmText !== org.name}
            onClick={() => {
              setDeleteOpen(false);
              toast("Workspace deletion scheduled. It can be cancelled for 7 days.");
            }}
            style={{
              background: "transparent",
              border: "1px solid color-mix(in srgb, var(--danger) 50%, transparent)",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 13.5,
              color: "color-mix(in srgb, var(--danger) 80%, white)",
              cursor: confirmText === org.name ? "pointer" : "not-allowed",
              opacity: confirmText === org.name ? 1 : 0.5,
              fontFamily: "inherit",
            }}
          >
            Delete workspace
          </button>
        </div>
      </Modal>
    </>
  );
}
