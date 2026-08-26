"use client";

import { useEffect, useRef, useState } from "react";
import { useMe, initialsOf } from "@/context/MeContext";
import { useRole } from "@/context/RoleContext";
import { getOrg } from "@/lib/data";
import { ApiError, updateProfile } from "@/lib/api";
import { primaryButtonStyle, secondaryButtonStyle } from "@/lib/style";
import { useToast } from "../Toast";

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 };

function inputStyle(readOnly = false): React.CSSProperties {
  return {
    width: "100%",
    background: readOnly ? "var(--surface)" : "var(--bg-elev)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "10px 12px",
    color: readOnly ? "var(--muted)" : "var(--text)",
    fontSize: 14,
    fontFamily: "inherit",
  };
}

const MAX_DIM = 256; // avatars display tiny; store them tiny

/** Shrink any picked image to <=256px and return a compact data URI. Keeps the
 *  payload well under the server's ~1MB cap without asking the user to resize. */
function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a valid image."));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process the image."));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfilePanel() {
  const { me, patch } = useMe();
  const { orgId, role } = useRole();
  const { toast } = useToast();
  const org = getOrg(orgId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(me?.full_name ?? "");
    setAvatar(me?.avatar ?? "");
  }, [me?.full_name, me?.avatar]);

  const dirty = name.trim() !== (me?.full_name ?? "") || avatar !== (me?.avatar ?? "");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again after a remove
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file.");
      return;
    }
    try {
      setAvatar(await fileToAvatar(file));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not load that image.");
    }
  }

  async function save() {
    if (!name.trim()) {
      toast("Name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfile({ full_name: name.trim(), avatar });
      patch({ full_name: res.full_name, avatar: res.avatar });
      toast("Profile updated.");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="app-card" style={{ padding: 24, maxWidth: 620 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 4px" }}>Your profile</h2>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 22px" }}>
        This is how you appear across Harmony. You can change your photo and name here.
      </p>

      {/* avatar */}
      <div className="flex items-center gap-4" style={{ marginBottom: 22 }}>
        <div
          className="font-heading flex items-center justify-center"
          style={{
            width: 66,
            height: 66,
            borderRadius: "50%",
            overflow: "hidden",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: 22,
            fontWeight: 600,
            flex: "none",
          }}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span aria-hidden="true">{initialsOf(name || me?.email || "")}</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} style={secondaryButtonStyle}>
              {avatar ? "Change photo" : "Upload photo"}
            </button>
            {avatar && (
              <button
                type="button"
                onClick={() => setAvatar("")}
                style={{ ...secondaryButtonStyle, color: "color-mix(in srgb, var(--danger) 82%, var(--text))" }}
              >
                Remove
              </button>
            )}
          </div>
          <span style={{ fontSize: 11.5, color: "var(--faint)" }}>PNG or JPG. Resized automatically.</span>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: "none" }} />
        </div>
      </div>

      {/* name */}
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="profile-name" style={labelStyle}>
          Full name
        </label>
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="Your name"
          style={inputStyle()}
        />
      </div>

      {/* email — shown, not editable */}
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="profile-email" style={labelStyle}>
          Email
        </label>
        <input id="profile-email" value={me?.email ?? ""} readOnly disabled style={inputStyle(true)} />
        <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
          {me?.auth_provider === "google" ? "Managed by Google sign-in." : "Contact support to change your email."}
        </span>
      </div>

      {/* organization — shown, explicitly not editable here */}
      <div style={{ marginBottom: 22 }}>
        <label htmlFor="profile-org" style={labelStyle}>
          Organization
        </label>
        <input id="profile-org" value={`${org.name} · ${role}`} readOnly disabled style={inputStyle(true)} />
        <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
          Your workspace and role are set by an admin and can&apos;t be changed from your profile.
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={!dirty || saving} style={{ ...primaryButtonStyle, opacity: !dirty || saving ? 0.55 : 1, cursor: !dirty || saving ? "not-allowed" : "pointer" }}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {dirty && !saving && (
          <button
            type="button"
            onClick={() => {
              setName(me?.full_name ?? "");
              setAvatar(me?.avatar ?? "");
            }}
            style={secondaryButtonStyle}
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
