import { sortBy } from "lodash";

import { GROUP_COLUMN_ID } from "../../utils/constants";
import type {
  ColumnFilterState,
  ColumnSection,
  MultiColumnSortStatus,
  PinActionsType,
  SkiaInternalGridColumn,
} from "../types";
import {
  ColumnEventTypes,
  type ColumnsChangedEvent,
  type ColumnsResizedEvent,
  type FilterChangedEvent,
  type GroupChangedEvent,
  type SectionResizedEvent,
  type SortChangedEvent,
} from "../events/columnEvents";
import type { EngineHost, GridCommand, Manager } from "../types";

export const ColumnCommandTypes = {
  SetColumns: "columns:set",
  Resize: "columns:resize",
  Pin: "columns:pin",
  SetVisibility: "columns:setVisibility",
  Reorder: "columns:reorder",
  SetSort: "columns:setSort",
  // Toggle sort on a single column. Handler computes the multi-sort
  // index re-shuffle (other columns' sortIndex shifts when this one is
  // removed/added). Inputs: target column with the desired `sort` field
  // already set to the new direction by the caller.
  ToggleSort: "columns:toggleSort",
  SetFilter: "columns:setFilter",
  SetGroup: "columns:setGroup",
  // Toggle grouping on a single column. Handler walks all columns and
  // mutates `rowGroup` / `rowGroupIndex` / `hide` for the affected one,
  // then shifts other grouped columns' rowGroupIndex around the change.
  ToggleGroup: "columns:toggleGroup",
  SetSectionWidth: "columns:setSectionWidth",
} as const;

export type ColumnManagerCommand<T extends Object> =
  | (GridCommand & {
      type: typeof ColumnCommandTypes.SetColumns;
      columns: SkiaInternalGridColumn<T>[];
    })
  | (GridCommand & {
      type: typeof ColumnCommandTypes.Resize;
      columnId: string;
      width: number;
    })
  | (GridCommand & {
      type: typeof ColumnCommandTypes.Pin;
      columnId: string;
      pinned: PinActionsType;
    })
  | (GridCommand & {
      type: typeof ColumnCommandTypes.SetVisibility;
      columnId: string;
      hide: boolean;
    })
  | (GridCommand & {
      type: typeof ColumnCommandTypes.Reorder;
      // Full replacement order by __id — simplest correct form.
      orderedIds: string[];
    })
  | (GridCommand & {
      type: typeof ColumnCommandTypes.SetSort;
      sortStatus?: MultiColumnSortStatus;
    })
  | (GridCommand & {
      type: typeof ColumnCommandTypes.ToggleSort;
      column: SkiaInternalGridColumn<T>;
      isLongPressed: boolean;
      sortByAbsoluteValue?: boolean;
    })
  | (GridCommand & {
      type: typeof ColumnCommandTypes.SetFilter;
      filterState: Map<string, ColumnFilterState>;
    })
  | (GridCommand & {
      type: typeof ColumnCommandTypes.SetGroup;
      groupedColumns: SkiaInternalGridColumn<T>[];
    })
  | (GridCommand & {
      type: typeof ColumnCommandTypes.ToggleGroup;
      column: SkiaInternalGridColumn<T>;
      grouped: boolean;
      // When true, the toggled column stays visible after being grouped.
      // Mirrors the existing `suppressGroupChangesColumnVisibility` prop.
      suppressGroupChangesColumnVisibility: boolean;
    })
  | (GridCommand & {
      type: typeof ColumnCommandTypes.SetSectionWidth;
      sectionWidths: Record<ColumnSection, number>;
    });

