import type {
  ColumnFilterState,
  GridCommand,
  GridEvent,
  MultiColumnSortStatus,
  RowNode,
  SkiaInternalGridColumn,
} from "../../types";
import {
  RowEventTypes,
  type RowsChangedEvent,
} from "../../events/rowEvents";
import {
  ColumnEventTypes,
  type ColumnsChangedEvent,
  type FilterChangedEvent,
  type SortChangedEvent,
} from "../../events/columnEvents";
import {
  RowCommandTypes,
  RowManager,
  type RowManagerCommand,
} from "../RowManager";

type Row = { id: string; value: number };

function makeCol(
  overrides: Partial<SkiaInternalGridColumn<Row>> = {}
): SkiaInternalGridColumn<Row> {
  return {
    id: overrides.id ?? "value",
    __id: overrides.__id ?? overrides.id ?? "value",
    __index: overrides.__index ?? 0,
    name: overrides.name ?? "Value",
    field: overrides.field ?? "value",
    colId: overrides.colId ?? "value",
    width: overrides.width ?? 100,
    pinned: overrides.pinned ?? null,
    hide: overrides.hide ?? false,
    ...overrides,
  } as SkiaInternalGridColumn<Row>;
}

function makeRow(id: string, value: number, index: number): RowNode<Row> {
  return {
    id,
    __id: id,
    __index: index,
    children: [],
    level: 0,
    data: { id, value },
  } as RowNode<Row>;
}

type EmittedEvent = GridEvent;

function createHostStub() {
  const emits: EmittedEvent[] = [];
  const listeners = new Map<string, Set<(event: GridEvent) => void>>();
  const host = {
    emit: (event: GridEvent) => {
      emits.push(event);
      listeners.get(event.type)?.forEach((l) => l(event));
    },
    dispatch: (_c: GridCommand) => {},
    on: (type: string, listener: (event: GridEvent) => void) => {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(listener);
      return () => {
        set?.delete(listener);
      };
    },
  };
  return { host, emits };
}

function dispatch<T extends Object>(
  rm: RowManager<T>,
  command: RowManagerCommand<T>
): void {
  rm.handle(command);
}

