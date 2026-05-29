import type {
  AggFunc,
  ColumnFilterState,
  MultiColumnSortStatus,
  RowGroupOption,
  RowNode,
  SkiaInternalGridColumn,
} from "../types";
import {
  ColumnEventTypes,
  type ColumnsChangedEvent,
  type FilterChangedEvent,
  type GroupChangedEvent,
  type SortChangedEvent,
} from "../events/columnEvents";
import {
  RowEventTypes,
  type RowsChangedEvent,
} from "../events/rowEvents";
import { getFilteredRows } from "../pipeline/filter";
import { groupRows } from "../pipeline/group";
import { sortRows } from "../pipeline/sort";
import { GROUP_KEY_SEPARATOR } from "../../utils/constants";
import type {
  EngineHost,
  GridCommand,
  Manager,
  Unsubscribe,
} from "../types";

export const RowCommandTypes = {
  SetRows: "rows:set",
  SetContext: "context:set",
  SetAggFuncs: "aggFuncs:set",
  Recompute: "rows:recompute",
  // Expand/collapse a group row. Bypasses the filter→(group|sort) pipeline —
  // operates directly on currentRows and writes back via replaceRenderedRows.
  SetRowExpanded: "rows:setExpanded",
} as const;

export type RowManagerCommand<T extends Object> =
  | (GridCommand & { type: typeof RowCommandTypes.SetRows; rows: RowNode<T>[] })
  | (GridCommand & {
      type: typeof RowCommandTypes.SetContext;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: any;
    })
  | (GridCommand & {
      type: typeof RowCommandTypes.SetAggFuncs;
      aggFuncs?: Record<string, AggFunc<T>>;
    })
  | (GridCommand & { type: typeof RowCommandTypes.Recompute })
  | (GridCommand & {
      type: typeof RowCommandTypes.SetRowExpanded;
      row: RowNode<T>;
      expand: boolean;
      options?: RowGroupOption<T>;
    });

const EMPTY_ROWS: ReadonlyArray<RowNode<Object>> = Object.freeze([]);

// Owns the row pipeline: filter → (group | sort). Any command that mutates
// an input re-runs the pipeline, caches output in `currentRows` /
// `currentFilteredRows`, and emits RowsChanged. No React, no UI —
// testable as a plain TS class.
//
// State ownership contract:
//   - RowManager owns rowsData, context, aggFuncs, and the pipeline outputs
//     (currentRows, currentFilteredRows). columns / filterState / sortStatus
//     / groupedColumns are owned by ColumnManager and mirrored here via
//     event subscriptions (see init()) — RowManager reads them but never
//     receives commands for them.
//   - React consumers read outputs via getRows() / getFilteredRows() +
//     useSyncExternalStore. References are stable between recomputes so the
//     hook doesn't thrash.
//   - Mutations happen through commands (via engine.dispatch) or, for the
//     narrow row-expansion case that needs to synthesize new output outside
//     the pipeline, through replaceRenderedRows().
type RecomputeInputs<T extends Object> = {
  rowsData: RowNode<T>[];
  columns: SkiaInternalGridColumn<T>[];
  filterState: Map<string, ColumnFilterState>;
  sortStatus: MultiColumnSortStatus;
  groupedColumns: SkiaInternalGridColumn<T>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any;
  aggFuncs?: Record<string, AggFunc<T>>;
};

export class RowManager<T extends Object = Object> implements Manager {
  private host?: EngineHost;

