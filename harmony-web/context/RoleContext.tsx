"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_ORG_ID, ORGS, ROLE_RANK, ROLES, type Role } from "@/lib/data";

/**
 * The permission-aware UI across the whole app reads from here.
 *
 * In this build the role is user-selectable from the header so the gating is
 * demonstrable; in production `role` would be seeded from the authenticated
 * user's real RBAC claim and the switcher would not exist. Every consumer
 * reads the derived flags rather than comparing role strings, so swapping the
 * source is a change to this file alone.
 */

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;

  /** The workspace all data reads are scoped to. */
  orgId: string;
  setOrgId: (orgId: string) => void;

  /** Reviewer and above may approve or reject a document. */
  canApprove: boolean;
  /** Admin and above may invite, suspend, or change a member's role. */
  canManageTeam: boolean;
  canManageBilling: boolean;
  canManageSecurity: boolean;

  isViewer: boolean;
  isEditorOnly: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

const ROLE_KEY = "harmony.role";
const ORG_KEY = "harmony.org";

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("Owner");
  const [orgId, setOrgIdState] = useState<string>(DEFAULT_ORG_ID);

  /**
   * Restored after mount rather than during render: reading storage while
   * rendering would make the server and client markup disagree. Session scope,
   * not local — the selection belongs to this tab, and in production both
   * values come from the session on the server anyway.
   */
  useEffect(() => {
    const storedRole = window.sessionStorage.getItem(ROLE_KEY) as Role | null;
    if (storedRole && ROLES.includes(storedRole)) setRoleState(storedRole);

    const storedOrg = window.sessionStorage.getItem(ORG_KEY);
    if (storedOrg && ORGS.some((o) => o.id === storedOrg)) setOrgIdState(storedOrg);
  }, []);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    window.sessionStorage.setItem(ROLE_KEY, next);
  }, []);

  const setOrgId = useCallback((next: string) => {
    setOrgIdState(next);
    window.sessionStorage.setItem(ORG_KEY, next);
  }, []);

  const value = useMemo<RoleContextValue>(() => {
    const rank = ROLE_RANK[role];
    const canManageTeam = rank <= ROLE_RANK.Admin;
    return {
      role,
      setRole,
      orgId,
      setOrgId,
      canApprove: rank <= ROLE_RANK.Reviewer,
      canManageTeam,
      canManageBilling: canManageTeam,
      canManageSecurity: canManageTeam,
      isViewer: role === "Viewer",
      isEditorOnly: role === "Editor",
    };
  }, [role, orgId, setRole, setOrgId]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside a RoleProvider");
  return ctx;
}
