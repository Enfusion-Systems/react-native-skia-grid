import type {
  EngineHost,
  GridCommand,
  Manager,
  RowNode,
  Unsubscribe,
} from "../types";
import {
  RowEventTypes,
  type RowsChangedEvent,
} from "../events/rowEvents";
import {
  SelectionEventTypes,
  type SelectionChangedEvent,
} from "../events/selectionEvents";
import { CHECKBOX_COLUMN_HEADER } from "../../utils/constants";
import {
  getFolderCalculatedCheckedState,
  getSelectedRows,
  updateLeafNodeSelectionState,
} from "../../utils/selectionUtils";

type SS = 0 | 1 | 2;

export const SelectionCommandTypes = {
  // Toggle one row. If it's a group, propagates to its leaves. Recomputes
  // the header checkbox. Fires user-supplied `onSelectionChanged`.
  Toggle: "selection:toggle",
  // Imperative API: set a specific row's selection by id. Does NOT fire
  // onSelectionChanged — matches the pre-manager updateRowSelectionState.
  SetById: "selection:setById",
  // Toggle every visible row (header-checkbox tap). Fires onSelectionChanged.
  ToggleAll: "selection:toggleAll",
  // Imperative API: clear all selection. Does NOT fire onSelectionChanged.
  Clear: "selection:clear",
  // Used by ungroup: drop selection of group rows at a given level so
  // stale group-row selections don't survive when the grouping column
  // disappears.
  ClearGroupAtLevel: "selection:clearGroupAtLevel",
  // Wholesale replace. Escape hatch for the React-side `setNodesSelection`
  // contract that the legacy GridSelectionContext still exposes.
  Set: "selection:set",
  // Track the full unfiltered row tree. The pipeline output (`rows`) is
  // received via RowsChanged subscription; this is for SetById, which must
  // locate rows that are currently hidden inside collapsed groups.
  SetRowsData: "selection:setRowsData",
} as const;

export type SelectionCommand<T extends Object> =
  | (GridCommand & { type: typeof SelectionCommandTypes.Toggle; row: RowNode<T> })
  | (GridCommand & {
      type: typeof SelectionCommandTypes.SetById;
      rowId: string;
      selected: boolean;
    })
  | (GridCommand & { type: typeof SelectionCommandTypes.ToggleAll })
  | (GridCommand & { type: typeof SelectionCommandTypes.Clear })
  | (GridCommand & {
      type: typeof SelectionCommandTypes.ClearGroupAtLevel;
      level: number;
    })
  | (GridCommand & {
      type: typeof SelectionCommandTypes.Set;
      nodesSelection: Map<string, SS>;
    })
  | (GridCommand & {
      type: typeof SelectionCommandTypes.SetRowsData;
      rowsData: RowNode<T>[];
    });

export type SelectionConfig<T extends Object> = {
  rowSelection: "single" | "multiple";
  onSelectionChanged?: (rows: RowNode<T>[]) => void;
  getIsRowSelected?: (row: RowNode<T>) => boolean;
};

// Owns nodesSelection + the derived header-checkbox state. Subscribes to
// RowsChanged so the header checkbox follows the pipeline output without
// the React layer needing a useEffect for it. The map is the only state
// here — `rows` and `rowsData` are local caches kept in sync via the
// subscription / a command, not authoritative.
//
// State ownership contract:
//   - SelectionManager owns `nodesSelection`. Mutations happen through
//     commands; React reads via `getNodesSelection()` + useSyncExternalStore.
//   - `config` is non-state: live user-supplied callbacks (rowSelection,
//     onSelectionChanged, getIsRowSelected). React updates it via
//     `setConfig()` in an effect on every commit — no command churn for
//     fresh callback references.
export class SelectionManager<T extends Object = Object> implements Manager {
  private host?: EngineHost;
  private nodesSelection: Map<string, SS> = new Map();
  private rows: RowNode<T>[] = [];
  private rowsData: RowNode<T>[] = [];
  private config: SelectionConfig<T> = { rowSelection: "single" };
  private unsubscribes: Unsubscribe[] = [];

  init(host: EngineHost): void {
    this.host = host;
    this.unsubscribes.push(
      host.on(RowEventTypes.RowsChanged, (event) => {
        const e = event as RowsChangedEvent<T>;
        this.rows = e.rows;
        this.recomputeHeaderCheckbox();
      })
    );
  }

  // Stable reference until the next mutation. Safe to use as a snapshot
  // source for useSyncExternalStore.
  getNodesSelection(): Map<string, SS> {
    return this.nodesSelection;
  }

  // Update live config. Called by the React layer every commit; cheap.
  setConfig(config: SelectionConfig<T>): void {
    this.config = config;
  }

  handle(command: GridCommand): boolean {
    const c = command as SelectionCommand<T>;
    switch (c.type) {
      case SelectionCommandTypes.Toggle:
        this.handleToggle(c.row);
        return true;
      case SelectionCommandTypes.SetById:
        this.handleSetById(c.rowId, c.selected);
        return true;
      case SelectionCommandTypes.ToggleAll:
        this.handleToggleAll();
        return true;
      case SelectionCommandTypes.Clear:
        this.handleClear();
        return true;
      case SelectionCommandTypes.ClearGroupAtLevel:
        this.handleClearGroupAtLevel(c.level);
        return true;
      case SelectionCommandTypes.Set:
        this.handleSet(c.nodesSelection);
        return true;
      case SelectionCommandTypes.SetRowsData:
        this.rowsData = c.rowsData;
        return true;
      default:
        return false;
    }
  }

