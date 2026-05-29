import React from "react";

import type { SkiaInternalGridColumn } from "../../core/types";
import { useRefCallback } from "../../internal/hooks";
import { getFilterKey } from "../../utils/gridUtils";
import {
  type GridContextSnapshot,
  useGridActions,
  useGridColumns,
  useGridLayout,
  useGridSelection,
} from "../context";
import { useSlots } from "../slots";
import { ActionMenu, type Action } from "./ActionMenu";
import { AutoSizeMenu } from "./autoSize/AutoSizeMenu";
import { FilterMenu } from "./filter/FilterMenu";
import { PinMenu } from "./pin/PinMenu";
import { HeaderTooltip } from "./shared/HeaderTooltip";

const DEFAULT_FILTER_SNAP = 250;

export const ColumnActionsModal: React.FC<unknown> = () => {
  const { BottomSheet } = useSlots();
  const layout = useGridLayout();
  const selection = useGridSelection();
  const cols = useGridColumns();
  const actions = useGridActions();

  const gridContext: GridContextSnapshot = React.useMemo(
    () => ({ ...layout, ...selection, ...cols, ...actions }),
    [layout, selection, cols, actions]
  );

  const {
    selectedColumn,
    columns,
    setSelectedColumn,
    isColumnResizing,
    filterState,
  } = gridContext;

  const [selectedAction, setSelectedAction] = React.useState<Action | null>(
    null
  );

  const getGridContext = useRefCallback(() => gridContext, [gridContext]);

  const column: SkiaInternalGridColumn | undefined = React.useMemo(
    () =>
      selectedColumn
        ? columns?.find(
            (i) =>
              i.__id === selectedColumn?.__id ||
              i.id === selectedColumn?.id ||
              i.colId === selectedColumn?.colId ||
              i.field === selectedColumn?.field
          )
        : undefined,
    [columns, selectedColumn]
  );

  const { actionEnabled, filterKey } = React.useMemo(() => {
    const actionEnabled =
      column?.canGrouped ||
      column?.canResize ||
      column?.canFilter ||
      column?.sortable ||
      column?.canPinned;

    return {
      actionEnabled,
      filterKey: column?.canFilter ? getFilterKey(column) : "",
    };
  }, [column]);

  const handleClose = useRefCallback(() => {
    if (!isColumnResizing) {
      setSelectedColumn?.(null);
      setSelectedAction(null);
    }
  }, [setSelectedColumn, isColumnResizing]);

  const onActionItemClicked = useRefCallback((action: Action) => {
    setSelectedAction(action);
  }, []);

  const onBackClick = useRefCallback(() => {
    setSelectedAction(null);
  }, []);

  const content = React.useMemo(() => {
    switch (selectedAction) {
      case "autoResize":
        return (
          <AutoSizeMenu
            column={column!}
            onBackClick={onBackClick}
            useGridActions={getGridContext}
          />
        );
      case "filter":
        return (
          <FilterMenu
            column={column!}
            filterKey={filterKey}
            onBackClick={onBackClick}
            useGridActions={getGridContext}
          />
        );
      case "pin":
        return (
          <PinMenu
            column={column!}
            onBackClick={onBackClick}
            useGridActions={getGridContext}
          />
        );
      default:
        return (
          <ActionMenu
            column={column!}
            filterKey={filterKey}
            onActionItemClicked={onActionItemClicked}
            useGridActions={getGridContext}
            filterState={filterState}
          />
        );
    }
  }, [
    selectedAction,
    column,
    filterKey,
    filterState,
    getGridContext,
    onActionItemClicked,
    onBackClick,
  ]);

  return (
    <BottomSheet
      onClose={handleClose}
      isVisible={!!actionEnabled && !isColumnResizing}
      fitContent={selectedAction !== "filter"}
      snapPoints={
        selectedAction === "filter" ? [DEFAULT_FILTER_SNAP, "100%"] : undefined
      }
    >
      <HeaderTooltip column={column} />
      {content}
    </BottomSheet>
  );
};
