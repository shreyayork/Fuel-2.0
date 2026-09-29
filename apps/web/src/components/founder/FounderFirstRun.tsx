"use client";

import { useEffect, useRef, useState } from "react";
import { useAgentDrawer } from "../AgentDrawer";
import { PitchDeckUploader } from "./PitchDeckUploader";
import { buildExtractDeckPromptBlock } from "@/lib/playbooks/pitch-deck-evaluation";
import { withSuggestedInitiativesFormat } from "@/lib/playbooks/suggested-initiatives-format";

/**
 * First-session deep link: after the founder confirms their profile on
 * /onboard, they may land here on `/company/[uuid]?cta=&first=1`.
 *
 * Behavior is intentionally restrained: the dashboard itself is the
 * primary surface, so we DON'T auto-fire an agent run from the URL —
 * the founder can launch any playbook from the Quick Tools tiles on
 * the dashboard whenever they're ready.
 *
 * The one exception is `cta=pitch-deck&first=1`: that flow only makes
 * sense if we actually have a deck to evaluate, so we surface the
 * upload sheet inline. Once they upload (or skip), we strip `first=1`
 * and the dashboard is theirs.
 */
interface PlaybookSeed {
  slug: string;
  title: string;
  content: string;
}

export function FounderFirstRun({
  cta,
  first,
  playbook,
  companyUuid,
  companyName,
}: {
  cta: "benchmark" | "pitch-deck" | "explore";
  first: boolean;
  playbook: PlaybookSeed | null;
  companyUuid: string;
  companyName: string;
}) {
  const { run } = useAgentDrawer();
  const firedRef = useRef(false);
  const [needsUpload, setNeedsUpload] = useState(cta === "pitch-deck" && first);

  const stripFirstParam = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("first");
    window.history.replaceState({}, "", url.toString());
  };

  const firePitchDeckRun = (extraPromptBlock: string) => {
    if (firedRef.current || !playbook) return;
    firedRef.current = true;
    const subjectLine = `Run the selected playbook against ${companyName} (catalog uuid: ${companyUuid}).`;
    const linkLabel = { display: companyName, href: `/company/${companyUuid}` };
    const prompt = withSuggestedInitiativesFormat(`${subjectLine}

This is the founder's first pitch-deck evaluation. Lean on what we already know about the company to avoid re-asking inputs.

Follow the playbook's prescribed skill order and output format verbatim. Do NOT ask the user which subject this is for — it is ${linkLabel.display}.

${extraPromptBlock}

---
${playbook.content}
---`);
    const displayPrompt = `Run [${playbook.title}](/playbooks/${playbook.slug}) against [${linkLabel.display}](${linkLabel.href}).`;
    run({
      prompt,
      displayPrompt,
      kind: "playbook_run",
      artifactKind: "playbook_run",
      playbookTitle: playbook.title,
      subjectCompanyUuid: companyUuid,
      subjectCompanyName: companyName,
      companyNameByUuid: { [companyUuid]: companyName },
    });
    stripFirstParam();
  };

  // Strip `first=1` on mount for non-pitch-deck CTAs so a reload doesn't
  // re-trigger any first-session UI affordances. The dashboard takes
  // over from here.
  useEffect(() => {
    if (first && cta !== "pitch-deck") stripFirstParam();
  }, [first, cta]);

  if (cta === "pitch-deck" && first && needsUpload && playbook) {
    return (
      <PitchDeckUploader
        onUploaded={({ contextItemId, attachmentId }) => {
          setNeedsUpload(false);
          firePitchDeckRun(buildExtractDeckPromptBlock({ contextItemId, attachmentId }));
        }}
        onSkip={() => {
          setNeedsUpload(false);
          stripFirstParam();
        }}
      />
    );
  }

  return null;
}
