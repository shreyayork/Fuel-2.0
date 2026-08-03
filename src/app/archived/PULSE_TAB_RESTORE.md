# Pulse overview tab (archived)

The third Overview design tab (**Pulse**) was removed from the live UI. Full source is preserved in this folder.

## Files

| File | Contents |
|------|----------|
| `overview-org-pulse.archived.txt` | `toneToCssVar`, `OverviewOrgPulse`, tab wiring, and render JSX |
| `overview-org-pulse.archived.css` | All `.sc-org-pulse-*` and `.sc-overview-design-tabs--triple` styles |

## Restore steps

1. **`ScorecardV2.tsx`**
   - Set `type OverviewDesignTab = "new" | "old" | "pulse"`.
   - Paste blocks from `overview-org-pulse.archived.txt` into `ScorecardV2.tsx`.
   - In `OverviewDesignTabs`: add `"pulse"` to tabs, `sc-overview-design-tabs--triple` class, and `"Pulse"` label.
   - Add `const showPulseOverview = showOverviewDesignTabs && overviewDesignTab === "pulse"`.
   - Set `showNewOverviewContent = !showOverviewDesignTabs || overviewDesignTab === "new"`.
   - Render `<OverviewOrgPulse ... />` when `showPulseOverview` (see archived file for props block).

2. **`overview-ref.css`**
   - Uncomment or paste contents of `overview-org-pulse.archived.css` (triple-tab grid + pulse block).

3. Ask the agent: *"restore Pulse overview tab"* — it can follow this doc.
