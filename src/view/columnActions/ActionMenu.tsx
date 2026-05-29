import {
  faCheck,
  faChevronRight,
  faFilter,
  faFilterSlash,
  faLayerGroup,
  faLeftRight,
  faSortAmountDown,
  faSortAmountUpAlt,
  faThumbTack,
} from "@fortawesome/pro-solid-svg-icons";
import React from "react";

import type {
  ColumnFilterState,
  SkiaInternalGridColumn,
  SortDir,
} from "../../core/types";
import { useDeepEqEffect, useRefCallback } from "../../internal/hooks";
import type { GridContextSnapshot } from "../context";
import { useSlots } from "../slots";
import { NormalFontAwesomeIcon } from "../slots/defaults";
import { ColumnUnsortLogo } from "./shared/ColumnUnsortLogo";
import {
  ActionContainer,
  FormButtonContainer,
  StyledButton,
  StyledFontAwesomeIcon,
  StyledText,
} from "./shared/formActionStyles";

export type Action = "filter" | "pin" | "autoResize";

type ActionMenuProps = {
  column: SkiaInternalGridColumn;
  filterKey: string;
  onActionItemClicked: (action: Action) => void;
  useGridActions: () => GridContextSnapshot;
  filterState: Map<string, ColumnFilterState>;
};

