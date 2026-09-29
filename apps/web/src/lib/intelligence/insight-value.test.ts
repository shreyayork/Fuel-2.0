import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  coerceInsightItem,
  coerceInsights,
  resolveInsightValue,
  valueFieldForKind,
} from "./insight-value";

const booleanSignal = {
  id: "breakeven_achieved_flag",
  label: "EBITDA-breakeven reached",
  category: "board_reporting",
  kind: "boolean" as const,
  unit: null,
};

const numberSignal = {
  id: "blended_cac_ratio",
  label: "Blended CAC ratio",
  category: "efficiency",
  kind: "quantitative" as const,
  unit: "ratio",
};

const stringSignal = {
  id: "gtm_motion",
  label: "GTM motion",
  category: "gtm",
  kind: "qualitative" as const,
  unit: null,
};

function catalogMap(
  ...defs: Array<typeof booleanSignal | typeof numberSignal | typeof stringSignal>
) {
  return new Map(defs.map((d) => [d.id, d]));
}

describe("resolveInsightValue", () => {
  it("accepts boolean true/false", () => {
    assert.deepEqual(resolveInsightValue(booleanSignal, { value_bool: true }), {
      valueNumeric: null,
      valueText: null,
      valueBool: true,
      keyDetail: "Yes",
    });
    assert.deepEqual(resolveInsightValue(booleanSignal, { value_bool: false }), {
      valueNumeric: null,
      valueText: null,
      valueBool: false,
      keyDetail: "No",
    });
  });

  it("rejects string true/false for boolean signals", () => {
    assert.equal(
      resolveInsightValue(booleanSignal, { value_bool: "true" }),
      null,
    );
    assert.equal(
      resolveInsightValue(booleanSignal, { value_bool: "false" }),
      null,
    );
    assert.equal(
      resolveInsightValue(booleanSignal, {
        value_bool: "Yes, EBITDA breakeven has been reached",
      }),
      null,
    );
  });

  it("accepts finite numeric values including 0, negative, decimal", () => {
    assert.equal(
      resolveInsightValue(numberSignal, { value_numeric: 0 })?.valueNumeric,
      0,
    );
    assert.equal(
      resolveInsightValue(numberSignal, { value_numeric: -1.5 })?.valueNumeric,
      -1.5,
    );
    assert.equal(
      resolveInsightValue(numberSignal, { value_numeric: 3.2 })?.keyDetail,
      "3.2x",
    );
  });

  it("rejects free-text for quantitative signals", () => {
    assert.equal(
      resolveInsightValue(numberSignal, {
        value_numeric: "approximately 3.2x",
      }),
      null,
    );
    assert.equal(
      resolveInsightValue(numberSignal, { value_numeric: "3.2" }),
      null,
    );
    assert.equal(
      resolveInsightValue(numberSignal, { value_text: "3.2x" }),
      null,
    );
  });

  it("rejects NaN and Infinity", () => {
    assert.equal(
      resolveInsightValue(numberSignal, { value_numeric: Number.NaN }),
      null,
    );
    assert.equal(
      resolveInsightValue(numberSignal, { value_numeric: Number.POSITIVE_INFINITY }),
      null,
    );
  });

  it("accepts non-empty string for qualitative signals", () => {
    const got = resolveInsightValue(stringSignal, {
      value_text: "  Product-led growth  ",
    });
    assert.deepEqual(got, {
      valueNumeric: null,
      valueText: "Product-led growth",
      valueBool: null,
      keyDetail: "Product-led growth",
    });
  });

  it("rejects empty qualitative text", () => {
    assert.equal(resolveInsightValue(stringSignal, { value_text: "  " }), null);
    assert.equal(resolveInsightValue(stringSignal, { value_text: 42 }), null);
  });
});

describe("coerceInsightItem type mismatch", () => {
  it("omits boolean value under quantitative signal", () => {
    const catalog = catalogMap(numberSignal);
    assert.equal(
      coerceInsightItem(
        {
          signal_id: "blended_cac_ratio",
          value_bool: true,
          summary: "CAC improved",
          raw_snippet: "breakeven",
        },
        catalog,
      ),
      null,
    );
  });

  it("omits numeric value under boolean signal", () => {
    const catalog = catalogMap(booleanSignal);
    assert.equal(
      coerceInsightItem(
        {
          signal_id: "breakeven_achieved_flag",
          value_numeric: 1,
          summary: "Reached breakeven",
          raw_snippet: "EBITDA positive",
        },
        catalog,
      ),
      null,
    );
  });

  it("omits free-text key_detail without typed value", () => {
    const catalog = catalogMap(booleanSignal);
    assert.equal(
      coerceInsightItem(
        {
          signal_id: "breakeven_achieved_flag",
          key_detail: "Yes, EBITDA breakeven has been reached",
          summary: "Reached breakeven",
          raw_snippet: "EBITDA positive",
        },
        catalog,
      ),
      null,
    );
  });

  it("persists formatted key_detail for valid typed values", () => {
    const catalog = catalogMap(booleanSignal, numberSignal, stringSignal);
    const boolItem = coerceInsightItem(
      {
        signal_id: "breakeven_achieved_flag",
        value_bool: true,
        summary: "Reached EBITDA breakeven",
        raw_snippet: "EBITDA positive in Q2",
      },
      catalog,
    );
    assert.equal(boolItem?.key_detail, "Yes");
    assert.equal(boolItem?.value_bool, true);
    assert.equal(boolItem?.value_numeric, null);

    const numItem = coerceInsightItem(
      {
        signal_id: "blended_cac_ratio",
        value_numeric: 1.4,
        summary: "Efficient CAC",
        raw_snippet: "blended CAC 1.4x",
      },
      catalog,
    );
    assert.equal(numItem?.key_detail, "1.4x");
    assert.equal(numItem?.value_numeric, 1.4);

    const textItem = coerceInsightItem(
      {
        signal_id: "gtm_motion",
        value_text: "Sales-led",
        summary: "Enterprise motion",
        raw_snippet: "sales-led GTM",
      },
      catalog,
    );
    assert.equal(textItem?.key_detail, "Sales-led");
    assert.equal(textItem?.value_text, "Sales-led");
  });
});

describe("coerceInsights", () => {
  it("omits invalid rows and keeps valid ones", () => {
    const catalog = catalogMap(booleanSignal, numberSignal);
    const out = coerceInsights(
      [
        {
          signal_id: "breakeven_achieved_flag",
          value_bool: "true",
          summary: "bad",
          raw_snippet: "x",
        },
        {
          signal_id: "blended_cac_ratio",
          value_numeric: 2,
          summary: "ok",
          raw_snippet: "2x",
        },
        {
          signal_id: "blended_cac_ratio",
          value_numeric: 3,
          summary: "dup",
          raw_snippet: "3x",
        },
      ],
      catalog,
      20,
    );
    assert.equal(out.length, 1);
    assert.equal(out[0]?.signal_id, "blended_cac_ratio");
    assert.equal(out[0]?.key_detail, "2x");
  });
});

describe("valueFieldForKind", () => {
  it("maps kind to the correct tool field", () => {
    assert.equal(valueFieldForKind("boolean"), "value_bool");
    assert.equal(valueFieldForKind("qualitative"), "value_text");
    assert.equal(valueFieldForKind("quantitative"), "value_numeric");
  });
});
