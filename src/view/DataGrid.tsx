import { useDebounce, useRefCallback } from "../internal/hooks";
import { EMPTY_ARRAY, forwardRef } from "../internal/utils";
import { SlotsProvider } from "./slots";
import type { GridSlots } from "./slots";
import { DEFAULT_SLOTS } from "./slots/defaults";
import {
  darkTheme,
  lightTheme,
  GridThemeContext,
  GridThemeProvider,
  DensityProvider,
} from "../themes";
import { Skia, SkTypefaceFontProvider } from "@shopify/react-native-skia";
import { debounce, isEqual } from "lodash";
import * as React from "react";
import { Platform } from "react-native";

import { GroupCellRenderer } from "../renderer/cellRenderers/GroupCellRenderer";
import { SelectionCellRenderer } from "../renderer/cellRenderers/SelectionCellRenderer";
import { GridProviders } from "./GridProviders";
import { createGridCanvas } from "../renderer/GridCanvas";
import {
  ColumnFilterState,
  EngineHost,
  FilterParams,
  MultiColumnSortStatus,
  PinActionsType,
  PinnedStatuses,
  RowGroupOption,
  RowNode,
  SkiaGridAPI,
  SkiaGridColumn,
  SkiaGridCoreAPI,
  SkiaGridProps,
  SkiaInternalGridColumn,
} from "../core/types";
import {
  CELL_PADDING,
  DEFAULT_FILTER_DEBOUNCE_MS,
  GROUP_COLUMN_ID,
  GROUP_COLUMN_NAME,
  HEADER_ROW_HEIGHT_DEFAULT,
  ROW_FONT_SIZE_DEFAULT,
  ROW_HEIGHT_DEFAULT,
} from "../utils/constants";
import { getFont } from "../renderer/drawing/fontUtils";
import { useColumnWidthCache } from "./useColumnWidthCache";
import { useEngineStore } from "./useEngineStore";
import { useGridController } from "./useGridController";
import {
  buildColumnGroupPaths,
  flattenColumnDefs,
  mapToInternalColumns,
  transformDataToRowNode,
} from "../utils/gridUtils";
import { GridEngine } from "../core/GridEngine";
import {
  RowEventTypes,
} from "../core/events/rowEvents";
import {
  ColumnCommandTypes,
  ColumnManager,
  type ColumnManagerCommand,
} from "../core/managers/ColumnManager";
import {
  RowCommandTypes,
  RowManager,
  type RowManagerCommand,
} from "../core/managers/RowManager";
import {
  SelectionCommandTypes,
  SelectionManager,
  type SelectionCommand,
} from "../core/managers/SelectionManager";
import {
  SelectionEventTypes,
  type SelectionChangedEvent,
} from "../core/events/selectionEvents";
import { ColumnEventTypes } from "../core/events/columnEvents";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createGridComp<T extends Object>() {
  const GridCanvas = createGridCanvas<T>();

  return forwardRef<SkiaGridAPI<T> | null, SkiaGridProps<T>>(function GridCompT(
    props,
    ref
  ) {
    // #region SECTION 1: PROPS & THEMING ═══════════════════════════════════════

    const {
      rows: rowsBase = EMPTY_ARRAY,
      columnDefs = EMPTY_ARRAY,
      autoGroupColumnDefs,
      rowHeight = ROW_HEIGHT_DEFAULT,
      headerHeight = HEADER_ROW_HEIGHT_DEFAULT,
      defaultColumnDefs,
      pinnedTopRow,
      getRowId,
      onRowPress,
      onRowLongPress,
      onColumnChange,
      onFilterChanged,
      onHeaderRowPress,
      context,
      aggFuncs,
      onSelectionChanged,
      getIsRowSelected,
      rowSelection = "single",
      rowSelectWithPress,
      onCellEditingStopped,
      onRowGroupOpened,
      onColumnRowGroupChanged,
      onRowsUpdated,
      columnTypes,
      bottomInset = 0,
      fontManager: baseFontManager,
      theme: themeOverride,
      density = "medium",
      slots,
      suppressGroupChangesColumnVisibility = true,
    } = props;

    const themeContext = React.useContext(GridThemeContext);
    const theme = themeOverride ?? themeContext?.theme ?? darkTheme;

    const fontManager =
      baseFontManager || (Skia.FontMgr.System() as SkTypefaceFontProvider);

    const font = getFont(fontManager, ROW_FONT_SIZE_DEFAULT, "Lato");
    const gridCoreApiRef = React.useRef<SkiaGridCoreAPI | null>(null);

    // #endregion
    // #region SECTION 2: ENGINE & MANAGERS ══════════════════════════════════════

    // ────────────────────────────────────────────────────────────────────────
    // GridEngine + managers — single source of truth for pipeline state.
    //
    // Lifetime: one set per DataGrid mount, created lazily on first render
    // (useMemo with [] deps). The managers own `rows` output; React reads it
    // via useSyncExternalStore below. Input state (filterState, sortStatus,
    // columns, etc.) is still owned by React in this phase — dispatches
    // below copy those into RowManager whenever they change.
    // ────────────────────────────────────────────────────────────────────────
    const { engine, rowManager, columnManager, selectionManager } =
      React.useMemo<{
        engine: EngineHost;
        rowManager: RowManager<T>;
        columnManager: ColumnManager<T>;
        selectionManager: SelectionManager<T>;
      }>(() => {
        const e = new GridEngine();
        const rm = new RowManager<T>();
        const cm = new ColumnManager<T>();
        const sm = new SelectionManager<T>();
        e.register(rm);
        e.register(cm);
        e.register(sm);

        // Bootstrap ColumnManager with the initial column list synchronously
        // inside useMemo, before any useSyncExternalStore read. After mount,
        // mutations flow through dispatches (no React state mirror).
        const initialColumns = mapToInternalColumns(
          flattenColumnDefs(columnDefs),
          defaultColumnDefs,
          columnTypes
        );
        e.dispatch({
          type: ColumnCommandTypes.SetColumns,
          columns: initialColumns,
        } as ColumnManagerCommand<T>);

        return {
          engine: e,
          rowManager: rm,
          columnManager: cm,
          selectionManager: sm,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

    React.useEffect(() => {
      return () => engine.dispose();
    }, [engine]);

    // #endregion
    // #region SECTION 3: MANAGER SUBSCRIPTIONS ══════════════════════════════════

    // Manager-owned state is bridged into React via useEngineStore: it
    // subscribes to the corresponding engine event and reads the manager's
    // cached snapshot. References returned by the managers are stable
    // between mutations (see e.g. RowManager.replaceRenderedRows /
    // recompute), so useSyncExternalStore doesn't warn.
    const rows = useEngineStore(engine, RowEventTypes.RowsChanged, () =>
      rowManager.getRows()
    );

    const nodesSelection = useEngineStore(
      engine,
      SelectionEventTypes.SelectionChanged,
      () => selectionManager.getNodesSelection()
    );

    // Columns, sortStatus, and filterState are owned by ColumnManager.
    // React subscribes via useEngineStore — there's no React useState mirror.
    const columns = useEngineStore(
      engine,
      ColumnEventTypes.ColumnsChanged,
      () => columnManager.getColumns()
    );

    const sortStatus = useEngineStore(
      engine,
      ColumnEventTypes.SortChanged,
      () => columnManager.getSortStatus()
    );

    const filterState = useEngineStore(
      engine,
      ColumnEventTypes.FilterChanged,
      () => columnManager.getFilterState()
    );

    // #endregion
    // #region SECTION 4: VIEW-LOCAL STATE & REFS ════════════════════════════════

    const [topRowNode, setTopRowNode] = React.useState<RowNode<T> | null>(
      () => {
        if (pinnedTopRow)
          return transformDataToRowNode([pinnedTopRow], getRowId)[0];
        return null;
      }
    );

    const isMultiSortEnabled = React.useRef<boolean>(true);

    const rowsDataRef = React.useRef<RowNode<T>[]>([]);

    const [isColumnResizing, setIsColumnResizing] =
      React.useState<boolean>(false);

    // sortStatus + filterState are read from ColumnManager above via
    // useSyncExternalStore. selectedColumn stays as React state — it is a
    // pure-view modal-coordination value with no pipeline involvement, so
    // pulling it into a manager is out of scope.
    const [selectedColumn, setSelectedColumn] =
      React.useState<SkiaInternalGridColumn<T> | null>(null);

    const previousRowsBaseRef = React.useRef<T[]>([]);

    // #endregion
    // #region SECTION 5: COLUMN WIDTH CACHE ═════════════════════════════════════

    const {
      columnWidthMap,
      resetColumnWidthCache,
      updateColumnWidthCache,
      recomputeGroupColumnWidth,
    } = useColumnWidthCache<T>({ columns, font, rowsDataRef });

    // #endregion
    // #region SECTION 6: PROP-SYNC EFFECTS ══════════════════════════════════════

    React.useEffect(() => {
      if (!isEqual(previousRowsBaseRef.current, rowsBase)) {
        const newRows = transformDataToRowNode(rowsBase, getRowId);
        previousRowsBaseRef.current = rowsBase;
        rowsDataRef.current = newRows;
        resetColumnWidthCache(newRows);
        engine.batch(() => {
          engine.dispatch({
            type: RowCommandTypes.SetRows,
            rows: newRows,
          } as RowManagerCommand<T>);
          // SelectionManager needs the full unfiltered tree for SetById,
          // which must locate rows that may be hidden inside collapsed
          // groups (the pipeline output `rows` doesn't contain them).
          engine.dispatch({
            type: SelectionCommandTypes.SetRowsData,
            rowsData: newRows,
          } as SelectionCommand<T>);
        });
      }
    }, [rowsBase, engine]);

    // Sync user-supplied row-pipeline inputs (context, aggFuncs) into
    // RowManager. Columns / sort / group / filter are now owned by
    // ColumnManager directly — view-layer mutations dispatch the relevant
    // commands and the manager emits its events, so no React-side sync is
    // needed for them.
    React.useEffect(() => {
      engine.batch(() => {
        engine.dispatch({
          type: RowCommandTypes.SetContext,
          context,
        } as RowManagerCommand<T>);
        engine.dispatch({
          type: RowCommandTypes.SetAggFuncs,
          aggFuncs,
        } as RowManagerCommand<T>);
      });
    }, [engine, context, aggFuncs]);

    // Keep SelectionManager's live config in sync with user props. Cheap —
    // the manager just swaps the config reference; no command churn.
    React.useEffect(() => {
      selectionManager.setConfig({
        rowSelection,
        onSelectionChanged,
        getIsRowSelected,
      });
    }, [selectionManager, rowSelection, onSelectionChanged, getIsRowSelected]);

    // #endregion
    // #region SECTION 7: SELECTION ACTIONS ══════════════════════════════════════

    // setNodesSelection preserves the legacy React-style setter contract
    // for the GridSelectionContext value. It dispatches a Set command so
    // the SelectionManager remains the single source of truth.
    const setNodesSelection: React.Dispatch<
      React.SetStateAction<Map<string, 0 | 1 | 2>>
    > = useRefCallback((value) => {
      const next =
        typeof value === "function"
          ? (value as (prev: Map<string, 0 | 1 | 2>) => Map<string, 0 | 1 | 2>)(
              selectionManager.getNodesSelection()
            )
          : value;
      engine.dispatch({
        type: SelectionCommandTypes.Set,
        nodesSelection: next,
      } as SelectionCommand<T>);
    }, [engine, selectionManager]);

    const updateRowNodeSelection = useRefCallback(
      (row: RowNode<T>) => {
        engine.dispatch({
          type: SelectionCommandTypes.Toggle,
          row,
        } as SelectionCommand<T>);
      },
      [engine]
    );

    const updateRowSelectionState = useRefCallback(
      (rowId: string, selected: boolean) => {
        engine.dispatch({
          type: SelectionCommandTypes.SetById,
          rowId,
          selected,
        } as SelectionCommand<T>);
      },
      [engine]
    );

    const deselectAll = useRefCallback(() => {
      engine.dispatch({
        type: SelectionCommandTypes.Clear,
      } as SelectionCommand<T>);
    }, [engine]);

    // #endregion
    // #region SECTION 8: COLUMN ACTIONS ═════════════════════════════════════════

    // Generic pipeline-recompute trigger. Debounced + setTimeout-deferred so
    // multiple column mutations in the same frame collapse to a single
    // recompute on the next tick.
    const rebuildRows = useRefCallback(
      debounce(() => {
        setTimeout(() => {
          engine.dispatch({
            type: RowCommandTypes.Recompute,
          } as RowManagerCommand<T>);
        }, Platform.select({ ios: 50, android: 100 }) || 50);
      }, Platform.select({ ios: 50, android: 100 }) || 50),
      []
    );

    const setFilterState = React.useCallback(
      (filterState: Map<string, ColumnFilterState>) => {
        const sortedMap = new Map(
          [...filterState]
            .filter((eachElement) => eachElement?.[1])
            .sort((a, b) => a[1].filterIndex - b[1].filterIndex)
        );

        onFilterChanged?.(sortedMap);
        engine.dispatch({
          type: ColumnCommandTypes.SetFilter,
          filterState: sortedMap,
        } as ColumnManagerCommand<T>);
      },
      [engine, onFilterChanged]
    );

    // View-layer wrapper around the SetColumns command. Injects React
    // cell renderers (GroupCellRenderer / SelectionCellRenderer) that
    // can't live in pure-TS core, then hands the list to ColumnManager
    // which derives sortStatus + groupedColumns and emits events.
    const setColumns = useRefCallback((cols: SkiaInternalGridColumn<T>[]) => {
      setSelectedColumn(null);
      let newColumns = [...cols];
      const groupedColumn = newColumns?.filter((col) => col.rowGroup);
      if (
        groupedColumn?.length &&
        !newColumns.some((col) => col.__id === GROUP_COLUMN_ID)
      ) {
        newColumns.unshift(
          autoGroupColumnDefs
            ? {
                ...autoGroupColumnDefs,
                __id: GROUP_COLUMN_ID,
                __index: 0,
                id: autoGroupColumnDefs.id ?? GROUP_COLUMN_ID,
              }
            : {
                __id: GROUP_COLUMN_ID,
                id: GROUP_COLUMN_ID,
                __index: 0,
                name: GROUP_COLUMN_NAME,
                width: columnWidthMap.current.get(GROUP_COLUMN_ID) ?? 105,
                pinned: PinnedStatuses.LEFT,
                field: "",
                colId: GROUP_COLUMN_NAME,
                canPinned: false,
                canFilter: false,
                canResize: true,
                sortable: false,
                cellRenderer: GroupCellRenderer,
              }
        );
      }
      const selectionCol = newColumns.find((col) => col.checkboxSelection);
      if (selectionCol) {
        newColumns = [
          {
            ...selectionCol,
            cellRenderer: SelectionCellRenderer,
            width: 30,
            pinned: "left",
            canPinned: false,
            sortable: false,
            canResize: false,
            canFilter: false,
            canGrouped: false,
          },
          ...newColumns.filter(
            (col) =>
              col.checkboxSelection === false || col.colId !== "selection"
          ),
        ];
      }
      engine.dispatch({
        type: ColumnCommandTypes.SetColumns,
        columns: newColumns,
      } as ColumnManagerCommand<T>);
    }, []);

    const onGrouped = useRefCallback(
      (grouped: boolean, selectedColumn: SkiaInternalGridColumn<T>) => {
        if (!selectedColumn) return;

        // 1. Pure column-state mutation → ColumnManager. The handler computes
        //    the new columns array with rowGroupIndex shuffling.
        engine.dispatch({
          type: ColumnCommandTypes.ToggleGroup,
          column: selectedColumn,
          grouped,
          suppressGroupChangesColumnVisibility:
            !!suppressGroupChangesColumnVisibility,
        } as ColumnManagerCommand<T>);

        // 2. On ungroup, drop stale group-row selection entries at the
        //    just-removed level. Dispatched explicitly (not via a manager
        //    subscription) because SelectionManager.rows is refreshed by
        //    the RowsChanged that follows ColumnsChanged — by the time a
        //    GroupChanged-subscription handler would fire, `rows` is the
        //    NEW pipeline output, which would clear the wrong level.
        if (!grouped && typeof selectedColumn.rowGroupIndex === "number") {
          engine.dispatch({
            type: SelectionCommandTypes.ClearGroupAtLevel,
            level: selectedColumn.rowGroupIndex,
          } as SelectionCommand<T>);
          setSelectedColumn(null);
        }

        // 3. Skia-specific group-column header width recompute. Stays in
        //    the view layer — pure-TS core mustn't depend on Skia font
        //    measurement. Reads the *new* grouped columns from the
        //    manager so we don't have to reproduce the rowGroupIndex
        //    derivation.
        const newGroupedColumns = columnManager.getGroupedColumns();
        recomputeGroupColumnWidth(newGroupedColumns);

        onColumnRowGroupChanged?.(newGroupedColumns);
        rebuildRows();
        onColumnChange?.();
      },
      [engine, columnManager, recomputeGroupColumnWidth]
    );

    const sortColumn = useRefCallback(
      (
        column: SkiaInternalGridColumn<T>,
        isLongPressed: boolean,
        sortByAbsoluteValue?: boolean
      ) => {
        isMultiSortEnabled.current = isLongPressed;
        engine.dispatch({
          type: ColumnCommandTypes.ToggleSort,
          column,
          isLongPressed,
          sortByAbsoluteValue,
        } as ColumnManagerCommand<T>);
        onColumnChange?.();
        rebuildRows();
      },
      [engine, onColumnChange]
    );

    const onPinned = useRefCallback(
      (col: SkiaInternalGridColumn<T>, key: PinActionsType) => {
        if (col) {
          const idx = columns.findIndex((x) => x.__id === col.__id);
          const newState = [...columns];
          newState[idx] = { ...col, pinned: key };
          setColumns(newState);
        }
        onColumnChange?.();
      },
      [setColumns, columns, onColumnChange]
    );

    const autoSizeColumns = useRefCallback(
      (cols: SkiaInternalGridColumn<T>[] | []) => {
        const newColumns = columns.reduce<SkiaInternalGridColumn<T>[]>(
          (res, col) => {
            if (!cols.find((x) => x.__id === col.__id)) {
              res.push(col);
            } else {
              if (!columnWidthMap.current.has(col.__id)) {
                columnWidthMap.current.set(col.__id, col.width);
              }
              res.push({
                ...col,
                width: Math.ceil(
                  columnWidthMap.current.get(col.__id)! + 2 * CELL_PADDING
                ),
              });
            }
            return res;
          },
          [] as SkiaInternalGridColumn<T>[]
        );
        setColumns(newColumns);
        onColumnChange?.();
      },
      [setColumns, columns, columnWidthMap.current]
    );

    // Debounced filter-state propagation. Lives in this section because it's
    // a column-state side effect: the filterState subscription value (from
    // useEngineStore) is mirrored back into the manager via SetFilter, then
    // the column-width cache is rebuilt against the freshly-filtered rows.
    useDebounce(
      () => {
        engine.dispatch({
          type: ColumnCommandTypes.SetFilter,
          filterState,
        } as ColumnManagerCommand<T>);
        // Filter change rebuilds the column-width cache against the new
        // visible row set. Dispatch is synchronous, so reading the manager's
        // freshly-computed rows here is safe.
        resetColumnWidthCache(rowManager.getRows());
      },
      (selectedColumn?.filterParams as FilterParams)?.debounceMs ??
        DEFAULT_FILTER_DEBOUNCE_MS,
      [filterState]
    );

    // #endregion
    // #region SECTION 9: ROW ACTIONS ════════════════════════════════════════════

    const setRowExpandedState = useRefCallback(
      (row: RowNode<T>, expand: boolean, options?: RowGroupOption<T>) => {
        engine.dispatch({
          type: RowCommandTypes.SetRowExpanded,
          row,
          expand,
          options,
        } as RowManagerCommand<T>);
        onRowGroupOpened?.({
          node: { ...row, expanded: expand },
        });
      },
      [engine, onRowGroupOpened]
    );

    // #endregion
    // #region SECTION 10: INTERACTION HANDLERS ══════════════════════════════════

    const handleRowPress = useRefCallback(
      (row: RowNode<T>, col: SkiaGridColumn<T>, pressCount: number) => {
        if (col.id === GROUP_COLUMN_ID && row.group) {
          setRowExpandedState(row, !row.expanded);
          return;
        } else {
          onRowPress?.(row, col, pressCount);
        }

        if (rowSelectWithPress || col.checkboxSelection) {
          updateRowNodeSelection(row);
        }
      },
      [onRowPress, updateRowNodeSelection, setRowExpandedState]
    );

    const handleHeaderRowPress = useRefCallback(
      (col: SkiaGridColumn<T>, pressCount?: number) => {
        onHeaderRowPress?.(col, pressCount);
        if (col.headerCheckboxSelection) {
          engine.dispatch({
            type: SelectionCommandTypes.ToggleAll,
          } as SelectionCommand<T>);
        }
      },
      [engine, onHeaderRowPress]
    );

    // #endregion
    // #region SECTION 11: LAYOUT METRICS ════════════════════════════════════════

    // Layout-derived rendering metrics — feed both GridLayoutContext and
    // the imperative controller below. Kept inline rather than in
    // useGridController because they are also consumed by Skia draw layers
    // via GridLayoutContext, which is itself fed by the layoutValue memo
    // further down.
    const columnGroupPaths = React.useMemo(
      () => buildColumnGroupPaths(columnDefs),
      [columnDefs]
    );

    const groupHeaderDepth = React.useMemo(() => {
      let max = 0;
      for (const paths of columnGroupPaths.values())
        max = Math.max(max, paths.length);
      return max;
    }, [columnGroupPaths]);

    const totalHeaderHeight = React.useMemo(
      () => headerHeight * (groupHeaderDepth + 1),
      [headerHeight, groupHeaderDepth]
    );

    const fullHeight = React.useMemo(
      () =>
        rowHeight * rows.length +
        totalHeaderHeight +
        (topRowNode ? rowHeight : 0) +
        bottomInset,
      [rows.length, rowHeight, totalHeaderHeight, topRowNode?.__id]
    );

    // #endregion
    // #region SECTION 12: IMPERATIVE API ════════════════════════════════════════

    const controller = useGridController<T>({
      engine,
      rowManager,
      rows,
      columns,
      nodesSelection,
      rowHeight,
      fullHeight,
      setColumns,
      setSelectedColumn,
      setNodesSelection,
      setTopRowNode,
      rowsDataRef,
      columnManager,
      gridCoreApiRef,
      getRowId,
      defaultColumnDefs,
      columnTypes,
      onColumnChange,
      onSelectionChanged,
      onRowsUpdated,
      font,
      setFilterState,
      rebuildRows,
      setRowExpandedState,
      updateRowSelectionState,
      deselectAll,
      updateColumnWidthCache,
    });

    React.useImperativeHandle(ref, () => controller);

    const getSelectedNodes = controller.getSelectedNodes;

    // #endregion
    // #region SECTION 13: CONTEXT VALUES ════════════════════════════════════════

    const layoutValue = React.useMemo(
      () => ({
        fontManager,
        totalHeaderHeight,
        fullHeight,
        topRowNode,
        columnGroupPaths,
      }),
      [fontManager, totalHeaderHeight, fullHeight, topRowNode, columnGroupPaths]
    );

    const selectionValue = React.useMemo(
      () => ({
        rows,
        rowsData: rowsDataRef.current,
        nodesSelection,
        setNodesSelection,
        getSelectedNodes,
      }),
      [rows, nodesSelection, setNodesSelection, getSelectedNodes]
    );

    const columnsValue = React.useMemo(
      () => ({ columns, setColumns }),
      [columns, setColumns]
    );

    const actionsValue = React.useMemo(
      () => ({
        selectedColumn,
        setSelectedColumn,
        sortStatus,
        sortColumn,
        filterState,
        setFilterState,
        onGrouped,
        onPinned,
        onColumnChange,
        rebuildRows,
        autoSizeColumns,
        isColumnResizing,
        setIsColumnResizing,
        updateColumnWidthCache,
        resetColumnWidthCache,
      }),
      [
        selectedColumn,
        setSelectedColumn,
        sortStatus,
        sortColumn,
        filterState,
        setFilterState,
        onGrouped,
        onPinned,
        onColumnChange,
        rebuildRows,
        autoSizeColumns,
        isColumnResizing,
        setIsColumnResizing,
        updateColumnWidthCache,
        resetColumnWidthCache,
      ]
    );

    // #endregion
    // #region SECTION 14: RENDER ════════════════════════════════════════════════

    return (
      <DensityProvider density={density}>
        <GridThemeProvider theme={theme}>
          <SlotsProvider defaults={DEFAULT_SLOTS} slots={slots}>
            <GridProviders
              layout={layoutValue}
              columns={columnsValue}
              actions={actionsValue}
              selection={selectionValue}
            >
              <GridCanvas
                {...props}
                ref={gridCoreApiRef}
                getRowId={getRowId}
                defaultColumnDefs={defaultColumnDefs}
                onRowPress={handleRowPress}
                onRowLongPress={onRowLongPress}
                onHeaderRowPress={handleHeaderRowPress}
                onCellEditingStopped={onCellEditingStopped}
              />
            </GridProviders>
          </SlotsProvider>
        </GridThemeProvider>
      </DensityProvider>
    );
    // #endregion
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Grid = createGridComp<any>();

export default Grid;