// Derive the flattened MultiColumnSortStatus from a column array. Used by
// SetColumns and ToggleSort handlers to keep sortStatus in sync with the
// `sort` / `sortIndex` properties living on each column.
function deriveSortStatus<T extends Object>(
  columns: SkiaInternalGridColumn<T>[]
): NonNullable<MultiColumnSortStatus> {
  const status: NonNullable<MultiColumnSortStatus> = [];
  for (const column of columns) {
    if (
      (!column.hide || column.rowGroup) &&
      column.sortable &&
      column.sort &&
      typeof column.sortIndex === "number" &&
      !status.some((item) => item.sortIndex === (column.sortIndex ?? 0))
    ) {
      status.push({
        columnId: column.__id,
        sort: column.sort,
        sortIndex: column.sortIndex ?? 0,
      });
    }
  }
  return sortBy(status, (i) => i.sortIndex);
}

// Derive the ordered grouped-column list from a column array. Same pattern
// as deriveSortStatus — the truth lives on each column (rowGroup +
// rowGroupIndex); this is just a flattened projection.
function deriveGroupedColumns<T extends Object>(
  columns: SkiaInternalGridColumn<T>[]
): SkiaInternalGridColumn<T>[] {
  return sortBy(
    columns.filter((col) => col.rowGroup),
    (col) => col.rowGroupIndex
  );
}

// Cheap structural equality checks for the derived projections. Used to
// suppress SortChanged / GroupChanged emits when applyColumns produces a
// projection identical to the last one — avoids cascading recomputes in
// downstream subscribers (RowManager) for column-list mutations that
// didn't actually change sort or group state.
function sortStatusEqual(
  a: MultiColumnSortStatus,
  b: MultiColumnSortStatus
): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].columnId !== b[i].columnId ||
      a[i].sort !== b[i].sort ||
      a[i].sortIndex !== b[i].sortIndex
    ) {
      return false;
    }
  }
  return true;
}

function groupedColumnsEqual<T extends Object>(
  a: SkiaInternalGridColumn<T>[],
  b: SkiaInternalGridColumn<T>[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].__id !== b[i].__id || a[i].rowGroupIndex !== b[i].rowGroupIndex) {
      return false;
    }
  }
  return true;
}

// Owns column definitions + their derived state (widths, pin, visibility,
// sort status, filter state, group state, section widths). Emits granular
// events so downstream (RowManager, renderer) can subscribe to only what
// affects them — width changes skip the row pipeline, filter/sort/group
// changes trigger it.
export class ColumnManager<T extends Object = Object> implements Manager {
  private host?: EngineHost;

  private columns: SkiaInternalGridColumn<T>[] = [];
  private filterState: Map<string, ColumnFilterState> = new Map();
  private sortStatus: MultiColumnSortStatus = [];
  private groupedColumns: SkiaInternalGridColumn<T>[] = [];
  private sectionWidths: Record<ColumnSection, number> = {
    left: 0,
    center: 0,
    right: 0,
  };

  init(host: EngineHost): void {
    this.host = host;
  }

  // Getters used by React via useSyncExternalStore. References are stable
  // between mutations so the hook doesn't warn about unstable snapshots.
  getColumns(): SkiaInternalGridColumn<T>[] {
    return this.columns;
  }

  getSortStatus(): MultiColumnSortStatus {
    return this.sortStatus;
  }

  getFilterState(): Map<string, ColumnFilterState> {
    return this.filterState;
  }

  getGroupedColumns(): SkiaInternalGridColumn<T>[] {
    return this.groupedColumns;
  }

