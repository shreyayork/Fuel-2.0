---
name: fuel-onboarding-voice
description: >-
  Write Fuel onboarding chat and product copy in the Fuel voice — direct,
  confident, founder-facing, peer-benchmark focused. Use when editing
  FuelOnboardingChat, onboarding CTAs, Fuel help bubbles, toasts, banners,
  or any user-facing Fuel message outside strict pricing/upgrade modals.
---

# Fuel onboarding voice

## When to use

Load this skill before writing or editing copy in:

- `src/app/FuelOnboardingChat.tsx`
- Fuel help bubbles (`buildFuelHelpContent`, benchmark insights)
- Onboarding cards, chips, and form helper text
- General Fuel product messages that should feel like the chat

For **Pro pricing / upgrade modal** copy (equity-advisor framing), see `src/app/credits/constants.ts` — that surface has its own angle. Everywhere else, use **this** voice.

## Voice in one line

Fuel talks like a sharp operator who already did the homework — confident, specific, no fluff — not like a chatbot or a sales deck.

## Tone rules

**Do**

- Lead with what Fuel already knows or did (`Found you.`, `Got it.`, `Now for the good part.`)
- On the **first message only**, one blunt advisor line is allowed: smart advisor, no equity percentage — then move straight to specifics
- Be specific: real peers, real cohorts, real time (`60 seconds`, `~3 minutes`)
- Use short paragraphs; one idea per beat
- Bold **company names**, **emails**, and **key nouns** with markdown `**`
- Ask direct questions when confirming (`Does this look right?`)
- Acknowledge tradeoffs plainly (`Garbage in, garbage out.`)
- End with low-pressure CTAs (`no pressure now`, `Launch when you're ready`)

**Don't**

- Open with long advisor pitches or equity framing outside the first message
- Use hedge words: `looks like`, `maybe`, `we think`, `I believe`
- Sound like marketing: `revolutionary`, `game-changing`, `unlock your potential`
- Over-explain equity/advisor positioning after the opener (save depth for pricing)
- Use internal jargon: `pretend`, `mock`, `demo mode`, `missing data`
- Stack exclamation marks or emoji beyond a single opener 👋

## Structure patterns

### Opening (company detected)

```
👋 Found you.

I'm Fuel — your smart advisor. The kind that doesn't take a percentage of your company.

You're signed in as **{email}** — so I pulled **{company}** from your domain.

Before I can show you anything useful, I need 60 seconds of your time. Confirm what I found, fill in what I missed, and I'll build you a benchmark profile against real peers — not generic industry averages.

Does this look right?
```

Chip: `Yes, review my profile →`

### Opening (no company detected)

```
👋 Hi — I'm Fuel, your smart advisor. The kind that doesn't take a percentage of your company.

You're signed in as **{email}**. What company should I set up?
```

### Fuel help bubble

- **Headline**: short punch (`Now for the good part.`, `Business model locked in`)
- **Body**: one concrete outcome, cohort or stage named
- Avoid bullet walls; prefer one strong sentence

Example:

> You're benchmarked against **Seed** companies in the **US**.
> Add your headline number and watch where you land. No vanity metrics, no generic averages. Just your dot on the curve.

### Form card subcopy

- Honest, slightly blunt, operator-to-operator
- Example: `The more accurate this is, the tighter your peer cohort. Garbage in, garbage out.`

### Handoff / launch

- Summarize what's ready; user controls timing
- Example: `That's your foundation. Launch when you're ready — Fuel will open **{company}**'s workspace and generate your first intelligence pass.`

## CTA labels

Use arrow suffix `→` on primary chips/buttons:

- `Yes, review my profile →`
- `Review your profile →`
- `See how Fuel helps →`
- `Start my journey →`
- `Lock in & next →`
- `See my full benchmark →`

Secondary actions stay plain: `Continue`, `Cancel`, `Wait · {countdown}`

## Terminology (onboarding)

| Use | Avoid |
|-----|--------|
| Intelligence | Signals (in new copy) |
| Benchmark profile / peer cohort | Industry average, generic benchmark |
| Real peers | Comparable companies (unless formal) |
| Scorecard | Pulse, Your Journey (in chat copy) |
| Data room | Context feed (user-facing) |
| Generate intelligence | Auto-redirect, magic |

## Benchmark wizard copy

- One metric at a time; conversational prompts (`ARR — what are you at?`)
- Progress hint: `{n} of {total}` and `Takes ~3 minutes.`
- Percentile hint stays plain: `P25–P90 = peer benchmarks · green band = cohort range · dot = you`

## Checklist before shipping copy

- [ ] Reads like the canonical opener above, not a product brochure
- [ ] At least one specific detail (company, stage, region, time)
- [ ] No hedge language or internal/dev wording
- [ ] CTA matches the question asked
- [ ] Bold used only for emphasis, not whole sentences

## Reference

Canonical live examples: [examples.md](./examples.md)

Implementation: `src/app/FuelOnboardingChat.tsx`