  private rowsData: RowNode<T>[] = [];
  private columns: SkiaInternalGridColumn<T>[] = [];
  private filterState: Map<string, ColumnFilterState> = new Map();
  private sortStatus: MultiColumnSortStatus = [];
  private groupedColumns: SkiaInternalGridColumn<T>[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private context: any;
  private aggFuncs?: Record<string, AggFunc<T>>;

  private currentRows: RowNode<T>[] = EMPTY_ROWS as RowNode<T>[];
  private currentFilteredRows: RowNode<T>[] = EMPTY_ROWS as RowNode<T>[];

  // Snapshot of pipeline inputs at the last successful compute. Used to
  // short-circuit recompute when a dispatch sets a field to the same
  // reference it already had — common when the combined dispatch effect
  // re-dispatches every piece of state on any single change. Memoization
  // relies on callers passing stable references (same rowsData array, same
  // columns array, etc.) when nothing actually changed.
  private lastInputs: RecomputeInputs<T> | null = null;

  // Unsubscribe handles for listeners registered on the engine bus in
  // init(). Called during dispose() to detach cleanly.
  private unsubscribes: Unsubscribe[] = [];

  init(host: EngineHost): void {
    this.host = host;

    // Subscribe to column-side state changes. ColumnManager owns columns /
    // filterState / sortStatus / groupedColumns; when it emits, RowManager
    // updates its local pipeline-input cache and recomputes.
    this.unsubscribes.push(
      host.on(ColumnEventTypes.ColumnsChanged, (event) => {
        this.columns = (event as ColumnsChangedEvent<T>).columns;
        this.recompute();
      }),
      host.on(ColumnEventTypes.FilterChanged, (event) => {
        this.filterState = (event as FilterChangedEvent).filterState;
        this.recompute();
      }),
      host.on(ColumnEventTypes.SortChanged, (event) => {
        this.sortStatus = (event as SortChangedEvent).sortStatus ?? [];
        this.recompute();
      }),
      host.on(ColumnEventTypes.GroupChanged, (event) => {
        this.groupedColumns = (event as GroupChangedEvent<T>).groupedColumns;
        this.recompute();
      })
    );
  }

  // Stable reference until the next recompute or replaceRenderedRows call.
  getRows(): RowNode<T>[] {
    return this.currentRows;
  }

  // Post-filter, pre-group rows. Used by forEachNodeAfterFilter and the
  // Set-filter distinct-values flow.
  getFilteredRows(): RowNode<T>[] {
    return this.currentFilteredRows;
  }

  handle(command: GridCommand): boolean {
    const c = command as RowManagerCommand<T>;
    switch (c.type) {
      case RowCommandTypes.SetRows:
        this.rowsData = c.rows;
        break;
      case RowCommandTypes.SetContext:
        this.context = c.context;
        break;
      case RowCommandTypes.SetAggFuncs:
        this.aggFuncs = c.aggFuncs;
        break;
      case RowCommandTypes.Recompute:
        // Explicit Recompute bypasses memoization — callers dispatch this
        // when they know something the manager can't detect via ref checks
        // (e.g. a mutation deeper in the row tree that kept the outer
        // array reference stable).
        this.lastInputs = null;
        break;
      case RowCommandTypes.SetRowExpanded:
        // Outside the filter→(group|sort) pipeline. Mutates currentRows
        // directly and emits RowsChanged via replaceRenderedRows — does
        // NOT fall through to recompute() below.
        this.applyRowExpanded(c.row, c.expand, c.options);
        return true;
      default:
        return false;
    }
    this.recompute();
    return true;
  }

  // Direct replacement of the rendered rows, for mutations that are NOT
  // outputs of the filter→(group|sort) pipeline — currently only row
  // expand/collapse, driven by the SetRowExpanded command below. Bypasses
  // recompute(); caller is responsible for producing a correct new rows
  // array.
  replaceRenderedRows(rows: RowNode<T>[]): void {
    this.currentRows = rows;
    this.emitRowsChanged();
  }

  // Expand/collapse the supplied group row in the current rendered output.
  // Reads this.columns + this.sortStatus (kept in sync via ColumnManager
  // subscriptions in init()), so the view doesn't have to pass them.
  private applyRowExpanded(
    row: RowNode<T>,
    expand: boolean,
    options?: RowGroupOption<T>
  ): void {
    const next = expand
      ? this.computeExpandedRows(row, options)
      : this.computeCollapsedRows(row);
    this.replaceRenderedRows(next);
  }

  // Expand branch: insert the target row's children directly after it,
  // recursing into qualifying subgroups via options.expandAllRows /
  // options.shouldExpand. Children are sorted at the target's depth + 1.
  private computeExpandedRows(
    row: RowNode<T>,
    options?: RowGroupOption<T>
  ): RowNode<T>[] {
    const next: RowNode<T>[] = [];
    const addEntry = (
      base: RowNode<T>,
      entry: Partial<RowNode<T>> = {}
    ): void => {
      next.push({ ...base, __index: next.length, ...entry });
    };

    const expandRow = (base: RowNode<T>): void => {
      addEntry(base, { expanded: true });
      const sortedChildren = sortRows(
        base.children,
        this.columns,
        this.sortStatus,
        row.level + 1
      );
      sortedChildren.forEach((child) => {
        if (
          child.group &&
          (options?.expandAllRows || options?.shouldExpand?.(child))
        ) {
          expandRow(child);
        } else {
          addEntry(child, {
            groupKey:
              child.groupKey ??
              `${base.groupKey}${GROUP_KEY_SEPARATOR}${child.id}`,
          });
        }
      });
    };

    for (const node of this.currentRows) {
      if (node.__id === row.__id) {
        expandRow(node);
      } else {
        addEntry(node);
      }
    }
    return next;
  }

  // Collapse branch: mark the target row collapsed and drop every rendered
  // descendant by groupKey prefix. Descendants always appear after their
  // parent in currentRows, so a single forward pass with a fixed prefix is
  // sufficient — no need to track the prefix during iteration.
  private computeCollapsedRows(row: RowNode<T>): RowNode<T>[] {
    const next: RowNode<T>[] = [];
    const descendantPrefix = `${row.groupKey ?? ""}${GROUP_KEY_SEPARATOR}`;
    for (const node of this.currentRows) {
      if (node.__id === row.__id) {
        next.push({ ...node, __index: next.length, expanded: false });
      } else if (!node.groupKey?.startsWith(descendantPrefix)) {
        next.push({ ...node, __index: next.length });
      }
    }
    return next;
  }

  private recompute(): void {
    // Bail out if every pipeline input is reference-identical to the last
    // successful compute. The combined dispatch effect in DataGrid fires
    // every sub-dispatch whenever any single dep changes; most of those
    // dispatches carry unchanged references. Without this check every one
    // would allocate a new output array + emit RowsChanged + trigger a
    // useSyncExternalStore re-render + a picture re-record.
    if (
      this.lastInputs !== null &&
      this.lastInputs.rowsData === this.rowsData &&
      this.lastInputs.columns === this.columns &&
      this.lastInputs.filterState === this.filterState &&
      this.lastInputs.sortStatus === this.sortStatus &&
      this.lastInputs.groupedColumns === this.groupedColumns &&
      this.lastInputs.context === this.context &&
      this.lastInputs.aggFuncs === this.aggFuncs
    ) {
      return;
    }

    let filtered: RowNode<T>[] = [...this.rowsData];
    if (this.filterState.size) {
      filtered = getFilteredRows(filtered, this.filterState, this.columns);
    }
    this.currentFilteredRows = filtered;

    let result: RowNode<T>[];
    if (this.groupedColumns.length) {
      result = groupRows(
        this.currentRows,
        filtered,
        this.groupedColumns,
        this.columns,
        this.sortStatus,
        this.context,
        this.aggFuncs
      );
    } else {
      result = sortRows(filtered, this.columns, this.sortStatus);
    }

    this.currentRows = result;
    this.lastInputs = {
      rowsData: this.rowsData,
      columns: this.columns,
      filterState: this.filterState,
      sortStatus: this.sortStatus,
      groupedColumns: this.groupedColumns,
      context: this.context,
      aggFuncs: this.aggFuncs,
    };
    this.emitRowsChanged();
  }

  private emitRowsChanged(): void {
    if (!this.host) return;
    const event: RowsChangedEvent<T> = {
      type: RowEventTypes.RowsChanged,
      rows: this.currentRows,
    };
    this.host.emit(event);
  }

  dispose(): void {
    this.unsubscribes.forEach((off) => off());
    this.unsubscribes = [];
    this.host = undefined;
  }
}
