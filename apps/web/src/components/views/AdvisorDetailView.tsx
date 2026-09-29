"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Theme } from "@/lib/theme";
import type { Advisor } from "@/db/schema";
import { Chip, Label, SectionHead } from "../atoms";
import { useTheme } from "../ThemeContext";
import {
  deleteAdvisorAction,
  enhanceAdvisorFromLinkedInAction,
  unlinkAdvisorFromCompanyAction,
  updateAdvisorAction,
} from "@/app/(app)/advisors/actions";

export type AdvisorLinkedCompany = {
  companyUuid: string;
  companyName: string;
  role: string | null;
};

function button(t: Theme, variant: "primary" | "ghost" | "danger" = "ghost"): React.CSSProperties {
  const map = {
    primary: { bg: t.ink, color: t.bg, border: t.ink },
    ghost: { bg: "transparent", color: t.inkSoft, border: t.rule },
    danger: { bg: "transparent", color: t.warn, border: t.warn },
  } as const;
  const v = map[variant];
  return {
    padding: "8px 14px",
    background: v.bg,
    color: v.color,
    border: `1px solid ${v.border}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  };
}

function input(t: Theme, multiline = false): React.CSSProperties {
  return {
    padding: "8px 10px",
    background: t.panelAlt,
    color: t.ink,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 13,
    width: "100%",
    minHeight: multiline ? 90 : undefined,
    resize: multiline ? "vertical" : undefined,
  };
}

export function AdvisorDetailView({
  advisor,
  linkedCompanies,
  userEmail,
}: {
  advisor: Advisor;
  linkedCompanies: AdvisorLinkedCompany[];
  userEmail: string;
}) {
  const t = useTheme();
  const [isPending, startTransition] = useTransition();
  const [showShare, setShowShare] = useState(false);
  const instanceLevel = advisor.accountId == null;
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/advisor/${advisor.id}/card` : "";

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Link href="/advisors" style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, textDecoration: "none" }}>
          ← All advisors
        </Link>
      </div>

      <SectionHead
        t={t}
        title={advisor.name}
        subtitle={
          [
            instanceLevel ? "Platform advisor" : null,
            advisor.title,
            advisor.company,
          ]
            .filter(Boolean)
            .join(" · ") || "—"
        }
        right={
          instanceLevel ? (
            advisor.publicCard ? (
              <button onClick={() => setShowShare(true)} style={button(t, "ghost")}>
                Copy share link
              </button>
            ) : null
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              {advisor.publicCard ? (
                <button onClick={() => setShowShare(true)} style={button(t, "ghost")}>
                  Copy share link
                </button>
              ) : null}
              <form
                action={(fd) => startTransition(() => enhanceAdvisorFromLinkedInAction(fd))}
              >
                <input type="hidden" name="id" value={advisor.id} />
                <button type="submit" disabled={!advisor.linkedinUrl || isPending} style={button(t, "primary")}>
                  {advisor.linkedinFetchedAt ? "Re-fetch from LinkedIn" : "Enhance from LinkedIn"}
                </button>
              </form>
            </div>
          )
        }
      />

      {showShare ? (
        <ShareLink t={t} url={shareUrl} onClose={() => setShowShare(false)} />
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 20 }}>
        <div style={{ minWidth: 0 }}>
          {instanceLevel ? (
            <InstanceReadOnly t={t} advisor={advisor} />
          ) : (
            <>
              <EditForm
                t={t}
                advisor={advisor}
                isPending={isPending}
                onSubmit={(fd) => startTransition(() => updateAdvisorAction(fd))}
              />

              <div style={{ marginTop: 20, background: t.panel, border: `1px solid ${t.rule}`, padding: 18 }}>
                <Label t={t} style={{ marginBottom: 10 }}>Danger zone</Label>
                <form action={(fd) => startTransition(() => deleteAdvisorAction(fd))}>
                  <input type="hidden" name="id" value={advisor.id} />
                  <button
                    type="submit"
                    style={button(t, "danger")}
                    onClick={(e) => {
                      if (!confirm(`Delete ${advisor.name}? This cannot be undone.`)) e.preventDefault();
                    }}
                  >
                    Delete advisor
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        <div>
          <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 18, marginBottom: 16 }}>
            <Label t={t} style={{ marginBottom: 10 }}>Linked companies</Label>
            {linkedCompanies.length === 0 ? (
              <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
                Link this advisor to a portfolio company from the company page&apos;s Advisors tab.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {linkedCompanies.map((link) => (
                  <div
                    key={link.companyUuid}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      border: `1px solid ${t.rule}`,
                      borderRadius: 6,
                    }}
                  >
                    <Link
                      href={`/company/${link.companyUuid}`}
                      style={{ fontFamily: t.sans, fontSize: 13, color: t.ink, textDecoration: "none" }}
                    >
                      {link.companyName}
                      {link.role ? ` · ${link.role}` : ""}
                    </Link>
                    <form action={(fd) => startTransition(() => unlinkAdvisorFromCompanyAction(fd))}>
                      <input type="hidden" name="advisorId" value={advisor.id} />
                      <input type="hidden" name="companyUuid" value={link.companyUuid} />
                      <button type="submit" style={{ ...button(t, "ghost"), padding: "4px 10px", fontSize: 11 }}>
                        Unlink
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 18 }}>
            <Label t={t} style={{ marginBottom: 10 }}>Curation</Label>
            <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, lineHeight: 1.6 }}>
              <div>Added by {advisor.curatedByEmail}</div>
              <div>Created {advisor.createdAt.toLocaleDateString("en-US")}</div>
              {advisor.linkedinFetchedAt ? (
                <div>LinkedIn fetched {advisor.linkedinFetchedAt.toLocaleDateString("en-US")}</div>
              ) : null}
              {advisor.fuelDataPersonId ? (
                <div style={{ fontFamily: t.mono }}>fuel-data: {advisor.fuelDataPersonId.slice(0, 16)}…</div>
              ) : (
                <div>Manually entered (no fuel-data link)</div>
              )}
            </div>
            <div style={{ marginTop: 8, fontFamily: t.sans, fontSize: 11, color: t.mutedSoft }}>
              Viewer: {userEmail}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InstanceReadOnly({ t, advisor }: { t: Theme; advisor: Advisor }) {
  const expertise = (advisor.expertise ?? []).join(", ");
  const industries = (advisor.focusIndustries ?? []).join(", ");
  return (
    <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 18, display: "grid", gap: 12 }}>
      <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
        Platform advisor — managed by Super Admin. Your account can link this person to companies but cannot edit the profile.
      </div>
      {[
        ["Title", advisor.title],
        ["Company", advisor.company],
        ["Email", advisor.email],
        ["Phone", advisor.phone],
        ["LinkedIn", advisor.linkedinUrl],
        ["Location", advisor.location],
        ["Expertise", expertise || null],
        ["Focus industries", industries || null],
        ["Bio", advisor.bio],
      ].map(([label, value]) =>
        value ? (
          <Field key={label as string} t={t} label={label as string}>
            <div style={{ fontFamily: t.sans, fontSize: 13, color: t.inkSoft, paddingTop: 8 }}>
              {value as string}
            </div>
          </Field>
        ) : null,
      )}
      {(advisor.expertise ?? []).length > 0 ? (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {(advisor.expertise ?? []).map((tag) => (
            <Chip key={tag} t={t} tone="ghost">
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ShareLink({ t, url, onClose }: { t: Theme; url: string; onClose: () => void }) {
  return (
    <div
      style={{
        background: t.panelAlt,
        border: `1px solid ${t.accent}`,
        borderRadius: 6,
        padding: 12,
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ flex: 1, fontFamily: t.mono, fontSize: 12, color: t.ink, userSelect: "all", wordBreak: "break-all" }}>
        {url}
      </div>
      <button
        onClick={() => {
          void navigator.clipboard.writeText(url);
        }}
        style={button(t, "primary")}
      >
        Copy
      </button>
      <button onClick={onClose} style={button(t, "ghost")}>
        Close
      </button>
    </div>
  );
}

function EditForm({
  t,
  advisor,
  isPending,
  onSubmit,
}: {
  t: Theme;
  advisor: Advisor;
  isPending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  const expertise = (advisor.expertise ?? []).join(", ");
  const industries = (advisor.focusIndustries ?? []).join(", ");
  return (
    <form action={onSubmit} style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 18, display: "grid", gap: 12 }}>
      <input type="hidden" name="id" value={advisor.id} />
      <Field t={t} label="Name">
        <input name="name" defaultValue={advisor.name} style={input(t)} />
      </Field>
      <Field t={t} label="Title">
        <input name="title" defaultValue={advisor.title ?? ""} style={input(t)} />
      </Field>
      <Field t={t} label="Company">
        <input name="company" defaultValue={advisor.company ?? ""} style={input(t)} />
      </Field>
      <Field t={t} label="Email">
        <input name="email" type="email" defaultValue={advisor.email ?? ""} style={input(t)} />
      </Field>
      <Field t={t} label="Phone">
        <input name="phone" defaultValue={advisor.phone ?? ""} style={input(t)} />
      </Field>
      <Field t={t} label="LinkedIn URL">
        <input name="linkedinUrl" defaultValue={advisor.linkedinUrl ?? ""} style={input(t)} />
      </Field>
      <Field t={t} label="Photo URL">
        <input name="photoUrl" defaultValue={advisor.photoUrl ?? ""} style={input(t)} />
      </Field>
      <Field t={t} label="Location">
        <input name="location" defaultValue={advisor.location ?? ""} style={input(t)} />
      </Field>
      <Field t={t} label="Expertise">
        <input name="expertise" defaultValue={expertise} placeholder="GTM, RevOps" style={input(t)} />
      </Field>
      <Field t={t} label="Focus industries">
        <input name="focusIndustries" defaultValue={industries} style={input(t)} />
      </Field>
      <Field t={t} label="Bio">
        <textarea name="bio" defaultValue={advisor.bio ?? ""} style={input(t, true)} />
      </Field>
      <Field t={t} label="Private notes">
        <textarea name="privateNotes" defaultValue={advisor.privateNotes ?? ""} style={input(t, true)} />
      </Field>
      <Field t={t} label="Public card">
        <label style={{ fontFamily: t.sans, fontSize: 13, color: t.inkSoft, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" name="publicCard" defaultChecked={advisor.publicCard} /> Allow anonymous viewers at /advisor/&lt;id&gt;/card
        </label>
      </Field>
      <div>
        <button type="submit" disabled={isPending} style={button(t, "primary")}>
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
      {advisor.linkedinFetchedAt && advisor.linkedinData ? (
        <details style={{ marginTop: 10, minWidth: 0, maxWidth: "100%" }}>
          <summary style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, cursor: "pointer" }}>
            Raw LinkedIn payload ({Object.keys(advisor.linkedinData).length} fields)
          </summary>
          <pre
            style={{
              background: t.panelAlt,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              padding: 10,
              fontFamily: t.mono,
              fontSize: 11,
              color: t.inkSoft,
              maxHeight: 260,
              maxWidth: "100%",
              minWidth: 0,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {JSON.stringify(advisor.linkedinData, null, 2)}
          </pre>
        </details>
      ) : null}
    </form>
  );
}

function Field({ t, label, children }: { t: Theme; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px minmax(0, 1fr)", gap: 10, alignItems: "start" }}>
      <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, paddingTop: 8, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 500 }}>
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
