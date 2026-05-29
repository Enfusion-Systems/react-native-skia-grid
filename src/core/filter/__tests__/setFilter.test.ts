import type {
  ColumnFilterState,
  RowNode,
  SkiaInternalGridColumn,
} from "../../types";
import {
  FilterTypes,
  JoinOperators,
  SimpleFilterTypes,
} from "../../types";
import {
  deriveSetFilterValue,
  getDistinctValuesForColumn,
} from "../setFilter";

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

function makeRow(id: string, value: string): RowNode<Row> {
  return {
    id,
    __id: id,
    __index: 0,
    children: [],
    level: 0,
    data: { id, value },
  } as RowNode<Row>;
}

describe("deriveSetFilterValue", () => {
  it("should emit values:null when every distinct value is checked", () => {
    expect(deriveSetFilterValue(["a", "b", "c"], 3)).toEqual({ values: null });
  });

  it("should emit empty values array when no values are checked", () => {
    expect(deriveSetFilterValue([], 3)).toEqual({ values: [] });
  });

  it("should emit the checked values when some-but-not-all are checked", () => {
    expect(deriveSetFilterValue(["a", "c"], 3)).toEqual({
      values: ["a", "c"],
    });
  });
});

describe("getDistinctValuesForColumn", () => {
  const column = makeCol();
  const columns = [column];
  const rowsData = [
    makeRow("1", "apple"),
    makeRow("2", "banana"),
    makeRow("3", "cherry"),
    makeRow("4", "apple"),
  ];

  it("should return sorted unique values when filterState is empty", () => {
    const result = getDistinctValuesForColumn({
      rowsData,
      filterState: new Map(),
      columns,
      selectedColumn: column,
      filterKey: "value",
      index: 0,
    });
    expect(result).toEqual(["apple", "banana", "cherry"]);
  });

  it("should return sorted unique values when filterKey is absent from filterState", () => {
    const filterState = new Map<string, ColumnFilterState>([
      [
        "other",
        {
          id: "other",
          filterIndex: 0,
          filterType: FilterTypes.Text,
          filters: [
            {
              joinOperator: JoinOperators.AND,
              conditions: [
                {
                  type: SimpleFilterTypes.Equals,
                  filterType: FilterTypes.Text,
                  filter: "anything",
                },
              ],
            },
          ],
        },
      ],
    ]);
    const result = getDistinctValuesForColumn({
      rowsData,
      filterState,
      columns,
      selectedColumn: column,
      filterKey: "value",
      index: 0,
    });
    expect(result).toEqual(["apple", "banana", "cherry"]);
  });

  it("should exclude the self-filter at index 0 via slice(0,0)", () => {
    // Self-filter would have eliminated all but "banana" — but slice(0,0)
    // drops it, so we should see every distinct value.
    const filterState = new Map<string, ColumnFilterState>([
      [
        "value",
        {
          id: "value",
          filterIndex: 0,
          filterType: "set",
          filters: [{ values: ["banana"], filterType: "set" }],
        },
      ],
    ]);
    const result = getDistinctValuesForColumn({
      rowsData,
      filterState,
      columns,
      selectedColumn: column,
      filterKey: "value",
      index: 0,
    });
    expect(result).toEqual(["apple", "banana", "cherry"]);
  });

  it("should apply earlier same-column filters when index > 0", () => {
    // filters[0] is a conditional that excludes "cherry"; filters[1] is the
    // self set-filter being edited. slice(0,1) keeps filters[0] active.
    const filterState = new Map<string, ColumnFilterState>([
      [
        "value",
        {
          id: "value",
          filterIndex: 0,
          filterType: "multi",
          filters: [
            {
              joinOperator: JoinOperators.AND,
              filterType: FilterTypes.Text,
              conditions: [
                {
                  type: SimpleFilterTypes.NotEqual,
                  filterType: FilterTypes.Text,
                  filter: "cherry",
                },
              ],
            },
            { values: ["banana"], filterType: "set" },
          ],
        },
      ],
    ]);
    const result = getDistinctValuesForColumn({
      rowsData,
      filterState,
      columns,
      selectedColumn: column,
      filterKey: "value",
      index: 1,
    });
    expect(result).toEqual(["apple", "banana"]);
  });
});
