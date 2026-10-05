"use client";

import { useState } from "react";
import { useAgentDrawer } from "../AgentDrawer";
import { Chip, SectionHead } from "../atoms";
import { useTheme } from "../ThemeContext";
import {
  dataTableFrameStyle,
  dataTableStyle,
  dataTdStyle,
} from "./adminStyles";

export interface SkillSummary {
  name: string;
  title: string;
  description: string;
  readOnly: boolean;
  inputs: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  sideEffects: string[];
}

export function PlaybooksView({ skills }: { skills: SkillSummary[] }) {
  const t = useTheme();
  const { run } = useAgentDrawer();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <SectionHead
        t={t}
        title="Agent skills"
        subtitle={`${skills.length} primitive tools Fuel's agent composes into playbooks — and that any MCP client with an API token can call directly. You generally don't need to think about these as a user; the playbook you pick already wires the right skills together. Listed here for transparency and for MCP developers.`}
      />

      <div style={{ display: "grid", gap: 12 }}>
        {skills.map((s) => {
          const isOpen = expanded === s.name;
          return (
            <div
              key={s.name}
              style={{
                background: t.panel,
                border: `1px solid ${t.rule}`,
                borderRadius: 8,
                padding: 18,
                transition: "border-color 200ms ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: t.sans,
                        fontSize: 15,
                        fontWeight: 600,
                        color: t.ink,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {s.title}
                    </span>
                    <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>
                      {s.name}
                    </span>
                    <Chip t={t} tone={s.readOnly ? "positive" : "warn"}>
                      {s.readOnly ? "read-only" : "writes"}
                    </Chip>
                  </div>
                  <div
                    style={{
                      fontFamily: t.sans,
                      fontSize: 13,
                      color: t.muted,
                      lineHeight: 1.55,
                    }}
                  >
                    {s.description}
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(isOpen ? null : s.name)}
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    color: t.muted,
                    border: `1px solid ${t.rule}`,
                    borderRadius: 6,
                    fontFamily: t.sans,
                    fontSize: 11,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {isOpen ? "Hide" : "Details"}
                </button>
              </div>

              {isOpen ? (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: `1px solid ${t.ruleSoft}`,
                    display: "grid",
                    gap: 14,
                  }}
                >
                  {s.inputs.length > 0 ? (
                    <div>
                      <div
                        style={{
                          fontFamily: t.sans,
                          fontSize: 11,
                          fontWeight: 500,
                          color: t.muted,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          marginBottom: 6,
                        }}
                      >
                        Inputs
                      </div>
                      <div className="fuel-data-table-frame fuel-table-wrap" style={dataTableFrameStyle(t)}>
                        <table className="fuel-data-table" style={dataTableStyle()}>
                          <tbody>
                            {s.inputs.map((i) => (
                              <tr key={i.name}>
                                <td
                                  style={{
                                    ...dataTdStyle(t, { mono: true, nowrap: true }),
                                    width: 180,
                                  }}
                                >
                                  {i.name}
                                  {i.required ? (
                                    <span style={{ color: t.muted, marginLeft: 4 }}>*</span>
                                  ) : null}
                                  <span style={{ color: t.muted, marginLeft: 8 }}>{i.type}</span>
                                </td>
                                <td style={dataTdStyle(t)}>
                                  {i.description ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {s.sideEffects.length > 0 ? (
                    <div>
                      <div
                        style={{
                          fontFamily: t.sans,
                          fontSize: 11,
                          fontWeight: 500,
                          color: t.muted,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          marginBottom: 6,
                        }}
                      >
                        Side effects
                      </div>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 18,
                          fontFamily: t.sans,
                          fontSize: 12.5,
                          color: t.inkSoft,
                          lineHeight: 1.6,
                        }}
                      >
                        {s.sideEffects.map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div>
                    <div
                      style={{
                        fontFamily: t.sans,
                        fontSize: 11,
                        fontWeight: 500,
                        color: t.muted,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      Available to
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Chip t={t} tone="ghost">Fuel AI drawer</Chip>
                      <Chip t={t} tone="ghost">MCP clients (via /api/mcp)</Chip>
                      <Chip t={t} tone="ghost">Agent runs</Chip>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() =>
                        run({
                          prompt: `Use the ${s.name} skill to demonstrate what it does. Keep it short.`,
                          kind: "playbook-try",
                        })
                      }
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "none",
                        fontFamily: t.sans,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#0B1116",
                        cursor: "pointer",
                        background: "linear-gradient(135deg, #00B48A 0%, #ECD67F 100%)",
                      }}
                    >
                      Try with Fuel AI
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