export const ActionMenu: React.FC<ActionMenuProps> = ({
  column,
  filterKey,
  onActionItemClicked,
  useGridActions,
  filterState,
}) => {
  const { ActionButton: Button } = useSlots();
  const { onGrouped, setFilterState, sortColumn } = useGridActions();

  const [sortedDirection, setSortedDirection] = React.useState<SortDir>(null);
  const [sortByAbsoluteValue, setSortByAbsoluteValue] =
    React.useState<boolean>(false);
  const [{ disableClear, hasMultipleFilters }, setClearState] = React.useState(
    () => ({
      disableClear: !filterState.get(filterKey),
      hasMultipleFilters: filterState?.size >= 2,
    })
  );

  const { canGrouped, canResize, canFilter, sortable, canPinned } =
    column ?? {};

  React.useEffect(() => {
    setSortedDirection(
      column && typeof column?.sortIndex === "number"
        ? column.sort ?? null
        : null
    );
    setSortByAbsoluteValue(column?.sortByAbsoluteValue ?? false);
  }, [column]);

  useDeepEqEffect(
    () => {
      setClearState({
        disableClear: !filterState.get(filterKey),
        hasMultipleFilters: filterState?.size >= 2,
      });
    },
    [filterKey],
    [filterState]
  );

  const handleColumnSortChanged = useRefCallback(
    (sort: SortDir, isLongPressed = false) => {
      if (column) {
        sortColumn?.({ ...column, sort }, isLongPressed, sortByAbsoluteValue);
        setSortedDirection(sort);
      }
    },
    [column, sortByAbsoluteValue, setSortedDirection, sortColumn]
  );

  const toggleSortByAbsoluteValue = useRefCallback(() => {
    if (column) {
      const newValue = !sortByAbsoluteValue;
      sortColumn?.({ ...column, sort: sortedDirection }, false, newValue);
      setSortByAbsoluteValue(newValue);
    }
  }, [column, sortByAbsoluteValue, sortedDirection, sortColumn]);

  const handleGroup = useRefCallback(() => {
    if (column) onGrouped?.(!column.rowGroup, column);
  }, [column]);

  const groupBtnLabel = React.useMemo(() => {
    if (column) return column.rowGroup ? "Ungroup" : "Group";
    return "Group";
  }, [column]);

  const handleClearFilter = useRefCallback(() => {
    if (column) {
      const newFilterState = [...filterState].reduce((res, i) => {
        const [key, filter] = i;
        if (key !== filterKey)
          res.push([key, { ...filter, filterIndex: res.length }]);

        return res;
      }, [] as [string, ColumnFilterState][]);
      setFilterState(new Map(newFilterState));
    }
  }, [column, filterState, setFilterState]);

  const handleClearAllFilter = useRefCallback(() => {
    setFilterState(new Map());
  }, [setFilterState]);

  return (
    <>
      {sortable && (
        <ActionContainer>
          <FormButtonContainer hasTopBorder>
            <Button
              onClick={() => handleColumnSortChanged("asc")}
              onLongPress={() => handleColumnSortChanged("asc", true)}
              text="Asc"
              buttonTheme="basic"
            >
              <NormalFontAwesomeIcon
                activeColor={
                  sortedDirection === "asc" ? "accentColor" : "cellTextColor"
                }
                icon={faSortAmountUpAlt}
                size={22}
              />
            </Button>
          </FormButtonContainer>
          <FormButtonContainer hasTopBorder>
            <Button
              onClick={() => handleColumnSortChanged("desc")}
              onLongPress={() => handleColumnSortChanged("desc", true)}
              text="Desc"
              buttonTheme="basic"
            >
              <NormalFontAwesomeIcon
                activeColor={
                  sortedDirection === "desc" ? "accentColor" : "cellTextColor"
                }
                icon={faSortAmountDown}
                size={22}
              />
            </Button>
          </FormButtonContainer>
          <FormButtonContainer hasTopBorder>
            <Button
              onClick={() => handleColumnSortChanged(null)}
              onLongPress={() => handleColumnSortChanged(null, true)}
              text="Clear Sorting"
              buttonTheme="basic"
            >
              <ColumnUnsortLogo sortedDirection={sortedDirection} />
            </Button>
          </FormButtonContainer>
        </ActionContainer>
      )}
      {canFilter && (
        <ActionContainer>
          <FormButtonContainer>
            <StyledButton
              onClick={() => onActionItemClicked("filter")}
              buttonTheme="basic"
            >
              <StyledFontAwesomeIcon size={14} icon={faFilter} />
              <StyledText>Filter</StyledText>
              <StyledFontAwesomeIcon size={12} icon={faChevronRight} />
            </StyledButton>
          </FormButtonContainer>
          <FormButtonContainer>
            <StyledButton
              onClick={handleClearFilter}
              buttonTheme="basic"
              disabled={disableClear}
            >
              <StyledFontAwesomeIcon
                size={16}
                icon={faFilterSlash}
                disabled={disableClear}
              />
              <StyledText disabled={disableClear}>Clear Filters</StyledText>
            </StyledButton>
          </FormButtonContainer>
          {hasMultipleFilters && (
            <FormButtonContainer>
              <StyledButton onClick={handleClearAllFilter} buttonTheme="basic">
                <StyledFontAwesomeIcon size={16} icon={faFilterSlash} />
                <StyledText>Clear All Filters</StyledText>
              </StyledButton>
            </FormButtonContainer>
          )}
        </ActionContainer>
      )}
      {canResize && !column?.rowGroup && (
        <ActionContainer>
          <FormButtonContainer>
            <StyledButton
              onClick={() => onActionItemClicked("autoResize")}
              buttonTheme="basic"
            >
              <StyledFontAwesomeIcon size={14} icon={faLeftRight} />
              <StyledText>Auto size</StyledText>
            </StyledButton>
          </FormButtonContainer>
        </ActionContainer>
      )}
      {canPinned && !column?.rowGroup && (
        <ActionContainer>
          <FormButtonContainer>
            <StyledButton
              onClick={() => onActionItemClicked("pin")}
              buttonTheme="basic"
            >
              <StyledFontAwesomeIcon size={16} icon={faThumbTack} />
              <StyledText>Pin Column</StyledText>
            </StyledButton>
          </FormButtonContainer>
        </ActionContainer>
      )}
      {canGrouped && (
        <ActionContainer>
          <FormButtonContainer>
            <StyledButton onClick={handleGroup} buttonTheme="basic">
              <StyledFontAwesomeIcon size={16} icon={faLayerGroup} />
              <StyledText>{groupBtnLabel}</StyledText>
            </StyledButton>
          </FormButtonContainer>
        </ActionContainer>
      )}
      {column && column.type === "numeric" ? (
        <ActionContainer>
          <FormButtonContainer>
            <StyledButton
              onClick={toggleSortByAbsoluteValue}
              buttonTheme="basic"
            >
              <StyledFontAwesomeIcon
                size={14}
                icon={faCheck}
                style={{ opacity: sortByAbsoluteValue ? 1 : 0 }}
              />
              <StyledText>Sort By Absolute Value</StyledText>
            </StyledButton>
          </FormButtonContainer>
        </ActionContainer>
      ) : null}
    </>
  );
};
