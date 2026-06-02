import { useSlots } from "../../slots";
import { BottomActionModal, Checkbox } from "../../slots/defaults";
import { ErrorBoundary } from "../../slots/defaults/ErrorBoundary";
import { faEllipsisVertical } from "@fortawesome/pro-solid-svg-icons";
import * as React from "react";
import { Dimensions, StyleSheet, View, VirtualizedList } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import type { SetFilterParams, SetFilterType } from "../../../core/types";
import type { GridContextSnapshot } from "../../context";
import { useGridStyles, useTokens } from "../../../themes";
import { useSetFilter } from "./hooks/useSetFilter";
import type { SetItem } from "./lib/types";

// Dimensions.get("window").height - 300 responsive calc stays
const containerHeight = Dimensions.get("window").height - 300;

const getItemCount = (items: Array<SetItem>) => items?.length ?? 0;
const getItem = (items: Array<SetItem>, idx: number) => items[idx];

export const SetFilter: React.FC<{
  index: number;
  filterParams: SetFilterParams;
  onSetFilterChange: (filter: SetFilterType | null) => void;
  useGridActions: () => GridContextSnapshot;
  filterKey: string;
}> = ({
  index,
  filterParams,
  onSetFilterChange,
  useGridActions,
  filterKey,
}) => {
  const { TextInput } = useSlots();
  const t = useTokens();
  const { checkbox } = useGridStyles();

  const enableSearch = filterParams?.showSearchField ?? true;

  const {
    searchText,
    setSearchText,
    caseSensitive,
    setCaseSensitive,
    isMenuOpen,
    openMenu,
    closeMenu,
    filteredData,
    selectAllCheckedState,
    onCheckedStatusChange,
    selectAll,
  } = useSetFilter({
    index,
    filterParams,
    filterKey,
    useGridActions,
    onSetFilterChange,
  });

  return (
    <>
      <View style={{ padding: t.sectionPadding, height: containerHeight }}>
        {enableSearch && (
          <TextInput
            value={searchText}
            onChangeText={(text) => setSearchText(text)}
            placeholder="Search..."
            style={{ marginBottom: t.spacing }}
            iconRight={
              filterParams?.searchFieldOptions !== undefined
                ? faEllipsisVertical
                : undefined
            }
            onRightIconClick={openMenu}
          />
        )}

        {!filterParams?.suppressSelectAll && (
          <Checkbox
            containerStyles={checkbox.listRow}
            style={checkbox.listRowButton}
            onChange={selectAll}
            label="(Select all)"
            checked={selectAllCheckedState}
          />
        )}
        <VirtualizedList
          style={styles.virtualList}
          data={filteredData}
          initialNumToRender={10}
          getItemCount={getItemCount}
          getItem={getItem}
          renderItem={(res) => {
            const item = res.item as SetItem;
            return (
              <Checkbox
                key={item.key}
                containerStyles={checkbox.listRow}
                style={checkbox.listRowButton}
                onChange={onCheckedStatusChange(item.key)}
                checked={item.checked}
                label={`${item.value}`}
              />
            );
          }}
          renderScrollComponent={(props) => <ScrollView {...props} />}
        />
      </View>
      <ErrorBoundary>
        <BottomActionModal
          isVisible={isMenuOpen}
          onClose={closeMenu}
          snapPoints={["20%"]}
          detached
          closeOnClickOutside
        >
          {filterParams?.searchFieldOptions?.caseSensitive != null ? (
            <Checkbox
              containerStyles={{ margin: 15 }}
              onChange={setCaseSensitive}
              label="Case Sensitive"
              checked={caseSensitive}
            />
          ) : null}
        </BottomActionModal>
      </ErrorBoundary>
    </>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  virtualList: { flex: 1, flexDirection: "column", height: "100%" },
});