describe("RowManager", () => {
  it("should return empty rows before any dispatch", () => {
    const rm = new RowManager<Row>();
    expect(rm.getRows()).toEqual([]);
    expect(rm.getFilteredRows()).toEqual([]);
  });

  it("should populate currentRows after SetRows + emit RowsChanged", () => {
    const rm = new RowManager<Row>();
    const { host, emits } = createHostStub();
    rm.init(host);

    const rows = [makeRow("a", 1, 0), makeRow("b", 2, 1)];
    dispatch(rm, { type: RowCommandTypes.SetRows, rows });

    expect(rm.getRows()).toHaveLength(2);
    expect(emits).toHaveLength(1);
    expect(emits[0].type).toBe(RowEventTypes.RowsChanged);
    expect((emits[0] as RowsChangedEvent<Row>).rows).toHaveLength(2);
  });

  it("should skip recompute + emit when a dispatch sets same reference", () => {
    const rm = new RowManager<Row>();
    const { host, emits } = createHostStub();
    rm.init(host);

    const rows = [makeRow("a", 1, 0)];
    dispatch(rm, { type: RowCommandTypes.SetRows, rows });
    expect(emits).toHaveLength(1);

    // Same reference — should short-circuit.
    dispatch(rm, { type: RowCommandTypes.SetRows, rows });
    expect(emits).toHaveLength(1);
  });

  it("should recompute when a dispatch sets a different reference", () => {
    const rm = new RowManager<Row>();
    const { host, emits } = createHostStub();
    rm.init(host);

    dispatch(rm, {
      type: RowCommandTypes.SetRows,
      rows: [makeRow("a", 1, 0)],
    });
    // Different array, same content — still a ref change.
    dispatch(rm, {
      type: RowCommandTypes.SetRows,
      rows: [makeRow("a", 1, 0)],
    });
    expect(emits).toHaveLength(2);
  });

  it("should apply filterState via the filter pipeline", () => {
    const rm = new RowManager<Row>();
    const { host, emits } = createHostStub();
    rm.init(host);

    const col = makeCol({ id: "value", field: "value", filterType: "number" });
    const rows = [
      makeRow("a", 1, 0),
      makeRow("b", 2, 1),
      makeRow("c", 3, 2),
    ];

    dispatch(rm, { type: RowCommandTypes.SetRows, rows });
    // Columns + filter state are owned by ColumnManager; RowManager consumes
    // them via subscriptions, so the test drives it by emitting column events
    // directly on the host stub.
    host.emit({
      type: ColumnEventTypes.ColumnsChanged,
      columns: [col],
    } as ColumnsChangedEvent<Row>);

    const filterState: Map<string, ColumnFilterState> = new Map([
      [
        "value",
        {
          id: "value",
          filterIndex: 0,
          filterType: "number",
          filters: [
            {
              conditions: [{ type: "equals", filterType: "number", filter: 2 }],
              joinOperator: "AND",
              filterType: "number",
            },
          ],
        } as ColumnFilterState,
      ],
    ]);

    host.emit({
      type: ColumnEventTypes.FilterChanged,
      filterState,
    } as FilterChangedEvent);

    const result = rm.getRows();
    expect(result).toHaveLength(1);
    expect(result[0].data.value).toBe(2);
    // Output reference stable across successive getRows() calls.
    expect(rm.getRows()).toBe(result);
  });

  it("should apply sortStatus via the sort pipeline", () => {
    const rm = new RowManager<Row>();
    const { host } = createHostStub();
    rm.init(host);

    const col = makeCol({ id: "value", field: "value", sortable: true });
    dispatch(rm, {
      type: RowCommandTypes.SetRows,
      rows: [makeRow("a", 3, 0), makeRow("b", 1, 1), makeRow("c", 2, 2)],
    });
    host.emit({
      type: ColumnEventTypes.ColumnsChanged,
      columns: [col],
    } as ColumnsChangedEvent<Row>);

    const sortStatus: MultiColumnSortStatus = [
      { columnId: "value", sort: "asc", sortIndex: 0 },
    ];
    host.emit({
      type: ColumnEventTypes.SortChanged,
      sortStatus,
    } as SortChangedEvent);

    const result = rm.getRows();
    expect(result.map((r) => r.data.value)).toEqual([1, 2, 3]);
  });

  it("should emit RowsChanged from replaceRenderedRows without affecting memoization", () => {
    const rm = new RowManager<Row>();
    const { host, emits } = createHostStub();
    rm.init(host);

    const rows = [makeRow("a", 1, 0), makeRow("b", 2, 1)];
    dispatch(rm, { type: RowCommandTypes.SetRows, rows });
    expect(emits).toHaveLength(1);

    const replaced = [makeRow("a-expanded", 1, 0), makeRow("b", 2, 1)];
    rm.replaceRenderedRows(replaced);
    expect(emits).toHaveLength(2);
    expect(rm.getRows()).toBe(replaced);

    // A subsequent no-op dispatch (same refs) still short-circuits —
    // replaceRenderedRows does not invalidate the memoization key, so
    // the pipeline doesn't overwrite the expanded array.
    dispatch(rm, { type: RowCommandTypes.SetRows, rows });
    expect(emits).toHaveLength(2);
    expect(rm.getRows()).toBe(replaced);
  });

  it("should stop emitting after dispose()", () => {
    const rm = new RowManager<Row>();
    const { host, emits } = createHostStub();
    rm.init(host);

    dispatch(rm, {
      type: RowCommandTypes.SetRows,
      rows: [makeRow("a", 1, 0)],
    });
    expect(emits).toHaveLength(1);

    rm.dispose();
    dispatch(rm, {
      type: RowCommandTypes.SetRows,
      rows: [makeRow("b", 2, 0)],
    });
    expect(emits).toHaveLength(1);
  });

  it("should return false from handle() for unknown commands", () => {
    const rm = new RowManager<Row>();
    const { host } = createHostStub();
    rm.init(host);

    const handled = rm.handle({ type: "something:unknown" } as GridCommand);
    expect(handled).toBe(false);
  });

  it("should force recompute + emit on Recompute even with unchanged inputs", () => {
    const rm = new RowManager<Row>();
    const { host, emits } = createHostStub();
    rm.init(host);

    dispatch(rm, {
      type: RowCommandTypes.SetRows,
      rows: [makeRow("a", 1, 0)],
    });
    expect(emits).toHaveLength(1);

    // Recompute bypasses the memoization short-circuit so callers can
    // force a pipeline re-run after mutations the manager can't detect
    // via ref comparison.
    dispatch(rm, { type: RowCommandTypes.Recompute });
    expect(emits).toHaveLength(2);
  });
});