  // ─── command handlers ─────────────────────────────────────────────────────

  private handleToggle(row: RowNode<T>): void {
    const { rowSelection, onSelectionChanged, getIsRowSelected } = this.config;
    const newMap = new Map(this.nodesSelection);
    const isLeafNode = !row.group;

    if (isLeafNode && rowSelection === "single") newMap.clear();

    const currentSelectionState = row.group
      ? getFolderCalculatedCheckedState(row.children, newMap)
      : newMap.get(row.__id) ?? 0;

    const newSelectionState = getIsRowSelected
      ? getIsRowSelected(row)
      : currentSelectionState !== 1;

    if (isLeafNode) {
      newMap.set(row.__id, newSelectionState ? 1 : 0);
    } else {
      updateLeafNodeSelectionState(row, newMap, newSelectionState ? 1 : 0);
    }

    newMap.set(
      CHECKBOX_COLUMN_HEADER,
      getFolderCalculatedCheckedState(this.rows, newMap) ?? 0
    );

    this.nodesSelection = newMap;
    onSelectionChanged?.(getSelectedRows(this.rows, newMap));
    this.emit();
  }

  private handleSetById(rowId: string, selected: boolean): void {
    const { rowSelection } = this.config;
    const targetRow = this.rowsData.find((r) => r.__id === rowId);
    if (!targetRow) return;
    if (rowSelection === "single" && selected) {
      this.nodesSelection = new Map();
      this.emit();
      return;
    }

    const newMap = new Map(this.nodesSelection);
    if (targetRow.group) {
      updateLeafNodeSelectionState(targetRow, newMap, selected ? 1 : 0);
    } else {
      newMap.set(rowId, selected ? 1 : 0);
    }
    if (rowSelection !== "single") {
      newMap.set(
        CHECKBOX_COLUMN_HEADER,
        getFolderCalculatedCheckedState(this.rows, newMap) ?? 0
      );
    }
    this.nodesSelection = newMap;
    this.emit();
  }

  private handleToggleAll(): void {
    const { rowSelection, onSelectionChanged } = this.config;
    if (rowSelection === "single" || !this.rows.length) return;

    const selectionState: SS =
      this.nodesSelection.get(CHECKBOX_COLUMN_HEADER) === 1 ? 0 : 1;

    const newMap = new Map<string, SS>();
    this.rows.forEach((row) => {
      if (row.group) {
        updateLeafNodeSelectionState(row, newMap, selectionState as 0 | 1);
      } else {
        newMap.set(row.__id, selectionState);
      }
    });
    newMap.set(CHECKBOX_COLUMN_HEADER, selectionState);

    this.nodesSelection = newMap;
    onSelectionChanged?.(
      selectionState === 1 ? getSelectedRows(this.rows, newMap) : []
    );
    this.emit();
  }

  private handleClear(): void {
    const { rowSelection } = this.config;
    const newMap = new Map<string, SS>();
    if (rowSelection !== "single") newMap.set(CHECKBOX_COLUMN_HEADER, 0);
    this.nodesSelection = newMap;
    this.emit();
  }

  private handleClearGroupAtLevel(level: number): void {
    const newMap = new Map(this.nodesSelection);
    this.rows.forEach((row) => {
      if (row.group && row.level === level && row.groupKey) {
        newMap.delete(row.groupKey);
      }
    });
    this.nodesSelection = newMap;
    this.emit();
  }

  private handleSet(nodesSelection: Map<string, SS>): void {
    if (this.nodesSelection === nodesSelection) return;
    this.nodesSelection = nodesSelection;
    this.emit();
  }

  // Triggered by RowsChanged: after the row pipeline produces a new output,
  // recompute the header-checkbox slot so it reflects the current visible
  // rows. Single-mode skips this — there is no header checkbox.
  private recomputeHeaderCheckbox(): void {
    if (this.config.rowSelection === "single") return;
    if (!this.rows.length) {
      if (this.nodesSelection.size === 0) return;
      this.nodesSelection = new Map();
      this.emit();
      return;
    }
    const nextHeaderState =
      getFolderCalculatedCheckedState(this.rows, this.nodesSelection) ?? 0;
    if (this.nodesSelection.get(CHECKBOX_COLUMN_HEADER) === nextHeaderState) {
      return;
    }
    const newMap = new Map(this.nodesSelection);
    newMap.set(CHECKBOX_COLUMN_HEADER, nextHeaderState);
    this.nodesSelection = newMap;
    this.emit();
  }

  private emit(): void {
    if (!this.host) return;
    const event: SelectionChangedEvent = {
      type: SelectionEventTypes.SelectionChanged,
      nodesSelection: this.nodesSelection,
    };
    this.host.emit(event);
  }

  dispose(): void {
    this.unsubscribes.forEach((off) => off());
    this.unsubscribes = [];
    this.host = undefined;
  }
}