  handle(command: GridCommand): boolean {
    const c = command as ColumnManagerCommand<T>;
    switch (c.type) {
      case ColumnCommandTypes.SetColumns:
        this.applyColumns(c.columns);
        return true;

      case ColumnCommandTypes.Resize: {
        const changed: Record<string, number> = {};
        this.columns = this.columns.map((col) => {
          if (col.__id !== c.columnId) return col;
          if (col.width === c.width) return col;
          changed[col.__id] = c.width;
          return { ...col, width: c.width };
        });
        if (Object.keys(changed).length > 0) this.emitColumnsResized(changed);
        return true;
      }

      case ColumnCommandTypes.Pin:
        this.columns = this.columns.map((col) =>
          col.__id === c.columnId ? { ...col, pinned: c.pinned } : col
        );
        this.emitColumnsChanged();
        return true;

      case ColumnCommandTypes.SetVisibility:
        this.columns = this.columns.map((col) =>
          col.__id === c.columnId ? { ...col, hide: c.hide } : col
        );
        this.emitColumnsChanged();
        return true;

      case ColumnCommandTypes.Reorder: {
        const indexById = new Map(c.orderedIds.map((id, i) => [id, i]));
        this.columns = [...this.columns].sort(
          (a, b) =>
            (indexById.get(a.__id) ?? Number.POSITIVE_INFINITY) -
            (indexById.get(b.__id) ?? Number.POSITIVE_INFINITY)
        );
        this.emitColumnsChanged();
        return true;
      }

      case ColumnCommandTypes.SetSort:
        this.sortStatus = c.sortStatus ?? [];
        this.emitSortChanged();
        return true;

      case ColumnCommandTypes.ToggleSort:
        this.applyColumns(this.computeToggledSort(c));
        return true;

      case ColumnCommandTypes.SetFilter:
        this.filterState = c.filterState;
        this.emitFilterChanged();
        return true;

      case ColumnCommandTypes.SetGroup:
        this.groupedColumns = c.groupedColumns;
        this.emitGroupChanged();
        return true;

      case ColumnCommandTypes.ToggleGroup:
        this.applyColumns(
          this.computeToggledGroup(
            c.column,
            c.grouped,
            c.suppressGroupChangesColumnVisibility
          )
        );
        return true;

      case ColumnCommandTypes.SetSectionWidth:
        this.sectionWidths = c.sectionWidths;
        this.emitSectionResized();
        return true;

      default:
        return false;
    }
  }

  dispose(): void {
    this.host = undefined;
  }

  // Single entry point for any "the columns array changed" mutation. Derives
  // sortStatus and groupedColumns from the new columns so the three pieces
  // of state stay coherent. Emits ColumnsChanged unconditionally; emits
  // SortChanged / GroupChanged only when the derived projection actually
  // changes — keeps RowManager from recomputing on no-op derivations.
  private applyColumns(columns: SkiaInternalGridColumn<T>[]): void {
    this.columns = columns;
    const nextSortStatus = deriveSortStatus(columns);
    const sortChanged =
      !sortStatusEqual(nextSortStatus, this.sortStatus);
    this.sortStatus = nextSortStatus;

    const nextGroupedColumns = deriveGroupedColumns(columns);
    const groupChanged =
      !groupedColumnsEqual(nextGroupedColumns, this.groupedColumns);
    this.groupedColumns = nextGroupedColumns;

    this.emitColumnsChanged();
    if (sortChanged) this.emitSortChanged();
    if (groupChanged) this.emitGroupChanged();
  }

  // Multi-sort recalc. Input is the user-supplied target with its desired
  // `sort` direction already set. We rebuild the full columns array,
  // assigning new sortIndex values and clearing sort on others when
  // multi-sort is off. Pure transformation — no allocation of side state.
  private computeToggledSort(c: {
    column: SkiaInternalGridColumn<T>;
    isLongPressed: boolean;
    sortByAbsoluteValue?: boolean;
  }): SkiaInternalGridColumn<T>[] {
    const { column, isLongPressed, sortByAbsoluteValue } = c;
    if (!column || (column.hide && !column.rowGroup) || !column.sortable) {
      return this.columns;
    }

    const sortedColumns = this.columns.filter(
      (col) => !!col.sort && typeof col.sortIndex === "number"
    );

    return this.columns.reduce<SkiaInternalGridColumn<T>[]>((res, col) => {
      if (column.id === col.id) {
        const colSortIndex = sortedColumns.some((x) => x.id === column.id)
          ? col.sortIndex
          : sortedColumns.length;
        res.push({
          ...col,
          sort: column.sort ?? null,
          sortIndex: column.sort
            ? isLongPressed
              ? colSortIndex
              : 0
            : null,
          sortByAbsoluteValue,
        });
      } else if (
        col.sort &&
        !column?.sort &&
        typeof column.sortIndex === "number" &&
        typeof col.sortIndex === "number" &&
        column.sortIndex < col.sortIndex
      ) {
        res.push(
          isLongPressed
            ? { ...col, sortIndex: col.sortIndex - 1 }
            : { ...col, sort: null, sortIndex: null }
        );
      } else {
        res.push(
          isLongPressed
            ? typeof col.sortIndex !== "number" && !!col.sort
              ? { ...col, sort: null }
              : col
            : { ...col, sort: null, sortIndex: null }
        );
      }
      return res;
    }, []);
  }

