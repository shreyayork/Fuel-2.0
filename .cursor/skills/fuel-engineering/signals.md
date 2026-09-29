# Signal catalog — value input rules

Use this whenever a UI lets the user **pick a signal and enter a value** (Log intelligence, manual observations, initiative signal forms, admin tools, onboarding metric fields, etc.).

**Canonical helpers:** `apps/web/src/lib/signals/group-catalog.ts`  
**Kinds / units source of truth:** `apps/web/src/lib/signals.ts` (`SIGNAL_KINDS`, `SIGNAL_UNITS`)  
**Reference UI:** `apps/web/src/components/intelligence/LogIntelligenceDrawer.tsx`

Do **not** hardcode a single Value placeholder or a single free-text input for every signal.

---

## Signal shape

Every selectable signal exposes at least:

| Field | Values |
|-------|--------|
| `kind` | `quantitative` \| `qualitative` \| `boolean` |
| `unit` | `usd` \| `pct` \| `months` \| `count` \| `ratio` \| `days` \| `score` \| `null` |

`unit` is only meaningful when `kind === "quantitative"`.

---

## Value control by `kind` (required)

| `kind` | Control | Placeholder | Submit field |
|--------|---------|-------------|--------------|
| `qualitative` | text input | `Value (free text)` | `valueText` |
| `boolean` | `<select>` true/false (default `true`) | n/a (or `true / false`) | `valueBool` |
| `quantitative` | see unit table below | `Value in {unit}` via `manualObservationValuePlaceholder` | `valueNumeric` |

When the selected signal changes:

1. Reset the value (boolean → `"true"`, otherwise `""`).
2. Recompute placeholder / control from the new signal’s `kind` + `unit`.

Use:

- `manualObservationValuePlaceholder(signal)`
- `parseManualObservationValue(signal, raw)` — gate submit on `.valid`
- `formatSignalObservationValue(...)` for display chips / timeline

---

## Quantitative validation by `unit` (required)

| `unit` | Input | Allowed raw values | Reject |
|--------|-------|--------------------|--------|
| `usd` | text (allows `$`, `K`, `M`, `B`) | `2400000`, `$2.4M`, `2.4M`, `500K` | letters that are not K/M/B suffixes, empty |
| `pct` | `type="number"` (or text + parse) | `10`, `10%` | `abc`, `12m` |
| `months` | `type="number"` | `12`, `12.5` | **any letters** — including `12m` / `12mo` |
| `days` | `type="number"` | plain number | letters / suffixes |
| `count` / `score` / `ratio` | `type="number"` | plain number | letters / suffixes |
| `null` / unknown | `type="number"` | plain number | letters / suffixes |

**Critical bug to avoid:** do **not** apply USD `K`/`M`/`B` suffix parsing to every quantitative unit. For `months`, `"12m"` must be **invalid**, not `12_000_000`.

Parsing lives in `parseManualObservationValue` → unit-aware quantitative parser. Prefer that helper over a new local parse.

---

## Submit gating

Never enable submit on “non-empty string” alone.

```ts
const parsed = parseManualObservationValue(selected, value);
const canSubmit = Boolean(selected && periodOk && parsed.valid);
```

Show a short inline error when the user typed something and `!parsed.valid` (use `t.negative`).

On submit, send only the field that matches kind:

- quantitative → `valueNumeric`
- qualitative → `valueText`
- boolean → `valueBool` (`"true"` / `"false"`)

---

## Checklist (copy into PRs / reviews)

- [ ] Value UI branches on `selected.kind` (not one text field for all)
- [ ] Placeholder from `manualObservationValuePlaceholder` (or equivalent)
- [ ] Quantitative non-USD uses `type="number"` (or equivalent digit-only UX)
- [ ] USD may accept `$` / `K` / `M` / `B`; months/pct/etc. do **not**
- [ ] `canSubmit` requires `parseManualObservationValue(...).valid`
- [ ] Changing signal resets value and updates control/placeholder
- [ ] No hardcoded `e.g. 2.4M` / `Value (free text)` for every signal

---

## Mistakes that already happened (do not repeat)

1. **Hardcoded placeholder** `e.g. 2.4M` on Log intelligence — qualitative/boolean signals looked like currency.
2. **Alphabet accepted for months** — submit enabled on any non-empty string; USD million suffix applied to all units so `12m` could parse as millions.
3. **Silent invalid submit** — parse failed but button stayed enabled with no error.

---

## Related files

| Area | Path |
|------|------|
| Catalog helpers | `apps/web/src/lib/signals/group-catalog.ts` |
| Server kinds/units | `apps/web/src/lib/signals.ts` |
| Seed catalog | `apps/web/src/db/seed-signals.ts` |
| Log intelligence UI | `apps/web/src/components/intelligence/LogIntelligenceDrawer.tsx` |
| Initiative log intelligence | `apps/web/src/components/company/initiatives/InitiativesTab.tsx` (detail drawer) |
| Signal picker | `apps/web/src/components/intelligence/SignalCatalogPicker.tsx` |
| Manual observation action | `apps/web/src/app/(app)/company/[uuid]/actions.ts` → `addManualObservationAction` |
