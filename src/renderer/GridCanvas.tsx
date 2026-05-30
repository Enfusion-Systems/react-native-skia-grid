import { useDeepEqChange, useRefCallback } from "../internal/hooks";
import { MutedText, NormalFontAwesomeIcon } from "../view/slots/defaults";
import { forwardRef } from "../internal/utils";
import { useGridTheme, useGridStyles, useTokens } from "../themes";
import { faLayerGroup } from "@fortawesome/pro-solid-svg-icons";
import { Canvas, CanvasRef } from "@shopify/react-native-skia";
import * as React from "react";
import { Dimensions, LayoutChangeEvent, LayoutRectangle, StyleSheet, View, ViewProps } from "react-native";
import {
  GestureDetector,
  GestureStateChangeEvent,
  GestureUpdateEvent,
  LongPressGestureHandlerEventPayload,
  PanGestureChangeEventPayload,
  PanGestureHandlerEventPayload,
  TapGestureHandlerEventPayload,
} from "react-native-gesture-handler";
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from "react-native-reanimated";
import { ColumnActionsModal } from "../view/columnActions";
import {
  useGridActions,
  useGridColumns,
  useGridLayout,
  useGridSelection,
} from "../view/context";
import { CellEditingModal } from "../view/CellEditingModal";
import { ColumnGroupingControl } from "../view/ColumnGroupingControl";
import { VerticalGroup } from "./VerticalGroup";
import useCellBackground from "./layers/useCellBackground";
import useCellContent from "./layers/useCellContent";
import useCellOverlay from "./layers/useCellOverlay";
import useDerivedCellTransform from "./layers/useDerivedCellTransform";
import useDerivedClip from "./layers/useDerivedClip";
import useHeaderBackground from "./layers/useHeaderBackground";
import useHeaderContent from "./layers/useHeaderContent";
import useHeaderOverlay from "./layers/useHeaderOverlay";
import useSectionOverlay from "./layers/useSectionOverlay";
import { useSectionSeparator } from "./layers/useSectionSeparator";
import { useGridGestures } from "./interaction/useGridGestures";
import { applyScrollDecay } from "./interaction/scrollPhysics";
import {
  CellEditingStartedEvent,
  ColumnFilterState,
  ColumnSection,
  ColumnSort,
  PanGesture,
  PanGestures,
  PinnedStatuses,
  RowNode,
  SectionSeparatorKeys,
  SelectedCellParams,
  SkiaGridCoreAPI,
  SkiaGridProps,
  SkiaInternalGridColumn,
} from "../core/types";
import {
  CHECKBOX_COLUMN_HEADER,
  HEADER_ROW_HEIGHT_DEFAULT,
  MIN_COLUMN_SIZE,
  RESIZE_ICON_WIDTH,
  ROW_HEIGHT_DEFAULT,
} from "../utils/constants";
import {
  DEFAULT_SECTION_SEPARATION,
  getColumnAtX,
  getColumnValue,
  getFolderCalculatedCheckedState,
} from "../utils/gridUtils";
import {
  calculatePinnedWidth,
  calculateSectionWidth,
  getPositionValue,
  translationClamp,
} from "./sectionWidthUtils";
import { useColumnSectionLayout } from "./useColumnSectionLayout";
import useDerivedXVal from "./useDerivedXVal";

function Row({ style, children, ...rest }: ViewProps) {
  const { row } = useGridStyles();
  return (
    <View {...rest} style={[row.root, style]}>
      {children}
    </View>
  );
}

function GroupSectionTitle(props: React.ComponentProps<typeof MutedText>) {
  const { style, ...rest } = props;
  return <MutedText style={[styles.groupSectionTitle, style]} {...rest} />;
}

function StyledFontAwesomeIcon(props: React.ComponentProps<typeof NormalFontAwesomeIcon>) {
  return <NormalFontAwesomeIcon style={[styles.styledIcon, props.style as any]} {...props} />;
}

function GridContainer({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.gridContainer, style]}>
      {children}
    </View>
  );
}

type DrawPos =
  | GestureUpdateEvent<
      PanGestureHandlerEventPayload & PanGestureChangeEventPayload
    >
  | GestureStateChangeEvent<
      PanGestureHandlerEventPayload | TapGestureHandlerEventPayload
    >;

