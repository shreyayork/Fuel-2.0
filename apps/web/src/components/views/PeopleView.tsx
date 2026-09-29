"use client";

import type { Theme } from "@/lib/theme";
import type { FuelDataset } from "@/lib/types";
import { Avatar, Chip, SectionHead } from "../atoms";

export function PeopleView({ t, data }: { t: Theme; data: FuelDataset }) {
  const groups = [
    { k: "investment", label: "Investment Team", people: data.people.filter((p) => p.team === "investment") },
    { k: "operating", label: "Operating Team", people: data.people.filter((p) => p.team === "operating") },
    { k: "external", label: "Fractional + Advisors", people: data.people.filter((p) => p.team === "external") },
  ];

  return (
    <div>
      <SectionHead t={t} title="People" subtitle="Internal team and extended network" />
      {groups.map((g) => (
        <div key={g.k} style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <h3
              style={{
                margin: 0,
                fontFamily: t.sans,
                fontWeight: 600,
                fontSize: 20,
                letterSpacing: "-0.015em",
              }}
            >
              {g.label}
            </h3>
            <div style={{ flex: 1, height: 1, background: t.rule }} />
            <div
              style={{
                fontFamily: t.sans,
                fontSize: 13,
                color: t.muted,
                fontFeatureSettings: '"tnum" 1',
              }}
            >
              {g.people.length}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
              gap: 10,
            }}
          >
            {g.people.map((p) => {
              const load = data.initiatives.filter(
                (e) => e.ownerId === p.id || (e.team && e.team.includes(p.id)),
              ).length;
              return (
                <div
                  key={p.id}
                  style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 16 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar t={t} person={p} size={40} />
                    <div>
                      <div
                        style={{
                          fontFamily: t.sans,
                          fontSize: 14,
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {p.name}
                      </div>
                      <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginTop: 2 }}>
                        {p.role}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: `1px solid ${t.ruleSoft}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: t.sans,
                          fontSize: 11,
                          color: t.muted,
                          fontWeight: 500,
                        }}
                      >
                        Focus
                      </div>
                      <div style={{ fontSize: 12, marginTop: 2, color: t.inkSoft }}>{p.focus}</div>
                    </div>
                    <Chip t={t} tone="ghost">
                      {load} active
                    </Chip>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
