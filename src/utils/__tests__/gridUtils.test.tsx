/* eslint-disable camelcase */
import {
  type ColumnFilterState,
  type ColumnGroupHeader,
  type ColumnGroupPath,
  type CombinedFilterModel,
  type MultiColumnSortStatus,
  type RowNode,
  type SetFilterType,
  type SkiaColGroupDef,
  type SkiaGridColumn,
  type SkiaGridColumnDef,
  type SkiaInternalGridColumn,
  type ValueFormatterArgs,
  FilterTypes,
} from "../../core/types";
import { FONT_WIDTH_ADJ_MULTIPLIER, GROUP_KEY_SEPARATOR } from "../constants";
import {
  applyGridTransaction,
  buildColGroupDepthMap,
  buildColumnGroupPaths,
  calculateBufferIndexes,
  calculateRowColumnWidths,
  checkIndexes,
  computeColumnGroupHeaders,
  createOptions,
  deriveIndexes,
  flattenColumnDefs,
  getColumnAtX,
  getColumnValue,
  getDisplayValue,
  getFilterKey,
  getFolderCalculatedCheckedState,
  getIsRowSelected,
  getParentKeys,
  getParentRowNodeKeys,
  getSelectedRows,
  isColGroupDef,
  isTopRowEmpty,
  mapToInternalColumns,
  randomValue,
  transformDataToRowNode,
  updateLeafNodeSelectionState,
} from "../gridUtils";
import {
  calculatePinnedWidth,
  calculateSectionWidth,
  getPositionValue,
  getSectionWidth,
} from "../../renderer/sectionWidthUtils";
import { getFilteredRows, getFilteringFunction } from "../../core/pipeline/filter";
import { expandRows, groupRows } from "../../core/pipeline/group";
import { sortRows } from "../../core/pipeline/sort";

type TestData = {
  col_a: string;
  col_b: number;
  date?: string;
};

const mockColumns: SkiaGridColumn<TestData>[] = [
  { name: "Col A", field: "col_a", colId: "col_a", width: 100 },
  { name: "Col B", field: "col_b", colId: "col_b", width: 80 },
];

const mockInternalColumns: SkiaInternalGridColumn<TestData>[] = [
  {
    id: "0",
    __id: "0",
    __index: 0,
    name: "Col A",
    field: "col_a",
    colId: "col_a",
    width: 100,
  },
  {
    id: "1",
    __id: "1",
    __index: 1,
    name: "Col B",
    field: "col_b",
    colId: "col_b",
    width: 80,
  },
];

const mockRows: RowNode<TestData>[] = [
  {
    children: [],
    level: 0,
    __id: "r1",
    __index: 0,
    data: { col_a: "Alice", col_b: 30 },
  },
  {
    children: [],
    level: 0,
    __id: "r2",
    __index: 1,
    data: { col_a: "Bob", col_b: 10 },
  },
  {
    children: [],
    level: 0,
    __id: "r3",
    __index: 2,
    data: { col_a: "Charlie", col_b: 20 },
  },
];