export function createGridCanvas<T extends Object>() {
  return forwardRef<SkiaGridCoreAPI, SkiaGridProps<T>>(function GridCanvasT(
    {
      onPressInside,
      headerHeight = HEADER_ROW_HEIGHT_DEFAULT,
      rowHeight = ROW_HEIGHT_DEFAULT,
      onRowPress,
      onRowLongPress,
      onHeaderRowPress,
      onHeaderRowLongPress,
      debug,
      onGridReady,
      onSortChange,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      showColumnGroupingControl,
      components,
      onCellEditingStarted,
      onCellEditingStopped,
      icons: gridIcons,
      getIsRowSelected,
      rowSelection = "single",
      rowBuffer = 30,
      columnBuffer = 2,
      context,
      onColumnRowGroupChanged,
      noDataText,
      columnSectionSpacingWidth,
      enableColumnSectionResize = false,
      bottomInset = 0,
      onSectionResize,
      selectedRow,
      onLayoutComplete,
    },
    ref
  ) {
    const [selectedCellParams, setSelectedCellParams] = React.useState<
      SelectedCellParams<T>
    >({
      row: selectedRow ?? null,
      cellEditingParams: null,
      cellTooltip: null,
      isEditable: false,
    });
    const [isSectionResizing, setIsSectionResizing] = React.useState(false);

    const gridApiRef = React.useRef<boolean>(false);
    const layout = useSharedValue<LayoutRectangle>({
      x: 0,
      y: 0,
      width: Dimensions.get("window").width,
      height: Dimensions.get("window").height,
    });

    const y = useSharedValue<number>(0);
    const pinnedX = useSharedValue<number>(0);
    const unpinnedX = useSharedValue<number>(0);
    const rightPinnedX = useSharedValue<number>(0);
    const headerOverlayColumnWidth = useSharedValue<number>(0);
    const sectionOverlayWidth = useSharedValue<number>(0);
    const selectedSection = React.useRef<SectionSeparatorKeys | null>(null);
    const offsetY = React.useRef<number>(0);
    const offsetUnpinnedX = React.useRef<number>(0);
    const offsetPinnedX = React.useRef<number>(0);
    const offsetRightPinnedX = React.useRef<number>(0);
    const fullX = React.useRef<number>(0);
    const offsetXFull = React.useRef<number>(0);

    const { topRowNode, fullHeight, totalHeaderHeight } = useGridLayout();
    const { rows, nodesSelection, setNodesSelection } = useGridSelection();
    const { columns, selectedColumn, sortStatus, isColumnResizing, filterState } =
      useGridColumns();
    const {
      setColumns,
      setSelectedColumn,
      onColumnChange,
      setIsColumnResizing,
    } = useGridActions();
    const theme = useGridTheme();
    const t = useTokens();

    // #region refs
    const canvasRef = React.useRef<CanvasRef | null>(null);
    const isRightPinnedLastColumnResizing = React.useRef<boolean>(false);
    const shouldScrollGrid = React.useRef<boolean>(true);
    const pressCount = React.useRef(0);
    const prevPosRef = React.useRef<GestureStateChangeEvent<
      PanGestureHandlerEventPayload | TapGestureHandlerEventPayload
    > | null>(null);
    const inPinnedXRef = React.useRef(false);
    const inRightPinnedXRef = React.useRef(false);
    const dragRef = React.useRef<boolean>(false);
    const widthsRef = React.useRef<Record<ColumnSection, number>>({
      left: 0,
      right: 0,
      center: 0,
    });
    // #endregion refs

    const getColumnById = useRefCallback(
      (id: string) => {
        return columns.find((i) => i.id === id || i.__id === id);
      },
      [columns]
    );

    const { sections, totalWidths, individualWidths } =
      useColumnSectionLayout(columns);
    const pinnedColumns = sections.left;
    const unpinnedColumns = sections.center;
    const rightPinnedColumns = sections.right;
    const columnWidths = totalWidths;
    const pinnedColumnWidths = individualWidths.left;
    const unpinnedColumnWidths = individualWidths.center;
    const rightPinnedColumnWidths = individualWidths.right;

    const columnSeparatorWidths: Record<SectionSeparatorKeys, number> =
      React.useMemo(
        () => ({
          left: pinnedColumns.length
            ? columnSectionSpacingWidth?.left ?? DEFAULT_SECTION_SEPARATION.left
            : 0,
          right: rightPinnedColumns.length
            ? columnSectionSpacingWidth?.right ??
              DEFAULT_SECTION_SEPARATION.right
            : 0,
        }),
        [
          pinnedColumns.length,
          rightPinnedColumns.length,
          columnSectionSpacingWidth?.left,
          columnSectionSpacingWidth?.right,
        ]
      );

    const getPinnedWidth = (availableWidth: number) => {
      return calculatePinnedWidth(
        columnWidths.left,
        columnWidths.center + columnWidths.right,
        availableWidth
      );
    };

    const getRightPinnedWidth = (availableWidth: number) => {
      return calculatePinnedWidth(
        columnWidths.right,
        columnWidths.center + columnWidths.left,
        availableWidth
      );
    };

    const unPinnedCellTransformSharedValue = useSharedValue<{
      width: number;
    }>({
      width:
        layout.value.width -
        getPinnedWidth(layout.value.width) -
        getRightPinnedWidth(layout.value.width),
    });

    const pinnedCellTransformSharedValue = useSharedValue<{ width: number }>({
      width: getPinnedWidth(layout.value.width),
    });

    const rightPinnedCellTransformSharedValue = useSharedValue<{
      width: number;
    }>({
      width: getRightPinnedWidth(layout.value.width),
    });

    // #region effects
    React.useEffect(() => {
      if (selectedColumn) onCellEditingCancel();
    }, [selectedCellParams.row, selectedColumn]);

    const lastLeftPinnedColIdx = React.useMemo(
      () =>
        pinnedColumns.length &&
        columns.findIndex((col) => {
          return col.__id === pinnedColumns[pinnedColumns.length - 1].__id;
        }),
      [columns, pinnedColumns]
    );
    const firstRightPinnedColIdx = React.useMemo(
      () =>
        rightPinnedColumns.length &&
        columns.findIndex((col) => col.__id === rightPinnedColumns[0].__id),
      [columns, rightPinnedColumns]
    );

    const updateGridDimensions = useRefCallback(() => {
      if (!columns.length) return;
      const currentSectionWidth = { left: 0, right: 0, center: 0 };
      currentSectionWidth.left = getPinnedWidth(layout.value.width);
      currentSectionWidth.right = getRightPinnedWidth(layout.value.width);
      currentSectionWidth.center =
        layout.value.width -
        currentSectionWidth.left -
        currentSectionWidth.right -
        columnSeparatorWidths.left -
        columnSeparatorWidths.right;

      if (
        widthsRef.current.left !== currentSectionWidth.left ||
        widthsRef.current.center !== currentSectionWidth.center ||
        widthsRef.current.right !== currentSectionWidth.right
      ) {
        widthsRef.current = currentSectionWidth;
        const newState = [...columns];
        if (selectedSection.current === "left") {
          const leftColOffsetWidth =
            columnWidths.left - columns[lastLeftPinnedColIdx]?.width;
          newState[lastLeftPinnedColIdx] = {
            ...newState[lastLeftPinnedColIdx],
            width: Math.max(
              currentSectionWidth.left - leftColOffsetWidth,
              MIN_COLUMN_SIZE
            ),
          };
        } else if (selectedSection.current === "right") {
          const rightColOffsetWidth =
            columnWidths.right - columns[firstRightPinnedColIdx]?.width;
          newState[firstRightPinnedColIdx] = {
            ...newState[firstRightPinnedColIdx],
            width: Math.max(
              currentSectionWidth.right - rightColOffsetWidth,
              MIN_COLUMN_SIZE
            ),
          };
        }
        setColumns(newState);
        //Delaying this in order to avoid race condition during initial load
        setTimeout(() => onSectionResize?.(currentSectionWidth), 100);
      }

      pinnedCellTransformSharedValue.value = {
        width: widthsRef.current.left,
      };
      unPinnedCellTransformSharedValue.value = {
        width: widthsRef.current.center,
      };
      rightPinnedCellTransformSharedValue.value = {
        width: widthsRef.current.right,
      };
    }, [
      columns,
      layout.value.width,
      columnWidths,
      lastLeftPinnedColIdx,
      firstRightPinnedColIdx,
      columnSeparatorWidths,
    ]);

    React.useEffect(() => {
      updateGridDimensions();
    }, [columnWidths]);

    useAnimatedReaction(
      () => layout.value.width,
      (currentWidth, previousWidth) => {
        if (previousWidth && currentWidth !== previousWidth) {
          runOnJS(updateGridDimensions)();
        }
      },
      [updateGridDimensions]
    );

    const headerSelectionState = React.useMemo(
      () => nodesSelection.get(CHECKBOX_COLUMN_HEADER) ?? 0,
      [nodesSelection]
    );

    const sortStatusKey = useDeepEqChange([sortStatus]);
    React.useEffect(() => {
      if (!sortStatus || sortStatus.length === 0) {
        handleSortChange(null);
      } else {
        const colDef = getColumnById(selectedColumn?.__id ?? "");
        const columnSortStatus = sortStatus?.find(
          (item) => item.columnId === selectedColumn?.__id
        );
        handleSortChange(
          colDef
            ? [
                {
                  columnName: colDef.id,
                  ascending: columnSortStatus?.sort === "asc",
                },
              ]
            : null
        );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortStatusKey]);
    // #endregion effects

    const sectionWidth = React.useMemo(
      () => ({ ...widthsRef.current }),
      [
        widthsRef.current.left,
        widthsRef.current.center,
        widthsRef.current.right,
      ]
    );

    const xVal = useDerivedXVal({
      sectionWidth,
      columnSeparatorWidths,
    });

    // #region api
    const scrollToRowIndex = useRefCallback(
      (index: number) => {
        if (index !== -1) {
          y.value = translationClamp(
            -index * rowHeight,
            layout.value.height - fullHeight
          );
        }
      },
      [y, fullHeight, rowHeight, layout]
    );

    const setSectionWidthsInternal = useRefCallback(
      (newSectionWidth?: Partial<Record<ColumnSection, number>>) => {
        let calcSectionWidth = { ...widthsRef.current };
        if (newSectionWidth) {
          calcSectionWidth = calculateSectionWidth(
            { ...widthsRef.current },
            newSectionWidth
          );
        }

        widthsRef.current = calcSectionWidth;

        pinnedCellTransformSharedValue.value = {
          width: widthsRef.current.left,
        };
        unPinnedCellTransformSharedValue.value = {
          width: widthsRef.current.center,
        };
        rightPinnedCellTransformSharedValue.value = {
          width: widthsRef.current.right,
        };

        onSectionResize?.(calcSectionWidth);
      },
      [
        widthsRef,
        pinnedCellTransformSharedValue,
        unPinnedCellTransformSharedValue,
        rightPinnedCellTransformSharedValue,
      ]
    );

    const setSelectedRow = useRefCallback(
      (node: RowNode | null) => {
        if (rowSelection === "single")
          setSelectedCellParams({
            row: node,
            cellEditingParams: null,
          });

        if (rowSelection === "multiple" && node === null) {
          setNodesSelection(new Map());
          setSelectedCellParams({
            row: null,
            cellEditingParams: null,
          });
        }
      },
      [rowSelection, selectedCellParams]
    );

    React.useImperativeHandle(ref, () => ({
      scrollToRowIndex,
      setSectionWidth: setSectionWidthsInternal,
      setSelectedRow,
    }));
    // #endregion api

    // #region selection
    const isRowSelected = useRefCallback(
      (node: RowNode<T>) => {
        const headerSelectionState =
          nodesSelection.get(CHECKBOX_COLUMN_HEADER) ?? 0;
        if (rowSelection !== "single" && headerSelectionState !== 2)
          return headerSelectionState;

        if (getIsRowSelected) return getIsRowSelected(node) ? 1 : 0;

        if (node.group)
          return (
            getFolderCalculatedCheckedState(node.children, nodesSelection) ?? 0
          );

        return nodesSelection.get(node.__id) ?? 0;
      },
      [
        getIsRowSelected,
        nodesSelection,
        rowSelection,
        getFolderCalculatedCheckedState,
      ]
    );
    // #endregion selection

    const handleSortChange = useRefCallback(
      (columnSort: ColumnSort) => onSortChange?.(columnSort),
      [onSortChange]
    );

    const handleLayout = useRefCallback(
      (event: LayoutChangeEvent) => {
        if (event.nativeEvent.layout.width && event.nativeEvent.layout.height)
          layout.value = event.nativeEvent.layout;
        if (!gridApiRef.current) {
          gridApiRef.current = true;
          onGridReady?.();
        }
      },
      [onGridReady, gridApiRef]
    );

    const resizeSectionIconClicked = useRefCallback(() => {
      const xPos = Math.abs(offsetXFull.current);

      if (
        sectionWidth.right &&
        xPos - RESIZE_ICON_WIDTH / 2 < xVal.right &&
        xPos + RESIZE_ICON_WIDTH / 2 > xVal.right
      ) {
        selectedSection.current = "right";
        return true;
      } else if (
        sectionWidth.left &&
        xPos - RESIZE_ICON_WIDTH / 2 < xVal.center &&
        xPos + RESIZE_ICON_WIDTH / 2 > xVal.center
      ) {
        selectedSection.current = "left";
        return true;
      }
      return false;
    }, [offsetXFull, xVal, selectedSection, sectionOverlayWidth, sectionWidth]);

    const resizeIconClicked = useRefCallback(() => {
      if (!selectedColumn) return false;
      const pinnedWidth = widthsRef.current.left;
      const unpinnedWidth = widthsRef.current.center;

      const xPos = Math.abs(offsetXFull.current);
      const xPosUnpinned = Math.abs(offsetUnpinnedX.current) - pinnedWidth;
      const xPosPinned = Math.abs(offsetPinnedX.current);
      const xPosRightPinned =
        Math.abs(offsetRightPinnedX.current) - pinnedWidth - unpinnedWidth;

      let xLeftOverWidth;
      let clickedSection;
      if (xPos < pinnedWidth) {
        clickedSection = pinnedColumns;
        xLeftOverWidth = xPosPinned;
      } else if (xPos > pinnedWidth + unpinnedWidth) {
        clickedSection = rightPinnedColumns;
        xLeftOverWidth = xPosRightPinned;
      } else {
        clickedSection = unpinnedColumns;
        xLeftOverWidth = xPosUnpinned;
      }

      for (let i = 0; i < clickedSection.length; i++) {
        if (
          !(
            clickedSection.length - 1 === i &&
            clickedSection[i].pinned === PinnedStatuses.RIGHT
          )
        )
          xLeftOverWidth -= clickedSection[i].width;

        if (
          xLeftOverWidth <= 20 &&
          xLeftOverWidth >= -20 &&
          selectedColumn.__id === clickedSection[i].__id
        )
          return true;
      }
      return false;
    }, [
      unpinnedColumns,
      pinnedColumns,
      offsetPinnedX.current,
      offsetUnpinnedX.current,
      offsetXFull.current,
      selectedColumn,
      rightPinnedColumns,
      offsetRightPinnedX.current,
      widthsRef,
    ]);

    const getColumn = useRefCallback(() => {
      const pinnedWidth = widthsRef.current.left;
      const unpinnedWidth = widthsRef.current.center;

      const xPos = Math.abs(offsetXFull.current);
      const xPosUnpinned = Math.abs(offsetUnpinnedX.current) - pinnedWidth;
      const xPosPinned = Math.abs(offsetPinnedX.current);
      const xPosRightPinned =
        Math.abs(offsetRightPinnedX.current) - pinnedWidth - unpinnedWidth;

      return xPos < pinnedWidth
        ? getColumnAtX(pinnedColumns, xPosPinned)
        : xPos > pinnedWidth + unpinnedWidth
        ? getColumnAtX(rightPinnedColumns, xPosRightPinned)
        : getColumnAtX(unpinnedColumns, xPosUnpinned);
    }, [
      offsetPinnedX,
      offsetUnpinnedX,
      offsetXFull,
      getColumnAtX,
      pinnedColumns,
      unpinnedColumns,
      rightPinnedColumns,
      offsetRightPinnedX,
      widthsRef,
    ]);

    const handleRowPress = useRefCallback(
      (width: number, longPress: boolean) => {
        const yPosBase = Math.abs(offsetY.current);
        const yPos =
          yPosBase - totalHeaderHeight - (!!topRowNode ? rowHeight : 0);

        const yRelPos = Math.abs(offsetY.current - y.value) - totalHeaderHeight;
        const rowIdx = Math.max(Math.floor(yPos / rowHeight), -1);
        let row = rows[rowIdx];

        if (!!topRowNode && yPosBase - totalHeaderHeight < rowHeight) {
          row = { ...topRowNode, pinned: true };
        }
        let col = getColumn();
        if (col) {
          if (yRelPos <= 0 && longPress) {
            onHeaderRowLongPress?.(col);
          } else if (yRelPos <= 0) {
            onHeaderRowPress?.(col, pressCount.current);
            if (
              selectedColumn?.__id === col.__id ||
              col.headerCheckboxSelection
            )
              setSelectedColumn?.(null);
            else setSelectedColumn?.(col);
          } else if (row && longPress) {
            setSelectedColumn?.(null);
            setSelectedCellParams({
              row: selectedCellParams.row?.__index !== row.__index ? row : null,
              cellEditingParams: null,
            });
            onRowLongPress?.(row, col);
          } else if (row) {
            setSelectedColumn?.(null);

            onRowPress?.(row, col, pressCount.current);
            const isCellEditable =
              typeof col.editable === "function"
                ? col.editable?.(row, context, nodesSelection, col)
                : col.editable;

            const isDiffColumn =
              col.__id !== selectedCellParams.cellEditingParams?.colDef.__id;
            const isDiffRow = selectedCellParams.row?.__index !== row.__index;
            const cellValue = getColumnValue(row, col);
            const params = {
              colDef: col,
              value: cellValue,
              data: row.data,
              node: row,
              rowIndex: rowIdx,
              context: {
                ...context,
                isSelected: isRowSelected(row) === 1,
              },
            } as CellEditingStartedEvent;
            const tooltip = col.tooltipValueGetter?.(row, context);
            setSelectedCellParams({
              row: isDiffRow || isCellEditable || tooltip ? row : null,
              cellEditingParams: isDiffColumn || isDiffRow ? params : null,
              cellTooltip: tooltip,
              isEditable: isCellEditable,
            });
            onCellEditingStarted?.(params);
          }
        }
        pressCount.current = 0;
      },
      [
        rows,
        offsetY,
        getColumnAtX,
        onHeaderRowLongPress,
        onHeaderRowPress,
        onRowPress,
        onRowLongPress,
        pressCount,
        pinnedColumns,
        unpinnedColumns,
        rightPinnedColumns,
        setSelectedColumn,
        selectedColumn,
        getColumn,
        totalHeaderHeight,
        y,
        rowHeight,
        topRowNode,
        selectedCellParams,
        isRowSelected,
        widthsRef,
        unPinnedCellTransformSharedValue,
        rightPinnedCellTransformSharedValue,
      ]
    );

    const increasedColumnWidth = useRefCallback(
      (col: SkiaInternalGridColumn<T>, currentXPos: number) => {
        const xPos = Math.abs(offsetXFull.current);
        const currentIncreasedWidth = isRightPinnedLastColumnResizing.current
          ? xPos - currentXPos
          : currentXPos - xPos;

        shouldScrollGrid.current =
          isRightPinnedLastColumnResizing.current &&
          col.width + currentIncreasedWidth >= MIN_COLUMN_SIZE;

        return col.width + currentIncreasedWidth;
      },
      [offsetXFull, isRightPinnedLastColumnResizing, shouldScrollGrid]
    );

    const increasedSectionWidth = useRefCallback(
      (currentXPos: number) => {
        const xPos = Math.abs(offsetXFull.current);
        const increasedWidth = currentXPos - xPos;

        let currentSectionWidth = { ...widthsRef.current };

        if (selectedSection.current === "left") {
          currentSectionWidth = calculateSectionWidth(currentSectionWidth, {
            left: widthsRef.current.left + increasedWidth,
          });
        } else if (selectedSection.current === "right") {
          currentSectionWidth = calculateSectionWidth(currentSectionWidth, {
            right: widthsRef.current.right - increasedWidth,
          });
        }
        return currentSectionWidth;
      },
      [offsetXFull, selectedSection, widthsRef]
    );

    const handleSectionResize = useRefCallback(
      (currentXPos: number) => {
        const sectionWidth = increasedSectionWidth(currentXPos);
        if (selectedSection.current)
          sectionOverlayWidth.value = sectionWidth[selectedSection.current];
      },
      [sectionOverlayWidth, increasedSectionWidth, selectedSection]
    );

    const handleColumnResize = useRefCallback(
      (col: SkiaInternalGridColumn<T>, currentXPos: number) => {
        const columnWidth = Math.max(
          increasedColumnWidth(col, currentXPos),
          MIN_COLUMN_SIZE
        );
        headerOverlayColumnWidth.value = columnWidth;
      },
      [setColumns, increasedColumnWidth, columns]
    );

    const ColumnGroup = React.useMemo(() => {
      if (showColumnGroupingControl) {
        const isColumnsGrouped = columns?.some((col) => col.rowGroup);
        return (
          <Row theme={theme}>
            {isColumnsGrouped ? (
              <ColumnGroupingControl
                onColumnRowGroupChanged={onColumnRowGroupChanged}
              />
            ) : (
              <>
                <StyledFontAwesomeIcon size={14} icon={faLayerGroup} disabled />
                <GroupSectionTitle>No grouped columns</GroupSectionTitle>
              </>
            )}
          </Row>
        );
      }
      return <></>;
    }, [showColumnGroupingControl, columns]);

    const onCellEditingCancel = useRefCallback(() => {
      setSelectedCellParams({
        row: null,
        cellEditingParams: null,
      });
    }, []);

    const onStart = useRefCallback(
      (
        pos: GestureStateChangeEvent<
          | PanGestureHandlerEventPayload
          | TapGestureHandlerEventPayload
          | LongPressGestureHandlerEventPayload
        >,
        longPress?: boolean
      ) => {
        onTouchStart?.();
        offsetXFull.current = fullX.current - pos.x;

        pressCount.current += 1;
        prevPosRef.current = pos;

        inPinnedXRef.current = pos.x < widthsRef.current.left;
        inRightPinnedXRef.current =
          pos.x > layout.value.width - widthsRef.current.right;

        const pinnedWidth = widthsRef.current.left;
        const rightPinnedWidth = widthsRef.current.right;
        const unpinnedWidth = widthsRef.current.center;

        const updatedY = getPositionValue(
          y.value,
          layout.value.height - fullHeight
        );
        y.value = updatedY;
        offsetY.current = updatedY - pos.y;
        if (inPinnedXRef.current) {
          const updatePinnedX = getPositionValue(
            pinnedX.value,
            pinnedWidth - columnWidths.left
          );
          pinnedX.value = updatePinnedX;
          offsetPinnedX.current = updatePinnedX - pos.x;
        }

        if (inRightPinnedXRef.current) {
          const updatedRightPinnedX = getPositionValue(
            rightPinnedX.value,
            rightPinnedWidth - columnWidths.right
          );
          rightPinnedX.value = updatedRightPinnedX;
          offsetRightPinnedX.current = updatedRightPinnedX - pos.x;
        } else {
          const updatedUnpinnedX = getPositionValue(
            unpinnedX.value,
            unpinnedWidth - columnWidths.center
          );
          unpinnedX.value = updatedUnpinnedX;
          offsetUnpinnedX.current = updatedUnpinnedX - pos.x;
        }

        if (longPress) {
          handleRowPress(layout.value.width, longPress);
        }

        const resizing = resizeIconClicked() && pos.y <= totalHeaderHeight;
        if (resizing)
          headerOverlayColumnWidth.value = selectedColumn?.width ?? 0;
        setIsColumnResizing(resizing);
        const sectionResizing =
          resizeSectionIconClicked() && enableColumnSectionResize;
        setIsSectionResizing(sectionResizing);
        shouldScrollGrid.current = !resizing && !sectionResizing;
        if (sectionResizing) {
          sectionOverlayWidth.value =
            selectedSection.current === "left"
              ? widthsRef.current.left
              : widthsRef.current.right;
        }

        isRightPinnedLastColumnResizing.current =
          resizing &&
          rightPinnedColumns.length > 0 &&
          rightPinnedColumns.findIndex(
            (item) => item.__id === selectedColumn?.__id
          ) ===
            rightPinnedColumns.length - 1;
      },
      [
        offsetXFull,
        fullX,
        pressCount,
        pinnedX,
        unpinnedX,
        rightPinnedX,
        offsetPinnedX,
        offsetRightPinnedX,
        offsetUnpinnedX,
        prevPosRef,
        layout.value,
        inPinnedXRef,
        inRightPinnedXRef,
        totalHeaderHeight,
        shouldScrollGrid,
        isRightPinnedLastColumnResizing,
        rightPinnedColumns,
        selectedColumn,
        fullHeight,
        y,
        selectedColumn,
        resizeIconClicked,
        setIsColumnResizing,
        setIsSectionResizing,
        selectedSection,
        sectionOverlayWidth,
        widthsRef,
        enableColumnSectionResize,
      ]
    );

    const onActive = useRefCallback(
      (
        pos: GestureUpdateEvent<
          PanGestureHandlerEventPayload & PanGestureChangeEventPayload
        >
      ) => {
        dragRef.current = true;

        onTouchMove?.();
        fullX.current = translationClamp(
          offsetXFull.current + pos.x,
          layout.value.width
        );
        if (isSectionResizing) {
          handleSectionResize(pos.x);
        } else if (selectedColumn && isColumnResizing) {
          handleColumnResize(selectedColumn, pos.x);
        }

        if (shouldScrollGrid.current) {
          y.value += pos.changeY;
          if (inPinnedXRef.current) {
            pinnedX.value += pos.changeX;
          } else if (inRightPinnedXRef.current) {
            rightPinnedX.value += pos.changeX;
          } else {
            unpinnedX.value += pos.changeX;
          }
        }
      },
      [
        dragRef,
        fullX,
        offsetXFull,
        layout.value,
        selectedColumn,
        isColumnResizing,
        handleColumnResize,
        inPinnedXRef,
        inRightPinnedXRef,
        shouldScrollGrid,
        y,
        pinnedX,
        rightPinnedX,
        unpinnedX,
        isSectionResizing,
      ]
    );

    const handleEnd = useRefCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pos: any, longPress: boolean) => {
        if (!dragRef.current && !longPress) {
          handleRowPress(layout.value.width, longPress);
        }

        onTouchEnd?.();
        prevPosRef.current = null;
        dragRef.current = false;
        if (isSectionResizing) {
          const calcSectionWidth = increasedSectionWidth(pos.x);

          widthsRef.current = calcSectionWidth;

          pinnedCellTransformSharedValue.value = {
            width: widthsRef.current.left,
          };
          unPinnedCellTransformSharedValue.value = {
            width: widthsRef.current.center,
          };
          rightPinnedCellTransformSharedValue.value = {
            width: widthsRef.current.right,
          };

          onSectionResize?.(calcSectionWidth);
          sectionOverlayWidth.value = 0;

          const newState = [...columns];
          if (selectedSection.current === "left") {
            const leftColOffsetWidth =
              columnWidths.left - columns[lastLeftPinnedColIdx].width;
            newState[lastLeftPinnedColIdx] = {
              ...newState[lastLeftPinnedColIdx],
              width: Math.max(
                calcSectionWidth.left - leftColOffsetWidth,
                MIN_COLUMN_SIZE
              ),
            };
          } else if (selectedSection.current === "right") {
            const rightColOffsetWidth =
              columnWidths.right - columns[firstRightPinnedColIdx].width;
            newState[firstRightPinnedColIdx] = {
              ...newState[firstRightPinnedColIdx],
              width: Math.max(
                calcSectionWidth.right - rightColOffsetWidth,
                MIN_COLUMN_SIZE
              ),
            };
          }

          if (
            columnWidths.left < calcSectionWidth.left ||
            columnWidths.right < calcSectionWidth.right
          ) {
            onColumnChange?.();
          }
          setColumns(newState);
          setIsSectionResizing(false);
        } else if (isColumnResizing) {
          if (selectedColumn) {
            const columnWidth = Math.max(
              increasedColumnWidth(selectedColumn, pos.x),
              MIN_COLUMN_SIZE
            );

            const colIdx = columns.findIndex(
              (item) => item.__id === selectedColumn.__id
            );
            if (colIdx !== -1) {
              const newState = [...columns];
              newState[colIdx] = {
                ...newState[colIdx],
                width: columnWidth,
              };
              setColumns(newState);
            }
            onColumnChange?.();
            setTimeout(() => setIsColumnResizing(false), 250);
            headerOverlayColumnWidth.value = 0;
            setSelectedColumn?.({ ...selectedColumn, width: columnWidth });
          }
        } else {
          const pinnedWidth = widthsRef.current.left;
          const rightPinnedWidth = widthsRef.current.right;
          const unPinnedWidth = widthsRef.current.center;
          applyScrollDecay(y, pos.velocityY ?? 0, [
            -(fullHeight - layout.value.height),
            0,
          ]);
          if (inPinnedXRef.current) {
            applyScrollDecay(pinnedX, pos.velocityX ?? 0, [
              -(columnWidths.left - pinnedWidth),
              0,
            ]);
          } else if (inRightPinnedXRef.current) {
            applyScrollDecay(rightPinnedX, pos.velocityX ?? 0, [
              -(columnWidths.right - rightPinnedWidth),
              0,
            ]);
          } else {
            applyScrollDecay(unpinnedX, pos.velocityX ?? 0, [
              -(columnWidths.center - unPinnedWidth),
              0,
            ]);
          }
        }
      },
      [
        dragRef,
        layout.value,
        prevPosRef,
        columnWidths,
        inPinnedXRef,
        inRightPinnedXRef,
        fullHeight,
        isColumnResizing,
        setIsColumnResizing,
        setSelectedColumn,
        selectedColumn,
        columns,
        setColumns,
        y,
        pinnedX,
        unpinnedX,
        rightPinnedX,
        widthsRef,
        unPinnedCellTransformSharedValue,
        rightPinnedCellTransformSharedValue,
        pinnedCellTransformSharedValue,
        isSectionResizing,
        setIsSectionResizing,
        shouldScrollGrid,
        sectionOverlayWidth,
        headerOverlayColumnWidth,
      ]
    );

    const draw = useRefCallback(
      (pos: DrawPos, gesture: PanGesture, longPress?: boolean) => {
        if (gesture === PanGestures.START)
          onStart(
            pos as GestureStateChangeEvent<PanGestureHandlerEventPayload>,
            longPress
          );
        if (gesture === PanGestures.ACTIVE)
          onActive(
            pos as GestureStateChangeEvent<
              PanGestureHandlerEventPayload & PanGestureChangeEventPayload
            >
          );
      },
      [onStart, onActive]
    );

    const gesture = useGridGestures({
      draw,
      handleEnd,
      onPressInside,
      layout,
      fullHeight,
    });

    // #region Pictures
    const contentTransform = useDerivedCellTransform(
      {
        left: pinnedX,
        center: unpinnedX,
        right: rightPinnedX,
      },
      {
        left: pinnedCellTransformSharedValue,
        center: unPinnedCellTransformSharedValue,
        right: rightPinnedCellTransformSharedValue,
      },
      columnWidths,
      layout,
      y,
      fullHeight
    );

    const clip = useDerivedClip(
      {
        left: pinnedX,
        center: unpinnedX,
        right: rightPinnedX,
      },
      {
        left: pinnedCellTransformSharedValue,
        center: unPinnedCellTransformSharedValue,
        right: rightPinnedCellTransformSharedValue,
      },
      columnWidths,
      fullHeight,
      columnSeparatorWidths
    );

    const backgroundOptions = React.useMemo(
      () => ({
        layout,
        xVal,
        sectionWidth,
        columns: {
          left: pinnedColumns,
          center: unpinnedColumns,
          right: rightPinnedColumns,
        },
        columnWidths,
        rowHeight,
        headerHeight,
      }),
      [
        pinnedColumns,
        unpinnedColumns,
        rightPinnedColumns,
        layout,
        xVal,
        sectionWidth,
        columnWidths,
        rowHeight,
        headerHeight,
      ]
    );

    const headerOverlay = useHeaderOverlay({
      ...backgroundOptions,
      resizedWidth: isColumnResizing ? headerOverlayColumnWidth : null,
    });

    const sectionOverlay = useSectionOverlay({
      ...backgroundOptions,
      selectedSection: selectedSection.current,
      isSectionResizing,
      resizedWidth: isSectionResizing ? sectionOverlayWidth : null,
    });

    const headerBackground = useHeaderBackground({ ...backgroundOptions });

    const headerContent = useHeaderContent({
      ...backgroundOptions,
      headerSelectionState,
      gridIcons,
      fontSize: t.canvasFontSize,
      cellFontSize: t.canvasFontSize,
    });

    const cellBackground = useCellBackground({ ...backgroundOptions });

    const cellContent = useCellContent({
      ...backgroundOptions,
      y,
      columnBuffer,
      rowBuffer,
      xValOffset: {
        left: pinnedX,
        center: unpinnedX,
        right: rightPinnedX,
      },
      widths: {
        left: pinnedColumnWidths,
        center: unpinnedColumnWidths,
        right: rightPinnedColumnWidths,
      },
      isRowSelected,
      context,
      selectedCellParams,
      rowSelection,
      gridIcons,
      cellFontSize: t.canvasFontSize,
    });

    const cellOverlay = useCellOverlay({
      ...backgroundOptions,
      rowSelection,
      selectedCellParams,
    });

    const sectionSeparator = useSectionSeparator({
      ...backgroundOptions,
      bottomInset,
      columnSeparatorWidths,
    });

    // ─── Reportable state (Detox / e2e introspection) ──────────────────────
    // Emits a flat snapshot after each redraw cycle. Skipped entirely when no
    // listener is attached so production callers pay zero cost.
    React.useEffect(() => {
      if (!onLayoutComplete) return;
      const selectedRowIds: string[] = [];
      nodesSelection.forEach((state: 0 | 1 | 2, id: string) => {
        if (state === 1 && id !== CHECKBOX_COLUMN_HEADER) selectedRowIds.push(id);
      });
      const filterColumnIds: string[] = [];
      filterState.forEach((cf: ColumnFilterState | undefined, key: string) => {
        if ((cf?.filterIndex ?? -1) >= 0) filterColumnIds.push(key);
      });
      const editingCol = selectedCellParams.cellEditingParams?.colDef;
      const editingRow = selectedCellParams.row;
      // Duck-typed for variance: `columns` from context is <Object> while
      // `pinnedColumns`/`rightPinnedColumns` preserve <T>. We only read id/field.
      const colKey = (c: { colId?: string; field: string }) =>
        c.colId ?? c.field;
      onLayoutComplete({
        selectedRowIds,
        rowCount: rows.length,
        columnIds: columns.map(colKey),
        pinnedColumnIds: {
          left: pinnedColumns.map(colKey),
          right: rightPinnedColumns.map(colKey),
        },
        sortStatus: sortStatus ?? null,
        filterColumnIds,
        editingCell:
          editingCol && editingRow
            ? {
                rowId: editingRow.__id,
                colId: editingCol.colId ?? editingCol.field,
              }
            : null,
        sectionWidths: { ...widthsRef.current },
      });
    }, [
      onLayoutComplete,
      nodesSelection,
      filterState,
      sortStatus,
      rows,
      columns,
      pinnedColumns,
      rightPinnedColumns,
      selectedCellParams,
      sectionWidth,
    ]);
    // #endregion Pictures

    return (
      <GridContainer>
        {ColumnGroup}
        <GestureDetector gesture={gesture}>
          <Canvas
            ref={canvasRef}
            style={{ flex: 1 }}
            debug={debug}
            onLayout={handleLayout}
          >
            <VerticalGroup
              theme={theme}
              columns={{
                left: pinnedColumns,
                center: unpinnedColumns,
                right: rightPinnedColumns,
              }}
              rowHeight={rowHeight}
              layout={layout}
              clip={clip}
              contentTransform={contentTransform}
              cellBackground={cellBackground}
              cellOverlay={cellOverlay}
              cellContent={cellContent}
              headerBackground={headerBackground}
              headerOverlay={headerOverlay}
              sectionOverlay={sectionOverlay}
              headerContent={headerContent}
              sectionSeparator={sectionSeparator}
              rows={rows}
              allColumns={columns}
              noDataText={noDataText}
            />
          </Canvas>
        </GestureDetector>
        <ColumnActionsModal />
        {selectedCellParams.cellEditingParams &&
          (selectedCellParams.isEditable || selectedCellParams.cellTooltip) && (
            <CellEditingModal
              isVisible={
                !!selectedCellParams.cellEditingParams &&
                (!!selectedCellParams.isEditable ||
                  !!selectedCellParams.cellTooltip)
              }
              components={components}
              params={selectedCellParams.cellEditingParams}
              onCellEditingStopped={onCellEditingStopped}
              onCellEditingCancel={onCellEditingCancel}
              isEditable={selectedCellParams.isEditable}
              cellTooltipValue={selectedCellParams.cellTooltip}
            />
          )}
      </GridContainer>
    );
  });
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  groupSectionTitle: { alignSelf: "center", marginLeft: 4, paddingLeft: 4, fontSize: 14 },
  styledIcon:        { marginLeft: 4, alignSelf: "center" },
  gridContainer:     { height: "100%" },
});


