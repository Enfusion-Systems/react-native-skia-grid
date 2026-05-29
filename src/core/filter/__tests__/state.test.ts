import type {
  ColumnFilterState,
  CombinedFilterModel,
  SetFilterType,
  SkiaInternalGridColumn,
} from "../../types";
import {
  FilterTypes,
  JoinOperators,
  SimpleFilterTypes,
} from "../../types";
import {
  buildColumnFilterArray,
  isColumnFilterStateEmpty,
  updateFilterAtIndex,
} from "../state";

type Row = { id: string; value: string };

function makeCol(
  overrides: Partial<SkiaInternalGridColumn<Row>> = {}
): SkiaInternalGridColumn<Row> {
  return {
    id: "value",
    __id: "value",
    __index: 0,
    name: "Value",
    field: "value",
    colId: "value",
    width: 100,
    pinned: null,
    hide: false,
    ...overrides,
  } as SkiaInternalGridColumn<Row>;
}

const sampleCombinedFilter: CombinedFilterModel = {
  joinOperator: JoinOperators.AND,
  filterType: FilterTypes.Text,
  conditions: [
    {
      type: SimpleFilterTypes.Equals,
      filterType: FilterTypes.Text,
      filter: "abc",
    },
  ],
};

const sampleSetFilter: SetFilterType = {
  values: ["a", "b"],
  filterType: "set",
};

describe("isColumnFilterStateEmpty", () => {
  it("should return true when input is undefined", () => {
    expect(isColumnFilterStateEmpty(undefined)).toBe(true);
  });

  it("should return true when filters[0] has empty conditions and no values", () => {
    const state: ColumnFilterState = {
      id: "k",
      filterIndex: 0,
      filterType: FilterTypes.Text,
      filters: [{ joinOperator: JoinOperators.AND, conditions: [] }],
    };
    expect(isColumnFilterStateEmpty(state)).toBe(true);
  });

  it("should return false when filters[0] has conditions", () => {
    const state: ColumnFilterState = {
      id: "k",
      filterIndex: 0,
      filterType: FilterTypes.Text,
      filters: [sampleCombinedFilter],
    };
    expect(isColumnFilterStateEmpty(state)).toBe(false);
  });

  it("should return false when filters[0] has set values", () => {
    const state: ColumnFilterState = {
      id: "k",
      filterIndex: 0,
      filterType: "set",
      filters: [sampleSetFilter],
    };
    expect(isColumnFilterStateEmpty(state)).toBe(false);
  });

  it("should return false when filters[1] has set values", () => {
    const state: ColumnFilterState = {
      id: "k",
      filterIndex: 0,
      filterType: "multi",
      filters: [
        { joinOperator: JoinOperators.AND, conditions: [] },
        sampleSetFilter,
      ],
    };
    expect(isColumnFilterStateEmpty(state)).toBe(false);
  });
});

describe("buildColumnFilterArray", () => {
  it("should wrap a single filter for non-multi columns", () => {
    const col = makeCol({ filterType: FilterTypes.Text });
    expect(buildColumnFilterArray(col, 0, sampleCombinedFilter)).toEqual([
      sampleCombinedFilter,
    ]);
  });

  it("should default multi-filter array to length 2 when filterParams.filters is missing", () => {
    const col = makeCol({ filterType: "multi" });
    const result = buildColumnFilterArray(col, 1, sampleSetFilter);
    expect(result).toEqual([null, sampleSetFilter]);
  });

  it("should size multi-filter array from filterParams.filters.length", () => {
    const col = makeCol({
      filterType: "multi",
      filterParams: {
        filters: [
          { filterType: FilterTypes.Text },
          { filterType: "set" },
          { filterType: FilterTypes.Number },
        ],
      },
    });
    const result = buildColumnFilterArray(col, 2, sampleCombinedFilter);
    expect(result).toEqual([null, null, sampleCombinedFilter]);
  });
});

describe("updateFilterAtIndex", () => {
  it("should insert a fresh single-filter entry with filterIndex from map size", () => {
    const col = makeCol({ filterType: FilterTypes.Text });
    const result = updateFilterAtIndex(
      new Map(),
      "value",
      col,
      0,
      sampleCombinedFilter
    );

    expect(result.size).toBe(1);
    const entry = result.get("value");
    expect(entry).toEqual({
      id: "value",
      filterIndex: 0,
      filterType: FilterTypes.Text,
      filters: [sampleCombinedFilter],
    });
  });

  it("should insert a fresh multi-filter entry with the filter at the given index", () => {
    const col = makeCol({ filterType: "multi" });
    const result = updateFilterAtIndex(
      new Map(),
      "value",
      col,
      1,
      sampleSetFilter
    );

    expect(result.get("value")?.filters).toEqual([null, sampleSetFilter]);
  });

  it("should assign filterIndex equal to the map size at insertion time", () => {
    const col = makeCol({ filterType: FilterTypes.Text });
    const seeded = new Map<string, ColumnFilterState>([
      [
        "other",
        {
          id: "other",
          filterIndex: 0,
          filterType: FilterTypes.Text,
          filters: [sampleCombinedFilter],
        },
      ],
    ]);
    const result = updateFilterAtIndex(
      seeded,
      "value",
      col,
      0,
      sampleCombinedFilter
    );

    expect(result.get("value")?.filterIndex).toBe(1);
  });

  it("should mutate filters[index] when entry already exists", () => {
    const col = makeCol({ filterType: "multi" });
    const seeded = new Map<string, ColumnFilterState>([
      [
        "value",
        {
          id: "value",
          filterIndex: 0,
          filterType: "multi",
          filters: [sampleCombinedFilter, null],
        },
      ],
    ]);
    const result = updateFilterAtIndex(
      seeded,
      "value",
      col,
      1,
      sampleSetFilter
    );

    expect(result.get("value")?.filters).toEqual([
      sampleCombinedFilter,
      sampleSetFilter,
    ]);
  });

  it("should delete the key when the resulting entry is empty", () => {
    const col = makeCol({ filterType: FilterTypes.Text });
    const seeded = new Map<string, ColumnFilterState>([
      [
        "value",
        {
          id: "value",
          filterIndex: 0,
          filterType: FilterTypes.Text,
          filters: [sampleCombinedFilter],
        },
      ],
    ]);
    const result = updateFilterAtIndex(seeded, "value", col, 0, null);

    expect(result.has("value")).toBe(false);
  });

  it("should retain entries that still hold filter data after update", () => {
    const col = makeCol({ filterType: "multi" });
    const seeded = new Map<string, ColumnFilterState>([
      [
        "value",
        {
          id: "value",
          filterIndex: 0,
          filterType: "multi",
          filters: [sampleCombinedFilter, null],
        },
      ],
    ]);
    const result = updateFilterAtIndex(
      seeded,
      "value",
      col,
      1,
      sampleSetFilter
    );

    expect(result.has("value")).toBe(true);
  });

  it("should return a new Map reference (does not mutate input)", () => {
    const col = makeCol({ filterType: FilterTypes.Text });
    const input = new Map<string, ColumnFilterState>();
    const result = updateFilterAtIndex(
      input,
      "value",
      col,
      0,
      sampleCombinedFilter
    );

    expect(result).not.toBe(input);
    expect(input.size).toBe(0);
  });
});
