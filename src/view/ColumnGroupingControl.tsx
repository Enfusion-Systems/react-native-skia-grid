import { useRefCallback } from "../internal/hooks";
import {
  FlexView,
  NormalFontAwesomeIcon,
  NormalText,
  NormalTextProps,
  StyleablePressable,
  StyleablePressableProps,
  useCommonStyles,
} from "./slots/defaults";
import { useGridTheme, useGridStyles, useTokens } from "../themes";
import {
  faFilter,
  faSortDown,
  faSortUp,
  faXmark,
} from "@fortawesome/pro-solid-svg-icons";
import * as React from "react";
import { StyleSheet, TouchableOpacity, View, ViewProps } from "react-native";
import DraggableFlatList, {
  type DragEndParams,
  type RenderItemParams,
} from "react-native-draggable-flatlist";

import { useGridActions, useGridColumns } from "./context";
import type { SkiaGridColumn, SkiaInternalGridColumn, SortDir } from "../core/types";
import { getFilterKey } from "../utils/gridUtils";

const getItemKey = (item: SkiaGridColumn) => item.id ?? "--id--";

// --- MenuItemOuterContainer ---

type MenuItemOuterContainerProps = ViewProps & { backgroundColor: string };

function MenuItemOuterContainer({ backgroundColor, style, children, ...rest }: MenuItemOuterContainerProps) {
  const t = useTokens();
  return (
    <View
      {...rest}
      style={[
        {
          height: t.columnGroupItemHeight,
          backgroundColor,
          alignItems: "center",
          flexDirection: "row",
          flexWrap: "nowrap",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}


// --- SortIconContainer ---

type SortIconContainerProps = ViewProps & { sortDir: SortDir };

function SortIconContainer({ sortDir, style, children, ...rest }: SortIconContainerProps) {
  const t = useTokens();
  return (
    <View
      {...rest}
      style={[
        {
          marginTop: sortDir === "asc" ? t.spacingXl - 2 : 0,
          marginBottom: sortDir === "desc" ? t.spacingXl - 2 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// --- ClickTarget ---

function ClickTarget(props: StyleablePressableProps) {
  const t = useTokens();
  return (
    <StyleablePressable
      height={t.compactControlHeight}
      containerStyles={{ width: t.clickTargetSm }}
      pressedStyles={localStyles.pressed}
      style={[localStyles.clickTargetCenter, props.style]}
      {...props}
    />
  );
}

// --- StyledText ---

export function StyledText(props: React.ComponentProps<typeof NormalText> & NormalTextProps) {
  const { grouping } = useGridStyles();
  const { style, ...rest } = props;
  return <NormalText style={[grouping.styledText, style]} {...rest} />;
}

// --- StartChevron / EndChevron ---

type ChevronProps = ViewProps & { isSelected?: boolean };

function StartChevron({ isSelected, style, ...rest }: ChevronProps) {
  const t = useTokens();
  const theme = useGridTheme();
  const color = isSelected ? theme.accentColor : theme.accentBackgroundColor;
  return (
    <View
      {...rest}
      style={[
        {
          height: 0,
          width: 0,
          borderLeftWidth: t.chevronBorderH,
          borderTopWidth: t.chevronBorderV,
          borderBottomWidth: t.chevronBorderV,
          borderLeftColor: "transparent",
          borderTopColor: color,
          borderBottomColor: color,
          zIndex: 1,
        },
        style,
      ]}
    />
  );
}

function EndChevron({ isSelected, style, ...rest }: ChevronProps) {
  const t = useTokens();
  const theme = useGridTheme();
  const color = isSelected ? theme.accentColor : theme.accentBackgroundColor;
  return (
    <View
      {...rest}
      style={[
        {
          height: 0,
          width: 0,
          borderLeftWidth: t.chevronBorderH,
          borderTopWidth: t.chevronBorderV,
          borderBottomWidth: t.chevronBorderV,
          borderLeftColor: color,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          marginRight: -8,
        },
        style,
      ]}
    />
  );
}

// --- GroupPill ---

export const GroupPill: React.FC<
  Partial<RenderItemParams<SkiaGridColumn>> & {
    item: SkiaGridColumn;
    onAdd?: (item: SkiaGridColumn) => void;
    onRemove?: (item: SkiaGridColumn) => void;
    onClick?: (item: SkiaGridColumn) => void;
    isFiltered?: boolean;
    isSelected?: boolean;
  }
> = React.memo(
  ({ item, isActive, drag, onRemove, onClick, isFiltered, isSelected }) => {
    const theme = useGridTheme();
    const { grouping } = useGridStyles();

    return (
      <FlexView>
        <MenuItemOuterContainer
          backgroundColor={
            isActive || isSelected ? theme.accentColor : theme.accentBackgroundColor
          }
        >
          <TouchableOpacity
            activeOpacity={1}
            onLongPress={drag}
            onPress={() => onClick?.(item)}
            disabled={isActive}
          >
            <View style={grouping.rowStyle}>
              <StyledText
                fsClass="fs-unmask"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.name ? item.name : ""}
              </StyledText>
              {isFiltered && (
                <NormalFontAwesomeIcon icon={faFilter} size={10} />
              )}
              {item.sort && typeof item.sortIndex === "number" ? (
                <SortIconContainer sortDir={item.sort}>
                  <NormalFontAwesomeIcon
                    icon={item.sort === "asc" ? faSortUp : faSortDown}
                    size={20}
                  />
                </SortIconContainer>
              ) : (
                <></>
              )}
            </View>
          </TouchableOpacity>
          {onRemove ? (
            <ClickTarget onPress={() => onRemove(item)} disabled={isActive}>
              <View style={grouping.clickTarget}>
                <NormalFontAwesomeIcon icon={faXmark} size={12} />
              </View>
            </ClickTarget>
          ) : (
            <></>
          )}
        </MenuItemOuterContainer>
      </FlexView>
    );
  }
);

// --- ColumnGroupingControl ---

export const ColumnGroupingControl: React.FC<{
  onColumnRowGroupChanged:
    | ((column: SkiaInternalGridColumn[]) => void)
    | undefined;
}> = ({ onColumnRowGroupChanged }) => {
  const { columns, setColumns } = useGridColumns();
  const {
    onGrouped,
    setSelectedColumn,
    rebuildRows,
    filterState,
    selectedColumn,
  } = useGridActions();
  const theme = useGridTheme();
  const cs = useCommonStyles();

  const groupedColumns = React.useMemo(() => {
    return columns
      .filter((x) => x.rowGroup)
      ?.sort((a, b) => (a.rowGroupIndex ?? 0) - (b.rowGroupIndex ?? 0));
  }, [columns]);

  const onRemove = useRefCallback(
    (item: SkiaGridColumn | null) => {
      const column = groupedColumns.find((col) => col.name === item?.name);
      if (column) onGrouped?.(false, column);
    },
    [onGrouped, groupedColumns]
  );

  const handleOnClick = useRefCallback(
    (item: SkiaGridColumn | null) => {
      const column = groupedColumns.find((col) => col.name === item?.name);
      if (column) setSelectedColumn?.(column);
    },
    [setSelectedColumn, groupedColumns]
  );

  const renderItem = (props: RenderItemParams<SkiaInternalGridColumn>) => {
    const { getIndex, isActive, item } = props;
    const isLast = getIndex() === groupedColumns.length - 1;
    const isSelected = item.id === selectedColumn?.id;
    return (
      <>
        {getIndex?.() !== 0 && !isActive && (
          <StartChevron isSelected={isSelected} />
        )}

        <GroupPill
          {...props}
          isSelected={isSelected}
          onRemove={onRemove}
          onClick={handleOnClick}
          isFiltered={
            (filterState.get(getFilterKey(item))?.filterIndex ?? -1) >= 0
          }
        />

        {!isLast && !isActive && (
          <EndChevron isSelected={isSelected} />
        )}
      </>
    );
  };

  const reorderGroupedColumns = useRefCallback(
    (params: DragEndParams<SkiaInternalGridColumn>) => {
      if (params?.data?.length) {
        const [newColumns, groupedColumns] = columns.reduce(
          (res, col) => {
            const index = params?.data.findIndex((x) => x.id === col.id);
            const newCol = {
              ...col,
              rowGroupIndex: index !== -1 ? index : col.rowGroupIndex,
            };
            res[0].push(newCol);
            if (col.rowGroup) res[1].push(newCol);
            return res;
          },
          [[], []] as [SkiaInternalGridColumn[], SkiaInternalGridColumn[]]
        );

        onColumnRowGroupChanged?.(groupedColumns);
        setColumns(newColumns);
        rebuildRows?.();
      }
    },
    [columns, setColumns, onColumnRowGroupChanged]
  );

  return (
    <FlexView>
      <DraggableFlatList
        data={groupedColumns ?? []}
        keyExtractor={getItemKey}
        onDragEnd={(params) => reorderGroupedColumns(params)}
        renderItem={renderItem}
        containerStyle={[cs.flexOne]}
        horizontal
      />
    </FlexView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  pressed:            { opacity: 0.8 },
  clickTargetCenter:  { alignItems: "center", justifyContent: "center" },
});

