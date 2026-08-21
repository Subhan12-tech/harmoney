"use client";

import { useRole } from "@/context/RoleContext";
import { ROLES, type Role } from "@/lib/data";

/**
 * Live role switcher.
 *
 * This exists so the permission model is demonstrable without five logins —
 * in production the role comes from the authenticated user's RBAC claim and
 * this control is replaced by a read-only badge.
 */
export function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <>
      <label htmlFor="role-switcher" className="sr-only">
        Active role
      </label>
      <select
        id="role-switcher"
        className="h-select"
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        title="Simulate a role to see permission-gated UI"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "6px 10px",
          color: "var(--text)",
          fontSize: 12,
        }}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </>
  );
}
