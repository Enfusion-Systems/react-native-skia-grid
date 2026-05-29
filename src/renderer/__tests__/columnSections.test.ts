import type { SkiaInternalGridColumn } from "../../core/types";
import { PinnedStatuses } from "../../core/types";
import { partitionColumnsBySection } from "../columnSections";

type Row = { id: string };

function makeCol(overrides: Partial<SkiaInternalGridColumn<Row>>): SkiaInternalGridColumn<Row> {
  return {
    id: overrides.id ?? "col",
    __id: overrides.__id ?? overrides.id ?? "col",
    __index: overrides.__index ?? 0,
    width: overrides.width ?? 100,
    pinned: overrides.pinned ?? null,
    hide: overrides.hide ?? false,
    ...overrides,
  } as SkiaInternalGridColumn<Row>;
}

describe("partitionColumnsBySection", () => {
  it("should return empty sections and zero totals for empty input", () => {
    const result = partitionColumnsBySection<Row>([]);

    expect(result.sections.left).toEqual([]);
    expect(result.sections.center).toEqual([]);
    expect(result.sections.right).toEqual([]);
    expect(result.totalWidths).toEqual({ left: 0, center: 0, right: 0, full: 0 });
    expect(result.individualWidths).toEqual({ left: [], center: [], right: [] });
  });

  it("should place all non-pinned columns in center section", () => {
    const columns = [
      makeCol({ id: "a", width: 100 }),
      makeCol({ id: "b", width: 200 }),
    ];

    const result = partitionColumnsBySection(columns);

    expect(result.sections.center).toHaveLength(2);
    expect(result.sections.left).toEqual([]);
    expect(result.sections.right).toEqual([]);
    expect(result.totalWidths.center).toBe(300);
    expect(result.totalWidths.full).toBe(300);
  });

  it("should partition columns by pinned status", () => {
    const columns = [
      makeCol({ id: "l1", width: 50, pinned: PinnedStatuses.LEFT }),
      makeCol({ id: "c1", width: 100 }),
      makeCol({ id: "r1", width: 75, pinned: PinnedStatuses.RIGHT }),
      makeCol({ id: "c2", width: 120 }),
      makeCol({ id: "l2", width: 60, pinned: PinnedStatuses.LEFT }),
    ];

    const result = partitionColumnsBySection(columns);

    expect(result.sections.left.map((c) => c.id)).toEqual(["l1", "l2"]);
    expect(result.sections.center.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(result.sections.right.map((c) => c.id)).toEqual(["r1"]);
  });

  it("should aggregate section totals correctly", () => {
    const columns = [
      makeCol({ id: "l", width: 50, pinned: PinnedStatuses.LEFT }),
      makeCol({ id: "c", width: 100 }),
      makeCol({ id: "r", width: 75, pinned: PinnedStatuses.RIGHT }),
    ];

    const result = partitionColumnsBySection(columns);

    expect(result.totalWidths.left).toBe(50);
    expect(result.totalWidths.center).toBe(100);
    expect(result.totalWidths.right).toBe(75);
    expect(result.totalWidths.full).toBe(225);
  });

  it("should equal sum of section totals when full is computed", () => {
    const columns = [
      makeCol({ id: "a", width: 33, pinned: PinnedStatuses.LEFT }),
      makeCol({ id: "b", width: 77 }),
      makeCol({ id: "c", width: 55, pinned: PinnedStatuses.RIGHT }),
      makeCol({ id: "d", width: 22, pinned: PinnedStatuses.LEFT }),
    ];

    const result = partitionColumnsBySection(columns);

    expect(result.totalWidths.full).toBe(
      result.totalWidths.left + result.totalWidths.center + result.totalWidths.right
    );
  });

  it("should exclude hidden columns from all sections and totals", () => {
    const columns = [
      makeCol({ id: "l", width: 50, pinned: PinnedStatuses.LEFT }),
      makeCol({ id: "l-hidden", width: 999, pinned: PinnedStatuses.LEFT, hide: true }),
      makeCol({ id: "c", width: 100 }),
      makeCol({ id: "c-hidden", width: 999, hide: true }),
      makeCol({ id: "r", width: 75, pinned: PinnedStatuses.RIGHT }),
      makeCol({ id: "r-hidden", width: 999, pinned: PinnedStatuses.RIGHT, hide: true }),
    ];

    const result = partitionColumnsBySection(columns);

    expect(result.sections.left.map((c) => c.id)).toEqual(["l"]);
    expect(result.sections.center.map((c) => c.id)).toEqual(["c"]);
    expect(result.sections.right.map((c) => c.id)).toEqual(["r"]);
    expect(result.totalWidths).toEqual({ left: 50, center: 100, right: 75, full: 225 });
  });

  it("should preserve source order within each section", () => {
    const columns = [
      makeCol({ id: "c1", width: 10 }),
      makeCol({ id: "l1", width: 10, pinned: PinnedStatuses.LEFT }),
      makeCol({ id: "c2", width: 10 }),
      makeCol({ id: "l2", width: 10, pinned: PinnedStatuses.LEFT }),
      makeCol({ id: "c3", width: 10 }),
    ];

    const result = partitionColumnsBySection(columns);

    expect(result.sections.left.map((c) => c.id)).toEqual(["l1", "l2"]);
    expect(result.sections.center.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
  });

  it("should produce individualWidths parallel to section arrays", () => {
    const columns = [
      makeCol({ id: "l1", width: 50, pinned: PinnedStatuses.LEFT }),
      makeCol({ id: "l2", width: 60, pinned: PinnedStatuses.LEFT }),
      makeCol({ id: "c1", width: 100 }),
      makeCol({ id: "c2", width: 120 }),
      makeCol({ id: "r1", width: 75, pinned: PinnedStatuses.RIGHT }),
    ];

    const result = partitionColumnsBySection(columns);

    expect(result.individualWidths.left).toEqual([50, 60]);
    expect(result.individualWidths.center).toEqual([100, 120]);
    expect(result.individualWidths.right).toEqual([75]);

    for (const section of ["left", "center", "right"] as const) {
      const sectionCols = result.sections[section];
      const widths = result.individualWidths[section];
      expect(widths).toHaveLength(sectionCols.length);
      sectionCols.forEach((col, i) => {
        expect(widths[i]).toBe(col.width);
      });
    }
  });

  it("should handle all columns pinned left (center and right empty)", () => {
    const columns = [
      makeCol({ id: "a", width: 50, pinned: PinnedStatuses.LEFT }),
      makeCol({ id: "b", width: 60, pinned: PinnedStatuses.LEFT }),
    ];

    const result = partitionColumnsBySection(columns);

    expect(result.sections.left).toHaveLength(2);
    expect(result.sections.center).toEqual([]);
    expect(result.sections.right).toEqual([]);
    expect(result.totalWidths).toEqual({ left: 110, center: 0, right: 0, full: 110 });
  });

  it("should handle all columns pinned right (left and center empty)", () => {
    const columns = [
      makeCol({ id: "a", width: 50, pinned: PinnedStatuses.RIGHT }),
      makeCol({ id: "b", width: 60, pinned: PinnedStatuses.RIGHT }),
    ];

    const result = partitionColumnsBySection(columns);

    expect(result.sections.right).toHaveLength(2);
    expect(result.sections.center).toEqual([]);
    expect(result.sections.left).toEqual([]);
    expect(result.totalWidths).toEqual({ left: 0, center: 0, right: 110, full: 110 });
  });
});
