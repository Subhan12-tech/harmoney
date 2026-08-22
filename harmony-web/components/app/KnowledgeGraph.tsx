"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { GraphNodeDef } from "@/lib/data";
import { accentChipStyle } from "@/lib/style";

const VIEW_W = 760;
const VIEW_H = 480;
const CENTER_X = 380;
const CENTER_Y = 240;
const RADIUS = 175;

interface PlacedNode extends GraphNodeDef {
  x: number;
  y: number;
  /** Confidence of this source's relationship to the draft, 0–1. */
  confidence: number;
  isCentre: boolean;
}

function place(nodes: GraphNodeDef[]): PlacedNode[] {
  let orbitIndex = 0;
  return nodes.map((n) => {
    if (n.angle === null) {
      return { ...n, x: CENTER_X, y: CENTER_Y, confidence: 1, isCentre: true };
    }
    const rad = (n.angle * Math.PI) / 180;
    const confidence = 0.85 - orbitIndex * 0.08;
    orbitIndex += 1;
    return {
      ...n,
      x: CENTER_X + RADIUS * Math.cos(rad),
      y: CENTER_Y + RADIUS * Math.sin(rad),
      confidence,
      isCentre: false,
    };
  });
}

/**
 * The disclosure lineage graph.
 *
 * Radius encodes how many statements a source contributes; edge opacity
 * encodes how confident the link to the current draft is. Nodes are real
 * controls — clickable, focusable, and operable from the keyboard — and drive
 * the inspector beside them.
 */
export function KnowledgeGraph({ nodes }: { nodes: GraphNodeDef[] }) {
  const placed = useMemo(() => place(nodes), [nodes]);
  const centre = placed.find((n) => n.isCentre) ?? placed[0];
  const [selectedId, setSelectedId] = useState<string>(centre?.id ?? "");

  const selected = placed.find((n) => n.id === selectedId) ?? centre;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="app-card" style={{ padding: 20 }} aria-labelledby="lineage-heading">
        <h2 id="lineage-heading" className="kicker" style={{ marginBottom: 8 }}>
          Disclosure lineage — current draft
        </h2>

        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          style={{ width: "100%", height: 480 }}
          role="group"
          aria-label="Knowledge graph of the current draft and its evidence sources"
        >
          {placed
            .filter((n) => !n.isCentre)
            .map((n) => (
              <line
                key={`edge-${n.id}`}
                x1={centre.x}
                y1={centre.y}
                x2={n.x}
                y2={n.y}
                stroke="var(--accent)"
                strokeWidth={selectedId === n.id ? 2 : 1}
                style={{ opacity: selectedId === n.id ? 1 : n.confidence }}
              />
            ))}

          {placed.map((n) => {
            const isSelected = n.id === selectedId;
            return (
              <g
                key={n.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${n.label1} ${n.label2}, ${n.statements.length} statements`}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedId(n.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(n.id);
                  }
                }}
              >
                {isSelected && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r + 7}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={1}
                    style={{ opacity: 0.5 }}
                  />
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={n.isCentre ? "var(--accent)" : "color-mix(in srgb, var(--accent-2) 55%, var(--bg-elev))"}
                  stroke={isSelected ? "var(--accent)" : "var(--border)"}
                  strokeWidth={1}
                />
                <text
                  x={n.x}
                  y={n.y + 4 + n.r + 12}
                  textAnchor="middle"
                  fontSize={11}
                  fill="rgba(238,241,244,.85)"
                >
                  {n.label1}
                </text>
                <text
                  x={n.x}
                  y={n.y + 4 + n.r + 26}
                  textAnchor="middle"
                  fontSize={11}
                  fill="rgba(238,241,244,.6)"
                >
                  {n.label2}
                </text>
              </g>
            );
          })}
        </svg>
      </section>

      {/* ---- Inspector ---- */}
      <aside className="app-card" style={{ padding: 20 }} aria-live="polite">
        <div className="flex items-start justify-between gap-3" style={{ marginBottom: 10 }}>
          <div>
            <div className="kicker" style={{ marginBottom: 6 }}>
              {selected.isCentre ? "Current draft" : "Evidence source"}
            </div>
            <div className="font-heading" style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              {selected.label1} {selected.label2}
            </div>
          </div>
          {!selected.isCentre && (
            <span style={accentChipStyle}>{Math.round(selected.confidence * 100)}%</span>
          )}
        </div>

        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>
          {selected.statements.length} indexed statement{selected.statements.length === 1 ? "" : "s"}
          {selected.isCentre ? " under review" : " linked to this draft"}.
        </p>

        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {selected.statements.map((s) => (
            <li
              key={s}
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: "rgba(238,241,244,.9)",
                padding: "10px 12px",
                marginBottom: 8,
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            >
              {s}
            </li>
          ))}
        </ul>

        {selected.isCentre ? (
          <Link href="/app/documents" className="app-link" style={{ fontSize: 12.5 }}>
            Open review workspace <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
            Cited by the review workspace whenever a draft statement contradicts one of these.
          </p>
        )}
      </aside>
    </div>
  );
}