  // Grouping toggle. Computes the new columns array with rowGroup +
  // rowGroupIndex updates for the affected column and shifts other grouped
  // columns' indexes around the change. The Skia-side group-column header
  // width recompute stays in DataGrid (column-cache concern, not core).
  private computeToggledGroup(
    selectedColumn: SkiaInternalGridColumn<T>,
    grouped: boolean,
    suppressGroupChangesColumnVisibility: boolean
  ): SkiaInternalGridColumn<T>[] {
    if (!selectedColumn) return this.columns;
    const existingGroupedCount = this.columns.filter(
      (col) => col.rowGroup
    ).length;

    return this.columns.reduce<SkiaInternalGridColumn<T>[]>((res, col) => {
      // Drop the synthetic group column injected by the view layer. It will
      // be re-injected by setColumns wrapper after dispatch when the new
      // groupedColumns is non-empty.
      if (col.__id === GROUP_COLUMN_ID) {
        return res;
      }
      if (selectedColumn.id === col.id) {
        res.push({
          ...col,
          hide: grouped && !suppressGroupChangesColumnVisibility,
          rowGroup: grouped,
          rowGroupIndex: grouped ? existingGroupedCount : null,
        });
      } else if (
        col.rowGroup &&
        typeof selectedColumn.rowGroupIndex === "number" &&
        typeof col.rowGroupIndex === "number" &&
        selectedColumn.rowGroupIndex < col.rowGroupIndex
      ) {
        // When ungrouping a middle column, columns at higher levels shift
        // down by one. When grouping a new column, this branch doesn't fire
        // (selectedColumn.rowGroupIndex is null in that case).
        res.push({
          ...col,
          rowGroupIndex: col.rowGroupIndex - 1,
        });
      } else {
        res.push({ ...col });
      }
      return res;
    }, []);
  }

  private emitColumnsChanged(): void {
    const event: ColumnsChangedEvent<T> = {
      type: ColumnEventTypes.ColumnsChanged,
      columns: this.columns,
    };
    this.host?.emit(event);
  }

  private emitColumnsResized(changedWidths: Record<string, number>): void {
    const event: ColumnsResizedEvent<T> = {
      type: ColumnEventTypes.ColumnsResized,
      columns: this.columns,
      changedWidths,
    };
    this.host?.emit(event);
  }

  private emitSortChanged(): void {
    const event: SortChangedEvent = {
      type: ColumnEventTypes.SortChanged,
      sortStatus: this.sortStatus,
    };
    this.host?.emit(event);
  }

  private emitFilterChanged(): void {
    const event: FilterChangedEvent = {
      type: ColumnEventTypes.FilterChanged,
      filterState: this.filterState,
    };
    this.host?.emit(event);
  }

  private emitGroupChanged(): void {
    const event: GroupChangedEvent<T> = {
      type: ColumnEventTypes.GroupChanged,
      groupedColumns: this.groupedColumns,
    };
    this.host?.emit(event);
  }

  private emitSectionResized(): void {
    const event: SectionResizedEvent = {
      type: ColumnEventTypes.SectionResized,
      sectionWidths: this.sectionWidths,
    };
    this.host?.emit(event);
  }
}
