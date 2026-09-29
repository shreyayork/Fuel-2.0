import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyComboboxInputEdit,
  comboboxCommittedLabel,
} from "./onboard-searchable-combobox";

const OPTIONS = [
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "Massachusetts", label: "Massachusetts" },
];

describe("comboboxCommittedLabel", () => {
  it("resolves option labels and preserves legacy values", () => {
    assert.equal(comboboxCommittedLabel("United States", OPTIONS), "United States");
    assert.equal(comboboxCommittedLabel("Weirdland", OPTIONS), "Weirdland");
    assert.equal(comboboxCommittedLabel("", OPTIONS), "");
  });
});

describe("applyComboboxInputEdit", () => {
  it("clears committed selection when Ctrl+A → Backspace empties the input", () => {
    const result = applyComboboxInputEdit({
      inputValue: "",
      committedLabel: "United States",
    });
    assert.deepEqual(result, {
      draft: "",
      shouldClearCommitted: true,
    });
  });

  it("clears committed selection when draft diverges while typing", () => {
    const result = applyComboboxInputEdit({
      inputValue: "United State",
      committedLabel: "United States",
    });
    assert.equal(result.shouldClearCommitted, true);
    assert.equal(result.draft, "United State");
  });

  it("does not clear when the draft still matches the committed label", () => {
    const result = applyComboboxInputEdit({
      inputValue: "United States",
      committedLabel: "United States",
    });
    assert.deepEqual(result, {
      draft: "United States",
      shouldClearCommitted: false,
    });
  });

  it("keeps an empty draft empty after clear so stale selection cannot restore it", () => {
    // Simulates: select-all delete cleared commit; further edits stay on draft.
    const afterClear = applyComboboxInputEdit({
      inputValue: "",
      committedLabel: "Massachusetts",
    });
    assert.equal(afterClear.shouldClearCommitted, true);

    const whileSearching = applyComboboxInputEdit({
      inputValue: "Mass",
      committedLabel: "",
    });
    assert.equal(whileSearching.draft, "Mass");
    // Already cleared — parent value is ""; UI must not snap back to old label.
    assert.equal(whileSearching.shouldClearCommitted, true);
  });
});