describe("gridUtils", () => {
  describe("getIsRowSelected", () => {
    it("should return true when row is selected", () => {
      const nodesSelection = new Map<string, 0 | 1 | 2>([["r1", 1]]);
      expect(getIsRowSelected(nodesSelection, mockRows[0])).toBe(true);
    });

    it("should return false when row is not selected", () => {
      const nodesSelection = new Map<string, 0 | 1 | 2>([["r1", 0]]);
      expect(getIsRowSelected(nodesSelection, mockRows[0])).toBe(false);
    });

    it("should return false when row is absent from selection map", () => {
      const nodesSelection = new Map<string, 0 | 1 | 2>();
      expect(getIsRowSelected(nodesSelection, mockRows[0])).toBe(false);
    });

    it("should return true when all children are selected", () => {
      const parent: RowNode<TestData> = {
        children: [mockRows[0], mockRows[1]],
        level: 0,
        __id: "parent",
        __index: 0,
        data: { col_a: "Parent", col_b: 0 },
      };
      const nodesSelection = new Map<string, 0 | 1 | 2>([
        ["r1", 1],
        ["r2", 1],
      ]);
      expect(getIsRowSelected(nodesSelection, parent)).toBe(true);
    });
  });

  describe("transformDataToRowNode", () => {
    it("should transform data array to row nodes", () => {
      const data: TestData[] = [
        { col_a: "Alice", col_b: 10 },
        { col_a: "Bob", col_b: 20 },
      ];
      const result = transformDataToRowNode(data);

      expect(result).toHaveLength(2);
      expect(result[0].data).toEqual(data[0]);
      expect(result[0].__index).toBe(0);
    });

    it("should use getRowId when provided", () => {
      const data: TestData[] = [{ col_a: "Alice", col_b: 10 }];
      const getRowId = (row: TestData) => row.col_a + row.col_b;
      const result = transformDataToRowNode(data, getRowId);

      expect(result[0].id).toBe("Alice10");
      expect(result[0].__id).toBe("Alice10");
    });
  });

  describe("isColGroupDef", () => {
    it("should return true for column group definitions", () => {
      const groupDef: SkiaColGroupDef<TestData> = {
        headerName: "Group A",
        children: [
          { name: "Col A", field: "col_a", colId: "col_a", width: 100 },
        ],
      };
      expect(isColGroupDef(groupDef)).toBe(true);
    });

    it("should return false for flat column definitions", () => {
      const colDef: SkiaGridColumn<TestData> = {
        name: "Col A",
        field: "col_a",
        colId: "col_a",
        width: 100,
      };
      expect(isColGroupDef(colDef)).toBe(false);
    });
  });

  describe("flattenColumnDefs", () => {
    it("should return flat columns unchanged", () => {
      const result = flattenColumnDefs(mockColumns);
      expect(result).toEqual(mockColumns);
    });

    it("should flatten nested group defs", () => {
      const defs: SkiaGridColumnDef<TestData>[] = [
        {
          headerName: "Group A",
          children: [
            { name: "Col A", field: "col_a", colId: "col_a", width: 100 },
            { name: "Col B", field: "col_b", colId: "col_b", width: 80 },
          ],
        },
        { name: "Date", field: "date", colId: "date", width: 60 },
      ];

      const result = flattenColumnDefs(defs);
      expect(result).toHaveLength(3);
      expect(result[0].field).toBe("col_a");
      expect(result[2].field).toBe("date");
    });

    it("should flatten deeply nested group defs", () => {
      const defs: SkiaGridColumnDef<TestData>[] = [
        {
          headerName: "Outer",
          children: [
            {
              headerName: "Inner",
              children: [
                { name: "Col A", field: "col_a", colId: "col_a", width: 100 },
              ],
            },
          ],
        },
      ];

      const result = flattenColumnDefs(defs);
      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("col_a");
    });
  });

  describe("buildColumnGroupPaths", () => {
    it("should return empty map for flat columns", () => {
      const result = buildColumnGroupPaths(mockColumns);
      expect(result.size).toBe(0);
    });

    it("should build paths for grouped columns", () => {
      const defs: SkiaGridColumnDef<TestData>[] = [
        {
          headerName: "Group A",
          children: [
            { name: "Col A", field: "col_a", width: 100, colId: "col_a" },
            { name: "Col B", field: "col_b", width: 80, colId: "col_b" },
          ],
        },
      ];

      const result = buildColumnGroupPaths(defs);
      expect(result.size).toBe(2);
      expect(result.get("col_a")).toEqual([
        { headerName: "Group A", depth: 0 },
      ]);
      expect(result.get("col_b")).toEqual([
        { headerName: "Group A", depth: 0 },
      ]);
    });

    it("should handle nested groups with correct depth", () => {
      const defs: SkiaGridColumnDef<TestData>[] = [
        {
          headerName: "Outer",
          children: [
            {
              headerName: "Inner",
              children: [
                { name: "Col A", field: "col_a", width: 100, colId: "col_a" },
              ],
            },
          ],
        },
      ];

      const result = buildColumnGroupPaths(defs);
      const path = result.get("col_a") as ColumnGroupPath;
      expect(path).toHaveLength(2);
      expect(path[0]).toEqual({ headerName: "Outer", depth: 0 });
      expect(path[1]).toEqual({ headerName: "Inner", depth: 1 });
    });
  });

  describe("computeColumnGroupHeaders", () => {
    it("should return empty array when no group paths exist", () => {
      const result = computeColumnGroupHeaders(mockInternalColumns, new Map());
      expect(result).toEqual([]);
    });

    it("should compute headers for adjacent grouped columns", () => {
      const columnGroupPaths = new Map<string, ColumnGroupPath>([
        ["col_a", [{ headerName: "Group A", depth: 0 }]],
        ["col_b", [{ headerName: "Group A", depth: 0 }]],
      ]);

      const result = computeColumnGroupHeaders(
        mockInternalColumns,
        columnGroupPaths
      );

      expect(result).toHaveLength(1);
      expect(result[0].headerName).toBe("Group A");
      expect(result[0].colSpan).toBe(2);
      expect(result[0].startColIndex).toBe(0);
    });
  });

  describe("buildColGroupDepthMap", () => {
    it("should build depth map from column group headers", () => {
      const headers: ColumnGroupHeader[] = [
        { headerName: "Group A", depth: 0, startColIndex: 0, colSpan: 2 },
      ];

      const result = buildColGroupDepthMap(headers, mockInternalColumns);
      expect(result.get("col_a")).toBe(1);
      expect(result.get("col_b")).toBe(1);
    });

    it("should return empty map when no headers", () => {
      const result = buildColGroupDepthMap([], mockInternalColumns);
      expect(result.size).toBe(0);
    });
  });

  describe("mapToInternalColumns", () => {
    it("should map columns to internal columns with required fields", () => {
      const result = mapToInternalColumns(mockColumns);

      expect(result).toHaveLength(2);
      expect(result[0].__index).toBe(0);
      expect(result[0].__id).toBe("0");
      expect(result[0].id).toBe("0");
      expect(result[0].colId).toBe("col_a");
    });

    it("should preserve existing id when provided", () => {
      const columns: SkiaGridColumn<TestData>[] = [
        {
          id: "custom-id",
          name: "Col A",
          field: "col_a",
          colId: "col_a",
          width: 100,
        },
      ];

      const result = mapToInternalColumns(columns);
      expect(result[0].id).toBe("custom-id");
      expect(result[0].__id).toBe("custom-id");
    });

    it("should apply defaultColumnDefs", () => {
      const defaults: Partial<SkiaGridColumn<TestData>> = { sortable: true };
      const result = mapToInternalColumns(mockColumns, defaults);

      expect(result[0].sortable).toBe(true);
    });

    it("should apply columnTypes overrides", () => {
      const columns: SkiaGridColumn<TestData>[] = [
        {
          name: "Col A",
          field: "col_a",
          colId: "col_a",
          width: 100,
          type: "numeric",
        },
      ];
      const columnTypes: Record<string, Partial<SkiaGridColumn<TestData>>> = {
        numeric: { alignment: "right" },
      };

      const result = mapToInternalColumns(columns, undefined, columnTypes);
      expect(result[0].alignment).toBe("right");
    });

    it("should use colId from column when available", () => {
      const columns: SkiaGridColumn<TestData>[] = [
        { name: "Col A", field: "col_a", colId: "custom-col", width: 100 },
      ];

      const result = mapToInternalColumns(columns);
      expect(result[0].colId).toBe("custom-col");
    });
  });

  describe("sortRows", () => {
    it("should return rows unchanged when no sort status", () => {
      const result = sortRows(mockRows, mockInternalColumns, null);
      expect(result).toEqual(mockRows);
    });

    it("should return rows unchanged when sort status is empty", () => {
      const result = sortRows(mockRows, mockInternalColumns, []);
      expect(result).toEqual(mockRows);
    });

    it("should sort rows ascending by value", () => {
      const sortStatus: MultiColumnSortStatus = [
        { columnId: "1", sort: "asc", sortIndex: 0 },
      ];

      const result = sortRows(mockRows, mockInternalColumns, sortStatus);
      expect(result[0].data.col_b).toBe(10);
      expect(result[1].data.col_b).toBe(20);
      expect(result[2].data.col_b).toBe(30);
    });

    it("should sort rows descending by value", () => {
      const sortStatus: MultiColumnSortStatus = [
        { columnId: "1", sort: "desc", sortIndex: 0 },
      ];

      const result = sortRows(mockRows, mockInternalColumns, sortStatus);
      expect(result[0].data.col_b).toBe(30);
      expect(result[1].data.col_b).toBe(20);
      expect(result[2].data.col_b).toBe(10);
    });

    it("should not mutate original array", () => {
      const original = [...mockRows];
      const sortStatus: MultiColumnSortStatus = [
        { columnId: "1", sort: "desc", sortIndex: 0 },
      ];

      sortRows(mockRows, mockInternalColumns, sortStatus);
      expect(mockRows).toEqual(original);
    });
  });

  describe("getColumnAtX", () => {
    it("should return column at given x position", () => {
      const result = getColumnAtX(mockInternalColumns, 50);
      expect(result?.field).toBe("col_a");
    });

    it("should return second column when x exceeds first column width", () => {
      const result = getColumnAtX(mockInternalColumns, 150);
      expect(result?.field).toBe("col_b");
    });

    it("should return last column when x exceeds total width", () => {
      const result = getColumnAtX(mockInternalColumns, 500);
      expect(result?.field).toBe("col_b");
    });

    it("should return undefined for empty columns", () => {
      const result = getColumnAtX([], 50);
      expect(result).toBeUndefined();
    });
  });

  describe("getFilterKey", () => {
    it("should return filterKey when it is a string", () => {
      const col: SkiaInternalGridColumn<TestData> = {
        id: "0",
        __id: "0",
        __index: 0,
        name: "Col A",
        field: "col_a",
        colId: "col_a",
        width: 100,
        filterKey: "custom-key",
      };
      expect(getFilterKey(col)).toBe("custom-key");
    });

    it("should call filterKey when it is a function", () => {
      const col: SkiaInternalGridColumn<TestData> = {
        id: "0",
        __id: "0",
        __index: 0,
        name: "Col A",
        field: "col_a",
        colId: "col_a",
        width: 100,
        filterKey: () => "fn-key",
      };
      expect(getFilterKey(col)).toBe("fn-key");
    });

    it("should fall back to colId then field", () => {
      const col: SkiaInternalGridColumn<TestData> = {
        id: "0",
        __id: "0",
        __index: 0,
        name: "Col A",
        field: "col_a",
        width: 100,
        colId: "my-col",
      };
      expect(getFilterKey(col)).toBe("my-col");
    });
  });

  describe("calculatePinnedWidth", () => {
    it("should return 0 when pinned width is 0", () => {
      expect(calculatePinnedWidth(0, 100, 300)).toBe(0);
    });

    it("should return pinned width when it fits", () => {
      expect(calculatePinnedWidth(100, 50, 300)).toBe(100);
    });

    it("should cap pinned width to one third of available width", () => {
      expect(calculatePinnedWidth(200, 200, 300)).toBe(100);
    });
  });

  describe("getSectionWidth", () => {
    it("should clamp value within min and max", () => {
      expect(getSectionWidth(10, 100, 50)).toBe(50);
    });

    it("should return min when current is below min", () => {
      expect(getSectionWidth(10, 100, 5)).toBe(10);
    });

    it("should return max when current exceeds max", () => {
      expect(getSectionWidth(10, 100, 200)).toBe(100);
    });
  });

  describe("calculateSectionWidth", () => {
    it("should update section widths within bounds", () => {
      const curr = { left: 100, center: 200, right: 100 };
      const result = calculateSectionWidth(curr, { left: 120 });

      expect(result.left).toBe(120);
      expect(result.center).toBe(180);
    });

    it("should not change sections not specified in 'to'", () => {
      const curr = { left: 100, center: 200, right: 100 };
      const result = calculateSectionWidth(curr, { left: 100 });

      expect(result.right).toBe(100);
    });
  });

  describe("checkIndexes", () => {
    it("should return true when indexes are out of bounds", () => {
      const indexes = {
        cols: { start: 0, end: 10 },
        rows: { start: 0, end: 20 },
      };
      const current = {
        cols: { start: 2, end: 8 },
        rows: { start: 2, end: 15 },
      };

      expect(checkIndexes(indexes, current)).toBe(true);
    });

    it("should return false when indexes are within bounds", () => {
      const indexes = {
        cols: { start: 3, end: 7 },
        rows: { start: 3, end: 10 },
      };
      const current = {
        cols: { start: 2, end: 8 },
        rows: { start: 2, end: 15 },
      };

      expect(checkIndexes(indexes, current)).toBe(false);
    });
  });

  describe("calculateBufferIndexes", () => {
    it("should expand indexes by buffer amounts", () => {
      const indexes = {
        cols: { start: 5, end: 10 },
        rows: { start: 5, end: 10 },
      };

      const result = calculateBufferIndexes(
        indexes,
        mockInternalColumns,
        2,
        2,
        20
      );
      expect(result.cols.start).toBe(3);
      expect(result.rows.start).toBe(3);
      expect(result.rows.end).toBe(12);
    });

    it("should clamp to zero for start indexes", () => {
      const indexes = {
        cols: { start: 0, end: 1 },
        rows: { start: 0, end: 5 },
      };

      const result = calculateBufferIndexes(
        indexes,
        mockInternalColumns,
        3,
        3,
        20
      );
      expect(result.cols.start).toBe(0);
      expect(result.rows.start).toBe(0);
    });
  });

  describe("getPositionValue", () => {
    it("should return clamped value when within bounds", () => {
      expect(getPositionValue(-50, -200)).toBe(-50);
    });

    it("should return 0 when clamp max is 0", () => {
      expect(getPositionValue(0, 0)).toBe(0);
    });
  });

  describe("getParentKeys", () => {
    it("should return empty array for key without separator", () => {
      expect(getParentKeys("single")).toEqual([]);
    });

    it("should return parent key for two-level key", () => {
      const key = `parent${GROUP_KEY_SEPARATOR}child`;
      expect(getParentKeys(key)).toEqual(["parent"]);
    });

    it("should return all parent keys for multi-level key", () => {
      const key = `a${GROUP_KEY_SEPARATOR}b${GROUP_KEY_SEPARATOR}c`;
      const result = getParentKeys(key);

      expect(result).toEqual(["a", `a${GROUP_KEY_SEPARATOR}b`]);
    });
  });

  describe("createOptions", () => {
    it("should create select options from string array", () => {
      const result = createOptions(["hello", "world"]);

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe("hello");
      expect(result[0].label).toBe("Hello");
    });
  });

  describe("expandRows", () => {
    it("should return rows unchanged when no expanded rows", () => {
      const groupRow: RowNode<TestData> = {
        children: [mockRows[0]],
        level: 0,
        __id: "g1",
        __index: 0,
        data: { col_a: "Group", col_b: 0 },
        group: true,
        groupKey: "g1",
      };

      const result = expandRows([groupRow], [], mockInternalColumns);
      expect(result).toHaveLength(1);
      expect(result[0].expanded).toBeUndefined();
    });

    it("should expand rows that are marked as expanded", () => {
      const child: RowNode<TestData> = {
        children: [],
        level: 0,
        __id: "r1",
        __index: 0,
        data: { col_a: "Alice", col_b: 30 },
      };
      const groupRow: RowNode<TestData> = {
        children: [child],
        level: 0,
        __id: "g1",
        __index: 0,
        data: { col_a: "Group", col_b: 0 },
        group: true,
        groupKey: "g1",
      };
      const expandedRows: RowNode<TestData>[] = [
        { ...groupRow, expanded: true },
      ];

      const result = expandRows([groupRow], expandedRows, mockInternalColumns);
      expect(result.length).toBeGreaterThan(1);
      expect(result[0].expanded).toBe(true);
    });
  });

  describe("randomValue", () => {
    it("should return a value within the given range", () => {
      const result = randomValue(10, 20);
      expect(result).toBeGreaterThanOrEqual(10);
      expect(result).toBeLessThanOrEqual(20);
    });
  });

  describe("getDisplayValue", () => {
    it("should return field value from row data", () => {
      const col: SkiaGridColumn<TestData> = {
        name: "Col A",
        field: "col_a",
        colId: "col_a",
        width: 100,
      };
      const row: RowNode<TestData> = {
        children: [],
        level: 0,
        __id: "r1",
        __index: 0,
        data: { col_a: "Alice", col_b: 30 },
      };

      const [displayVal, rawVal] = getDisplayValue(col, row);
      expect(displayVal).toBe("Alice");
      expect(rawVal).toBe("Alice");
    });

    it("should use valueGetter when provided", () => {
      const col: SkiaGridColumn<TestData> = {
        name: "Col A",
        field: "col_a",
        colId: "col_a",
        width: 100,
        valueGetter: (row: RowNode<TestData>) => row.data.col_b * 2,
      };
      const row: RowNode<TestData> = {
        children: [],
        level: 0,
        __id: "r1",
        __index: 0,
        data: { col_a: "Alice", col_b: 15 },
      };

      const [displayVal] = getDisplayValue(col, row);
      expect(displayVal).toBe(30);
    });

    it("should use valueFormatter when provided", () => {
      const col: SkiaGridColumn<TestData> = {
        name: "Col B",
        field: "col_b",
        colId: "col_b",
        width: 80,
        valueFormatter: ({ value }: ValueFormatterArgs<TestData>) =>
          `$${value}`,
      };
      const row: RowNode<TestData> = {
        children: [],
        level: 0,
        __id: "r1",
        __index: 0,
        data: { col_a: "Alice", col_b: 50 },
      };

      const [displayVal, rawVal] = getDisplayValue(col, row);
      expect(displayVal).toBe("$50");
      expect(rawVal).toBe(50);
    });

    it("should return empty string when field value is undefined", () => {
      const col: SkiaGridColumn<TestData> = {
        name: "Date",
        field: "date",
        colId: "date",
        width: 60,
      };
      const row: RowNode<TestData> = {
        children: [],
        level: 0,
        __id: "r1",
        __index: 0,
        data: { col_a: "Alice", col_b: 10 },
      };

      const [displayVal] = getDisplayValue(col, row);
      expect(displayVal).toBe("");
    });
  });

  describe("isTopRowEmpty", () => {
    it("should return true for null", () => {
      expect(isTopRowEmpty(null)).toBe(true);
    });

    it("should return true when data values have no value property", () => {
      const row: RowNode<TestData> = {
        children: [],
        level: 0,
        __id: "r1",
        __index: 0,
        data: { col_a: "Alice", col_b: 10 },
      };
      expect(isTopRowEmpty(row)).toBe(true);
    });

    it("should return false when data has a property with a value field", () => {
      const row: RowNode<TestData> = {
        children: [],
        level: 0,
        __id: "r1",
        __index: 0,
        data: { col_a: { value: "test" }, col_b: 10 } as unknown as TestData,
      };
      expect(isTopRowEmpty(row)).toBe(false);
    });
  });

  describe("getColumnValue", () => {
    it("should return value from row data using field", () => {
      const result = getColumnValue(mockRows[0], mockInternalColumns[1]);
      expect(result).toBe(30);
    });

    it("should use valueGetter when provided", () => {
      const col: SkiaInternalGridColumn<TestData> = {
        id: "0",
        __id: "0",
        __index: 0,
        name: "Custom",
        field: "col_a",
        colId: "col_a",
        width: 100,
        valueGetter: (row: RowNode<TestData>) => row.data.col_a.toUpperCase(),
      };

      const result = getColumnValue(mockRows[0], col);
      expect(result).toBe("ALICE");
    });

    it("should return null for NaN string value", () => {
      const col: SkiaInternalGridColumn<TestData> = {
        id: "0",
        __id: "0",
        __index: 0,
        name: "Custom",
        field: "col_a",
        colId: "col_a",
        width: 100,
        valueGetter: () => "NaN",
      };

      const result = getColumnValue(mockRows[0], col);
      expect(result).toBeNull();
    });
  });

  describe("sortRows - edge cases", () => {
    it("should place undefined values before valid values in asc sort", () => {
      const rows: RowNode<TestData>[] = [
        {
          children: [],
          level: 0,
          __id: "r1",
          __index: 0,
          data: { col_a: "Alice", col_b: 10 },
        },
        {
          children: [],
          level: 0,
          __id: "r2",
          __index: 1,
          data: { col_a: "Bob", col_b: undefined as unknown as number },
        },
        {
          children: [],
          level: 0,
          __id: "r3",
          __index: 2,
          data: { col_a: "Charlie", col_b: 5 },
        },
      ];
      const sortStatus: MultiColumnSortStatus = [
        { columnId: "1", sort: "asc", sortIndex: 0 },
      ];

      const result = sortRows(rows, mockInternalColumns, sortStatus);
      expect(result[0].data.col_a).toBe("Bob");
    });

    it("should sort by absolute value when sortByAbsoluteValue is true", () => {
      const cols: SkiaInternalGridColumn<TestData>[] = [
        {
          id: "0",
          __id: "0",
          __index: 0,
          name: "Col B",
          field: "col_b",
          width: 80,
          colId: "col_b",
          sortByAbsoluteValue: true,
        },
      ];
      const rows: RowNode<TestData>[] = [
        {
          children: [],
          level: 0,
          __id: "r1",
          __index: 0,
          data: { col_a: "A", col_b: -30 },
        },
        {
          children: [],
          level: 0,
          __id: "r2",
          __index: 1,
          data: { col_a: "B", col_b: 10 },
        },
        {
          children: [],
          level: 0,
          __id: "r3",
          __index: 2,
          data: { col_a: "C", col_b: -20 },
        },
      ];
      const sortStatus: MultiColumnSortStatus = [
        { columnId: "0", sort: "asc", sortIndex: 0 },
      ];

      const result = sortRows(rows, cols, sortStatus);
      expect(Math.abs(result[0].data.col_b)).toBeLessThanOrEqual(
        Math.abs(result[1].data.col_b)
      );
    });

    it("should skip column when columnId is not found", () => {
      const sortStatus: MultiColumnSortStatus = [
        { columnId: "nonexistent", sort: "asc", sortIndex: 0 },
      ];

      const result = sortRows(mockRows, mockInternalColumns, sortStatus);
      expect(result).toHaveLength(3);
    });
  });

  describe("getParentRowNodeKeys", () => {
    it("should return keys for a row based on grouped columns", () => {
      const groupCol: SkiaInternalGridColumn<TestData> = {
        id: "date",
        __id: "date",
        __index: 0,
        name: "Date",
        field: "date",
        width: 80,
        colId: "date",
      };
      const row: RowNode<TestData> = {
        children: [],
        level: 0,
        __id: "r1",
        __index: 0,
        data: { col_a: "Alice", col_b: 10, date: "A" },
      };

      const result = getParentRowNodeKeys(row, [groupCol]);
      expect(result).toEqual(["A"]);
    });

    it("should chain keys with separator for multiple group columns", () => {
      const col1: SkiaInternalGridColumn<TestData> = {
        id: "date",
        __id: "date",
        __index: 0,
        name: "Date",
        field: "date",
        width: 80,
        colId: "date",
      };
      const col2: SkiaInternalGridColumn<TestData> = {
        id: "col_a",
        __id: "col_a",
        __index: 1,
        name: "Col A",
        field: "col_a",
        width: 100,
        colId: "col_a",
      };
      const row: RowNode<TestData> = {
        children: [],
        level: 0,
        __id: "r1",
        __index: 0,
        data: { col_a: "Alice", col_b: 10, date: "A" },
      };

      const result = getParentRowNodeKeys(row, [col1, col2]);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe("A");
      expect(result[1]).toBe(`A${GROUP_KEY_SEPARATOR}Alice`);
    });
  });

  describe("groupRows", () => {
    it("should group rows by a single column", () => {
      const groupCol: SkiaInternalGridColumn<TestData> = {
        id: "date",
        __id: "date",
        __index: 0,
        name: "Date",
        field: "date",
        width: 80,
        colId: "date",
        rowGroup: true,
        rowGroupIndex: 0,
      };
      const rows: RowNode<TestData>[] = [
        {
          children: [],
          level: 0,
          __id: "r1",
          __index: 0,
          data: { col_a: "Alice", col_b: 10, date: "A" },
        },
        {
          children: [],
          level: 0,
          __id: "r2",
          __index: 1,
          data: { col_a: "Bob", col_b: 20, date: "A" },
        },
        {
          children: [],
          level: 0,
          __id: "r3",
          __index: 2,
          data: { col_a: "Charlie", col_b: 30, date: "B" },
        },
      ];

      const result = groupRows(
        [],
        rows,
        [groupCol],
        [...mockInternalColumns, groupCol]
      );
      expect(result.length).toBe(2);
      expect(result[0].group).toBe(true);
      expect(result[0].children.length).toBeGreaterThan(0);
    });

    it("should return empty array when no rows", () => {
      const groupCol: SkiaInternalGridColumn<TestData> = {
        id: "date",
        __id: "date",
        __index: 0,
        name: "Date",
        field: "date",
        width: 80,
        colId: "date",
        rowGroup: true,
        rowGroupIndex: 0,
      };

      const result = groupRows([], [], [groupCol], [groupCol]);
      expect(result).toEqual([]);
    });
  });

  describe("getFilteringFunction", () => {
    const filterCol: SkiaInternalGridColumn<TestData> = {
      id: "col_a",
      __id: "col_a",
      __index: 0,
      name: "Col A",
      field: "col_a",
      width: 100,
      colId: "col_a",
    };

    describe("text filter", () => {
      it("should filter rows with contains", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [{ type: "contains", filterType: "text", filter: "ali" }],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          filterCol,
          FilterTypes.Text
        );
        expect(filterFn(mockRows[0])).toBe(true);
        expect(filterFn(mockRows[1])).toBe(false);
      });

      it("should filter rows with equals", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [{ type: "equals", filterType: "text", filter: "alice" }],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          filterCol,
          FilterTypes.Text
        );
        expect(filterFn(mockRows[0])).toBe(true);
        expect(filterFn(mockRows[1])).toBe(false);
      });

      it("should support OR join operator", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "OR",
          conditions: [
            { type: "equals", filterType: "text", filter: "alice" },
            { type: "equals", filterType: "text", filter: "bob" },
          ],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          filterCol,
          FilterTypes.Text
        );
        expect(filterFn(mockRows[0])).toBe(true);
        expect(filterFn(mockRows[1])).toBe(true);
        expect(filterFn(mockRows[2])).toBe(false);
      });

      it("should return true when conditions are empty", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          filterCol,
          FilterTypes.Text
        );
        expect(filterFn(mockRows[0])).toBe(true);
      });

      it("should handle notContains filter", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [
            { type: "notContains", filterType: "text", filter: "ali" },
          ],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          filterCol,
          FilterTypes.Text
        );
        expect(filterFn(mockRows[0])).toBe(false);
        expect(filterFn(mockRows[1])).toBe(true);
      });

      it("should handle startsWith filter", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [
            { type: "startsWith", filterType: "text", filter: "cha" },
          ],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          filterCol,
          FilterTypes.Text
        );
        expect(filterFn(mockRows[2])).toBe(true);
        expect(filterFn(mockRows[0])).toBe(false);
      });

      it("should handle endsWith filter", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [{ type: "endsWith", filterType: "text", filter: "ice" }],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          filterCol,
          FilterTypes.Text
        );
        expect(filterFn(mockRows[0])).toBe(true);
        expect(filterFn(mockRows[1])).toBe(false);
      });
    });

    describe("number filter", () => {
      const numCol: SkiaInternalGridColumn<TestData> = {
        id: "col_b",
        __id: "col_b",
        __index: 1,
        name: "Col B",
        field: "col_b",
        width: 80,
        colId: "col_b",
      };

      it("should filter numbers with equals", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [{ type: "equals", filterType: "number", filter: 30 }],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          numCol,
          FilterTypes.Number
        );
        expect(filterFn(mockRows[0])).toBe(true);
        expect(filterFn(mockRows[1])).toBe(false);
      });

      it("should filter numbers with greaterThan", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [
            { type: "greaterThan", filterType: "number", filter: 15 },
          ],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          numCol,
          FilterTypes.Number
        );
        expect(filterFn(mockRows[0])).toBe(true);
        expect(filterFn(mockRows[1])).toBe(false);
      });

      it("should filter numbers with lessThan", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [{ type: "lessThan", filterType: "number", filter: 15 }],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          numCol,
          FilterTypes.Number
        );
        expect(filterFn(mockRows[1])).toBe(true);
        expect(filterFn(mockRows[0])).toBe(false);
      });

      it("should filter numbers with inRange", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [
            { type: "inRange", filterType: "number", filter: 5, filterTo: 25 },
          ],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          numCol,
          FilterTypes.Number
        );
        expect(filterFn(mockRows[1])).toBe(true);
        expect(filterFn(mockRows[2])).toBe(true);
        expect(filterFn(mockRows[0])).toBe(false);
      });
    });

    it("should return always-true for unknown filter type", () => {
      const combinedFilter: CombinedFilterModel = {
        joinOperator: "AND",
        conditions: [{ type: "equals", filterType: "text", filter: "x" }],
      };

      const filterFn = getFilteringFunction(
        combinedFilter,
        filterCol,
        "unknown" as "text"
      );
      expect(filterFn(mockRows[0])).toBe(true);
    });
  });

  describe("getFilteredRows", () => {
    it("should return all rows when filter state is empty", () => {
      const result = getFilteredRows(mockRows, new Map(), mockInternalColumns);
      expect(result).toHaveLength(3);
    });

    it("should filter rows by text filter", () => {
      const filterState = new Map<string, ColumnFilterState>([
        [
          "col_a",
          {
            id: "col_a",
            filterIndex: 0,
            filterType: FilterTypes.Text,
            filters: [
              {
                joinOperator: "AND",
                conditions: [
                  { type: "contains", filterType: "text", filter: "Ali" },
                ],
              },
            ],
          },
        ],
      ]);

      const cols = mockInternalColumns.map((c) => ({
        ...c,
        filterType: FilterTypes.Text as "text",
      }));

      const result = getFilteredRows(mockRows, filterState, cols);
      expect(result).toHaveLength(1);
      expect(result[0].data.col_a).toBe("Alice");
    });

    it("should filter rows by set filter", () => {
      const setFilter: SetFilterType = {
        values: ["Alice", "Charlie"],
        filterType: "set",
      };
      const filterState = new Map<string, ColumnFilterState>([
        [
          "col_a",
          {
            id: "col_a",
            filterIndex: 0,
            filterType: FilterTypes.Set as "set",
            filters: [setFilter],
          },
        ],
      ]);

      const cols = mockInternalColumns.map((c) => ({
        ...c,
        filterType: FilterTypes.Set as "set",
      }));

      const result = getFilteredRows(mockRows, filterState, cols);
      expect(result).toHaveLength(2);
    });
  });

  describe("getFolderCalculatedCheckedState", () => {
    it("should return 0 for empty rows", () => {
      const result = getFolderCalculatedCheckedState([], new Map());
      expect(result).toBe(0);
    });

    it("should return 1 when all leaf nodes are selected", () => {
      const map = new Map<string, 0 | 1 | 2>([
        ["r1", 1],
        ["r2", 1],
      ]);
      expect(getFolderCalculatedCheckedState(mockRows.slice(0, 2), map)).toBe(
        1
      );
    });

    it("should return 0 when no leaf nodes are selected", () => {
      const map = new Map<string, 0 | 1 | 2>([
        ["r1", 0],
        ["r2", 0],
      ]);
      expect(getFolderCalculatedCheckedState(mockRows.slice(0, 2), map)).toBe(
        0
      );
    });

    it("should return 2 (partial) when some leaf nodes are selected", () => {
      const map = new Map<string, 0 | 1 | 2>([
        ["r1", 1],
        ["r2", 0],
      ]);
      expect(getFolderCalculatedCheckedState(mockRows.slice(0, 2), map)).toBe(
        2
      );
    });
  });

  describe("updateLeafNodeSelectionState", () => {
    it("should set selection state on leaf children", () => {
      const parent: RowNode<TestData> = {
        children: [mockRows[0], mockRows[1]],
        level: 0,
        __id: "parent",
        __index: 0,
        data: { col_a: "Parent", col_b: 0 },
      };
      const map = new Map<string, 0 | 1>();

      updateLeafNodeSelectionState(parent, map, 1);
      expect(map.get("r1")).toBe(1);
      expect(map.get("r2")).toBe(1);
    });

    it("should recurse into nested children", () => {
      const grandchild: RowNode<TestData> = {
        children: [],
        level: 0,
        __id: "gc1",
        __index: 0,
        data: { col_a: "GC", col_b: 0 },
      };
      const child: RowNode<TestData> = {
        children: [grandchild],
        level: 0,
        __id: "c1",
        __index: 0,
        data: { col_a: "Child", col_b: 0 },
      };
      const parent: RowNode<TestData> = {
        children: [child],
        level: 0,
        __id: "parent",
        __index: 0,
        data: { col_a: "Parent", col_b: 0 },
      };
      const map = new Map<string, 0 | 1>();

      updateLeafNodeSelectionState(parent, map, 1);
      expect(map.get("gc1")).toBe(1);
    });
  });

  describe("getSelectedRows", () => {
    it("should return selected leaf rows", () => {
      const map = new Map<string, 0 | 1 | 2>([
        ["r1", 1],
        ["r2", 0],
        ["r3", 1],
      ]);

      const result = getSelectedRows(mockRows, map);
      expect(result).toHaveLength(2);
      expect(result[0].__id).toBe("r1");
      expect(result[1].__id).toBe("r3");
    });

    it("should return empty array when none selected", () => {
      const map = new Map<string, 0 | 1 | 2>([
        ["r1", 0],
        ["r2", 0],
      ]);

      const result = getSelectedRows(mockRows.slice(0, 2), map);
      expect(result).toHaveLength(0);
    });

    it("should recurse into group children", () => {
      const parent: RowNode<TestData> = {
        children: [mockRows[0], mockRows[1]],
        level: 0,
        __id: "parent",
        __index: 0,
        data: { col_a: "Parent", col_b: 0 },
        group: true,
      };
      const map = new Map<string, 0 | 1 | 2>([
        ["r1", 1],
        ["r2", 0],
      ]);

      const result = getSelectedRows([parent], map);
      expect(result).toHaveLength(1);
      expect(result[0].__id).toBe("r1");
    });
  });

  describe("deriveIndexes", () => {
    it("should compute visible column and row indexes", () => {
      const columns = [100, 80, 120, 60];
      const result = deriveIndexes(columns, 30, 0, 0, 300, 150, 500, 360, 10);

      expect(result.cols.start).toBe(0);
      expect(result.rows.start).toBe(0);
      expect(result.rows.end).toBeLessThanOrEqual(9);
    });

    it("should compute correct start col when scrolled horizontally", () => {
      const columns = [100, 80, 120, 60];
      const result = deriveIndexes(
        columns,
        30,
        -150,
        0,
        200,
        150,
        500,
        360,
        10
      );

      expect(result.cols.start).toBeGreaterThanOrEqual(1);
    });

    it("should compute correct start row when scrolled vertically", () => {
      const columns = [100, 80];
      const result = deriveIndexes(columns, 30, 0, -90, 300, 150, 500, 180, 20);

      expect(result.rows.start).toBe(3);
    });

    it("should handle case where total column width is less than viewport", () => {
      const columns = [50, 50];
      const result = deriveIndexes(columns, 30, 0, 0, 300, 150, 500, 100, 5);

      expect(result.cols.end).toBe(1);
    });
  });

  describe("applyGridTransaction", () => {
    it("should add rows via transaction", () => {
      const existingRows: RowNode<TestData>[] = [
        {
          children: [],
          level: 0,
          __id: "r1",
          __index: 0,
          data: { col_a: "Alice", col_b: 10 },
        },
      ];
      const mockSetRowData = jest.fn();
      const getRowId = (row: TestData) => row.col_a;

      applyGridTransaction(
        { add: [{ col_a: "Bob", col_b: 20 }] },
        existingRows,
        mockSetRowData,
        getRowId
      );

      expect(mockSetRowData).toHaveBeenCalledTimes(1);
      const newRows = mockSetRowData.mock.calls[0][0] as RowNode<TestData>[];
      expect(newRows).toHaveLength(2);
    });

    it("should update rows via transaction", () => {
      const existingRows: RowNode<TestData>[] = [
        {
          children: [],
          level: 0,
          __id: "Alice",
          __index: 0,
          id: "Alice",
          data: { col_a: "Alice", col_b: 10 },
        },
      ];
      const mockSetRowData = jest.fn();
      const getRowId = (row: TestData) => row.col_a;

      applyGridTransaction(
        { update: [{ col_a: "Alice", col_b: 99 }] },
        existingRows,
        mockSetRowData,
        getRowId
      );

      expect(mockSetRowData).toHaveBeenCalledTimes(1);
      const updatedRows = mockSetRowData.mock
        .calls[0][2] as RowNode<TestData>[];
      expect(updatedRows).toHaveLength(1);
      expect(updatedRows[0].data.col_b).toBe(99);
    });

    it("should remove rows via transaction", () => {
      const existingRows: RowNode<TestData>[] = [
        {
          children: [],
          level: 0,
          __id: "Alice",
          __index: 0,
          id: "Alice",
          data: { col_a: "Alice", col_b: 10 },
        },
        {
          children: [],
          level: 0,
          __id: "Bob",
          __index: 1,
          id: "Bob",
          data: { col_a: "Bob", col_b: 20 },
        },
      ];
      const mockSetRowData = jest.fn();
      const getRowId = (row: TestData) => row.col_a;

      applyGridTransaction(
        { remove: [{ col_a: "Alice", col_b: 10 }] },
        existingRows,
        mockSetRowData,
        getRowId
      );

      expect(mockSetRowData).toHaveBeenCalledTimes(1);
      const newRows = mockSetRowData.mock.calls[0][0] as RowNode<TestData>[];
      expect(newRows).toHaveLength(1);
      expect(newRows[0].data.col_a).toBe("Bob");
    });

    it("should not call setRowData when transaction has no changes", () => {
      const existingRows: RowNode<TestData>[] = [
        {
          children: [],
          level: 0,
          __id: "r1",
          __index: 0,
          data: { col_a: "Alice", col_b: 10 },
        },
      ];
      const mockSetRowData = jest.fn();

      applyGridTransaction({}, existingRows, mockSetRowData);

      expect(mockSetRowData).not.toHaveBeenCalled();
    });

    it("should handle array of transactions", () => {
      const existingRows: RowNode<TestData>[] = [];
      const mockSetRowData = jest.fn();
      const getRowId = (row: TestData) => row.col_a;

      applyGridTransaction(
        [
          { add: [{ col_a: "Alice", col_b: 10 }] },
          { add: [{ col_a: "Bob", col_b: 20 }] },
        ],
        existingRows,
        mockSetRowData,
        getRowId
      );

      expect(mockSetRowData).toHaveBeenCalledTimes(1);
      const newRows = mockSetRowData.mock.calls[0][0] as RowNode<TestData>[];
      expect(newRows).toHaveLength(2);
    });
  });

  describe("getFilteringFunction - additional branches", () => {
    const filterCol: SkiaInternalGridColumn<TestData> = {
      id: "col_a",
      __id: "col_a",
      __index: 0,
      name: "Col A",
      field: "col_a",
      width: 100,
      colId: "col_a",
    };

    it("should handle blank text filter", () => {
      const combinedFilter: CombinedFilterModel = {
        joinOperator: "AND",
        conditions: [{ type: "blank", filterType: "text" }],
      };

      const filterFn = getFilteringFunction(
        combinedFilter,
        filterCol,
        FilterTypes.Text
      );
      const emptyRow: RowNode<TestData> = {
        children: [],
        level: 0,
        __id: "e1",
        __index: 0,
        data: { col_a: "", col_b: 0 },
      };
      expect(filterFn(emptyRow)).toBe(true);
      expect(filterFn(mockRows[0])).toBe(false);
    });

    it("should handle notBlank text filter", () => {
      const combinedFilter: CombinedFilterModel = {
        joinOperator: "AND",
        conditions: [{ type: "notBlank", filterType: "text" }],
      };

      const filterFn = getFilteringFunction(
        combinedFilter,
        filterCol,
        FilterTypes.Text
      );
      const emptyRow: RowNode<TestData> = {
        children: [],
        level: 0,
        __id: "e1",
        __index: 0,
        data: { col_a: "", col_b: 0 },
      };
      expect(filterFn(emptyRow)).toBe(false);
      expect(filterFn(mockRows[0])).toBe(true);
    });

    it("should handle notEqual text filter", () => {
      const combinedFilter: CombinedFilterModel = {
        joinOperator: "AND",
        conditions: [{ type: "notEqual", filterType: "text", filter: "alice" }],
      };

      const filterFn = getFilteringFunction(
        combinedFilter,
        filterCol,
        FilterTypes.Text
      );
      expect(filterFn(mockRows[0])).toBe(false);
      expect(filterFn(mockRows[1])).toBe(true);
    });

    describe("number filter - null handling", () => {
      const numCol: SkiaInternalGridColumn<TestData> = {
        id: "col_b",
        __id: "col_b",
        __index: 1,
        name: "Col B",
        field: "col_b",
        width: 80,
        colId: "col_b",
      };

      it("should handle blank number filter for null values", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [{ type: "blank", filterType: "number" }],
        };

        const nullRow: RowNode<TestData> = {
          children: [],
          level: 0,
          __id: "n1",
          __index: 0,
          data: { col_a: "Null", col_b: undefined as unknown as number },
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          numCol,
          FilterTypes.Number
        );
        expect(filterFn(nullRow)).toBe(true);
      });

      it("should handle notEqual number filter", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [{ type: "notEqual", filterType: "number", filter: 30 }],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          numCol,
          FilterTypes.Number
        );
        expect(filterFn(mockRows[0])).toBe(false);
        expect(filterFn(mockRows[1])).toBe(true);
      });

      it("should handle greaterThanOrEqual number filter", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [
            { type: "greaterThanOrEqual", filterType: "number", filter: 20 },
          ],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          numCol,
          FilterTypes.Number
        );
        expect(filterFn(mockRows[0])).toBe(true);
        expect(filterFn(mockRows[2])).toBe(true);
        expect(filterFn(mockRows[1])).toBe(false);
      });

      it("should handle lessThanOrEqual number filter", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [
            { type: "lessThanOrEqual", filterType: "number", filter: 20 },
          ],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          numCol,
          FilterTypes.Number
        );
        expect(filterFn(mockRows[1])).toBe(true);
        expect(filterFn(mockRows[2])).toBe(true);
        expect(filterFn(mockRows[0])).toBe(false);
      });

      it("should handle OR join operator for number filter", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "OR",
          conditions: [
            { type: "equals", filterType: "number", filter: 30 },
            { type: "equals", filterType: "number", filter: 10 },
          ],
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          numCol,
          FilterTypes.Number
        );
        expect(filterFn(mockRows[0])).toBe(true);
        expect(filterFn(mockRows[1])).toBe(true);
        expect(filterFn(mockRows[2])).toBe(false);
      });
    });

    describe("date filter", () => {
      const dateCol: SkiaInternalGridColumn<TestData> = {
        id: "date",
        __id: "date",
        __index: 0,
        name: "Date",
        field: "date",
        width: 120,
        colId: "date",
      };

      it("should filter dates with equals", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [
            { type: "equals", filterType: "date", filter: "2024-01-15" },
          ],
        };

        const row: RowNode<TestData> = {
          children: [],
          level: 0,
          __id: "d1",
          __index: 0,
          data: {
            col_a: "Test",
            col_b: 0,
            date: "2024-01-15",
          },
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          dateCol,
          FilterTypes.Date,
          { mode: "date" }
        );
        expect(filterFn(row)).toBe(true);
      });

      it("should filter dates with greaterThan", () => {
        const combinedFilter: CombinedFilterModel = {
          joinOperator: "AND",
          conditions: [
            { type: "greaterThan", filterType: "date", filter: "2024-01-10" },
          ],
        };

        const row: RowNode<TestData> = {
          children: [],
          level: 0,
          __id: "d1",
          __index: 0,
          data: {
            col_a: "Test",
            col_b: 0,
            date: "2024-01-15",
          },
        };

        const filterFn = getFilteringFunction(
          combinedFilter,
          dateCol,
          FilterTypes.Date,
          { mode: "date" }
        );
        expect(filterFn(row)).toBe(true);
      });
    });
  });

  describe("getFilteredRows - multi filter", () => {
    it("should handle multi filter type with nested filters", () => {
      const filterState = new Map<string, ColumnFilterState>([
        [
          "col_a",
          {
            id: "col_a",
            filterIndex: 0,
            filterType: FilterTypes.Multi as "multi",
            filters: [
              {
                joinOperator: "AND",
                conditions: [
                  { type: "contains", filterType: "text", filter: "Ali" },
                ],
              },
            ],
          },
        ],
      ]);

      const cols = mockInternalColumns.map((c) => ({
        ...c,
        filterType: FilterTypes.Multi as "multi",
        filterParams: {
          filters: [{ filterType: FilterTypes.Text as "text" }],
        },
      }));

      const result = getFilteredRows(mockRows, filterState, cols);
      expect(result).toHaveLength(1);
      expect(result[0].data.col_a).toBe("Alice");
    });
  });

  describe("groupRows - multi-level grouping", () => {
    it("should group rows by multiple columns", () => {
      const groupCol1: SkiaInternalGridColumn<TestData> = {
        id: "date",
        __id: "date",
        __index: 0,
        name: "Date",
        field: "date",
        width: 80,
        colId: "date",
        rowGroup: true,
        rowGroupIndex: 0,
      };
      const groupCol2: SkiaInternalGridColumn<TestData> = {
        id: "col_a",
        __id: "col_a",
        __index: 1,
        name: "Col A",
        field: "col_a",
        width: 100,
        colId: "col_a",
        rowGroup: true,
        rowGroupIndex: 1,
      };
      const rows: RowNode<TestData>[] = [
        {
          children: [],
          level: 0,
          __id: "r1",
          __index: 0,
          data: { col_a: "Alice", col_b: 10, date: "A" },
        },
        {
          children: [],
          level: 0,
          __id: "r2",
          __index: 1,
          data: { col_a: "Alice", col_b: 20, date: "A" },
        },
        {
          children: [],
          level: 0,
          __id: "r3",
          __index: 2,
          data: { col_a: "Bob", col_b: 30, date: "B" },
        },
      ];

      const allCols = [...mockInternalColumns, groupCol1, groupCol2];
      const result = groupRows([], rows, [groupCol1, groupCol2], allCols);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every((r) => r.group)).toBe(true);
    });
  });

  // ── Autosize: per-row content measurement ─────────────────────────────────
  // calculateRowColumnWidths feeds the column-width cache that autosize reads.
  // A fake font measures `charCount * W_PER_CHAR`; getTextWidth then applies
  // FONT_WIDTH_ADJ_MULTIPLIER (the fake font isn't registered via getFont, so
  // getTextWidth takes its uncached fallback path — same arithmetic).
  describe("calculateRowColumnWidths (autosize measurement)", () => {
    const W_PER_CHAR = 7;
    const fakeFont = {
      measureText: (t: string) => ({ width: t.length * W_PER_CHAR }),
    } as never;
    // Mirror getTextWidth's fallback: measureText().width * adjustment.
    const textW = (s: string) => s.length * W_PER_CHAR * FONT_WIDTH_ADJ_MULTIPLIER;

    const col = (
      over: Partial<SkiaInternalGridColumn> & { __id: string; name: string }
    ): SkiaInternalGridColumn =>
      ({
        id: over.__id,
        __index: 0,
        field: over.field ?? over.__id,
        colId: over.__id,
        width: 100,
        ...over,
      } as SkiaInternalGridColumn);

    const leaf = (data: Record<string, unknown>): RowNode =>
      ({ children: [], level: 0, __id: "r1", __index: 0, data } as RowNode);

    it("measures the wider of header and cell value for a visible column", () => {
      // header "Region" (6) < value "North America" (13) → value wins.
      const res = calculateRowColumnWidths(
        leaf({ region: "North America" }),
        [col({ __id: "region", name: "Region", field: "region" })],
        fakeFont
      );
      expect(res.region).toBeCloseTo(textW("North America"));
    });

    it("uses the header width when it exceeds the cell value", () => {
      // header "Loooong Header" (14) > value "x" (1) → header wins.
      const res = calculateRowColumnWidths(
        leaf({ a: "x" }),
        [col({ __id: "a", name: "Loooong Header", field: "a" })],
        fakeFont
      );
      expect(res.a).toBeCloseTo(textW("Loooong Header"));
    });

    it("skips hidden (non-group) columns and checkbox columns", () => {
      const res = calculateRowColumnWidths(
        leaf({ a: "value", b: "value", c: "value" }),
        [
          col({ __id: "a", name: "A", field: "a", hide: true }),
          col({ __id: "b", name: "B", field: "b", checkboxSelection: true }),
          col({ __id: "c", name: "C", field: "c" }),
        ],
        fakeFont
      );
      expect(res).not.toHaveProperty("a");
      expect(res).not.toHaveProperty("b");
      expect(res).toHaveProperty("c");
    });

    it("measures the LEAF data value for a hidden row-group column", () => {
      // Regression for the grouped-column autosize bug: a row-group column is
      // hidden, but its values must still be measured (they drive the group
      // column width). Previously only groupRowData was read — empty on leaf
      // rows — so the column cached just its header width.
      const regionCol = col({
        __id: "region",
        name: "Region",
        field: "region",
        hide: true,
        rowGroup: true,
        rowGroupIndex: 0,
      });
      const res = calculateRowColumnWidths(
        leaf({ region: "North America" }),
        [regionCol],
        fakeFont
      );
      expect(res.region).toBeCloseTo(textW("North America"));
      // The value, not just the header, was measured.
      expect(res.region).toBeGreaterThan(textW("Region"));
    });

    it("measures groupRowData for a row-group column on a group node", () => {
      const regionCol = col({
        __id: "region",
        name: "Region",
        field: "region",
        hide: true,
        rowGroup: true,
        rowGroupIndex: 0,
      });
      const groupNode = {
        children: [],
        level: 0,
        __id: "g1",
        __index: -1,
        group: true,
        groupRowData: { region: "Asia Pacific Region" },
      } as unknown as RowNode;
      const res = calculateRowColumnWidths(groupNode, [regionCol], fakeFont);
      expect(res.region).toBeCloseTo(textW("Asia Pacific Region"));
    });

    it("returns zero widths when no font is supplied", () => {
      const res = calculateRowColumnWidths(leaf({ a: "value" }), [
        col({ __id: "a", name: "A", field: "a" }),
      ]);
      expect(res.a).toBe(0);
    });
  });
});
