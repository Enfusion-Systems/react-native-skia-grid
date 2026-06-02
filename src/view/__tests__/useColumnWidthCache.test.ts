import type { RowNode, SkiaInternalGridColumn } from "../../core/types";
import {
  CELL_PADDING,
  FONT_WIDTH_ADJ_MULTIPLIER,
  GROUPED_ROW_PADDING,
  GROUP_COLUMN_NAME,
} from "../../utils/constants";
import { calculateRowColumnWidths } from "../../utils/gridUtils";
import { computeGroupColumnWidth } from "../useColumnWidthCache";

// Autosize for the synthetic group column. The fake font measures
// `charCount * W_PER_CHAR`; getTextWidth then applies FONT_WIDTH_ADJ_MULTIPLIER
// (the fake font is unregistered, so getTextWidth takes its uncached fallback —
// same arithmetic). `textW` mirrors that so assertions read in label terms.
const W_PER_CHAR = 7;
const fakeFont = {
  measureText: (t: string) => ({ width: t.length * W_PER_CHAR }),
} as never;
const textW = (s: string) => s.length * W_PER_CHAR * FONT_WIDTH_ADJ_MULTIPLIER;

const groupedCol = (
  __id: string,
  name: string,
  rowGroupIndex: number
): SkiaInternalGridColumn =>
  ({
    id: __id,
    __id,
    __index: rowGroupIndex,
    name,
    field: __id,
    colId: __id,
    width: 100,
    hide: true,
    rowGroup: true,
    rowGroupIndex,
  } as SkiaInternalGridColumn);

const leaf = (data: Record<string, unknown>): RowNode =>
  ({ children: [], level: 0, __id: "r", __index: 0, data } as RowNode);

describe("computeGroupColumnWidth (group column autosize)", () => {
  it("makes the group column wide enough to fully show the group label (text visible)", () => {
    // End-to-end: measure a grouped column's leaf value the way the cache does,
    // then synthesize the group column width from it. The group label is drawn
    // indented by one GROUPED_ROW_PADDING step (rowGroupIndex 0 → level 1), so
    // the column must fit `indentation + labelWidth` for the text to be visible.
    const region = groupedCol("region", "Region", 0);
    const widths = calculateRowColumnWidths(
      leaf({ region: "North America" }),
      [region],
      fakeFont
    );
    const cache = new Map<string, number>([["region", widths.region]]);

    const groupColWidth = computeGroupColumnWidth(cache, [region], fakeFont);

    const indentation = (0 + 1) * GROUPED_ROW_PADDING;
    const labelWidth = textW("North America");
    // The label fits after its indentation → not truncated.
    expect(groupColWidth).toBeGreaterThanOrEqual(indentation + labelWidth);
    // And it is sized to the value, not collapsed to the header ("Group") or
    // the grouped column's own header ("Region") — the bug it regresses.
    expect(groupColWidth).toBeGreaterThan(textW(GROUP_COLUMN_NAME));
    expect(groupColWidth).toBeGreaterThan(textW("Region"));
  });

  it("matches the documented formula: 4·CELL_PADDING + content + indentation", () => {
    const region = groupedCol("region", "Region", 0);
    const content = textW("North America");
    const cache = new Map<string, number>([["region", content]]);

    const groupColWidth = computeGroupColumnWidth(cache, [region], fakeFont);

    expect(groupColWidth).toBeCloseTo(
      4 * CELL_PADDING + content + (0 + 1) * GROUPED_ROW_PADDING
    );
  });

  it("fits the grouped column's header when its content width is NOT cached (cache miss)", () => {
    // Regression for the too-narrow group column: recompute can run before the
    // grouped column's content width is cached. A miss must fall back to the
    // column's own header width, not collapse to padding + indentation.
    const region = groupedCol("region", "Region", 0);
    const emptyCache = new Map<string, number>(); // no "region" entry

    const groupColWidth = computeGroupColumnWidth(emptyCache, [region], fakeFont);

    expect(groupColWidth).toBeGreaterThanOrEqual(textW("Region"));
    expect(groupColWidth).toBeCloseTo(
      4 * CELL_PADDING + textW("Region") + (0 + 1) * GROUPED_ROW_PADDING
    );
  });

  it("falls back to the group header width when grouped values are tiny", () => {
    const tiny = groupedCol("a", "A", 0);
    const cache = new Map<string, number>([["a", textW("x")]]);

    const groupColWidth = computeGroupColumnWidth(cache, [tiny], fakeFont);

    // Header "Group" still has to be readable.
    expect(groupColWidth).toBeGreaterThanOrEqual(textW(GROUP_COLUMN_NAME));
  });

  it("adds more indentation for deeper grouping levels", () => {
    const content = textW("Same Value");
    const cache = new Map<string, number>([
      ["region", content],
      ["country", content],
    ]);

    const shallow = computeGroupColumnWidth(
      cache,
      [groupedCol("region", "Region", 0)],
      fakeFont
    );
    const deeper = computeGroupColumnWidth(
      cache,
      [groupedCol("region", "Region", 0), groupedCol("country", "Country", 1)],
      fakeFont
    );

    // The deeper level is indented one extra GROUPED_ROW_PADDING step.
    expect(deeper - shallow).toBeCloseTo(GROUPED_ROW_PADDING);
  });

  it("is driven by the widest grouped column", () => {
    const cache = new Map<string, number>([
      ["short", textW("US")],
      ["long", textW("North America Region")],
    ]);

    const groupColWidth = computeGroupColumnWidth(
      cache,
      [groupedCol("short", "Short", 0), groupedCol("long", "Long", 1)],
      fakeFont
    );

    // Must fit the longest label (plus its indentation), regardless of order.
    expect(groupColWidth).toBeGreaterThanOrEqual(
      textW("North America Region") + 2 * GROUPED_ROW_PADDING
    );
  });
});
