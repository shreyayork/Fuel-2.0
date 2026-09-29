import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { THEMES } from "@/lib/theme";
import {
  DRAWER_FORM_CONTROL_MIN_HEIGHT_PX,
  drawerFormControlStyle,
  drawerFormInputStyle,
} from "./styles";

describe("drawer form control heights", () => {
  const t = THEMES.signal;

  it("drawerFormControlStyle shares a fixed minHeight for Signal/Value", () => {
    const style = drawerFormControlStyle(t);
    assert.equal(style.minHeight, DRAWER_FORM_CONTROL_MIN_HEIGHT_PX);
    assert.equal(DRAWER_FORM_CONTROL_MIN_HEIGHT_PX, 40);
    assert.equal(style.boxSizing, "border-box");
  });

  it("drawerFormInputStyle stays free of forced single-line minHeight for textareas", () => {
    const style = drawerFormInputStyle(t);
    assert.equal(style.minHeight, undefined);
  });
});
