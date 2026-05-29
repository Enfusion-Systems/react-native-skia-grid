import type { ColumnChooserColumn, ColumnChooserModalProps } from "./types";
import { useModalState, useRefCallback } from "../../internal/hooks";
import { SlotsContext, SlotsProvider, useSlots } from "../slots";
import { DEFAULT_SLOTS } from "../slots/defaults";
import {
  AccentBarAccordion,
  Checkbox,
  FlexGrowContentScrollView,
  HR,
  NormalFontAwesomeIcon,
  useCommonStyles,
} from "../slots/defaults";
import {
  faPlusCircle,
  faSlidersH,
  IconDefinition,
} from "@fortawesome/pro-solid-svg-icons";
import { sortBy } from "lodash";
import React from "react";
import { ListRenderItem, useWindowDimensions, View } from "react-native";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { FlatList, ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ColumnMenuItems } from "./ColumnMenuItems";
import { ColumnContext } from "./context";
import {
  AccordionListViewContainer,
  accordionStyles,
  ClickTarget,
  FilterContainer,
  FilterModalButtonContainer,
  Footer,
  MenuItemContainer,
  MenuItemOuterContainer,
  MultiInputContainer,
  Row,
  StyledTopBar,
  stylesheet,
  VirtualizedListContainer,
} from "./styled";
import {
  createColumnState,
  createFilters,
  createSelectedColumnsOpen,
} from "./utils";

type ColumnStateType = [
  Record<string, Array<ColumnChooserColumn>>,
  Array<ColumnChooserColumn>
];

const getItemKey = (item: ColumnChooserColumn) => item.id ?? "--id--";

const getItemCount = (items: Array<String>) => items?.length ?? 0;
const getItem = (items: Array<String>, idx: number) => items[idx];

const VirtualizedListItemKey = (item: unknown, idx: number) => `${item}${idx}`;

const HiddenColumns: React.FC<unknown> = () => {
  const { FlexView, Text: NormalText, TextInput } = useSlots();
  const cs = useCommonStyles();
  const [filterText, setFilterText] = React.useState("");
  const { availableColumns, add, filterMenuOpen, columnFilters } =
    React.useContext(ColumnContext);

  const filteredItems = React.useMemo(() => {
    return availableColumns?.filter((col) => {
      const categories = col.category.split(",");
      return (
        categories.some((category) => columnFilters?.[category]) &&
        (filterText === "" ||
          col.name.toLocaleLowerCase().includes(filterText.toLocaleLowerCase()))
      );
    });
  }, [availableColumns, filterText, columnFilters]);

  const renderItem = (({ item, index }) => {
    return (
      <ColumnMenuItems item={item} getIndex={() => index + 1} onAdd={add} />
    );
  }) as ListRenderItem<ColumnChooserColumn>;

  const handleClearFilter = useRefCallback(() => {
    setFilterText("");
  }, [setFilterText]);

  return (
    <FlexView>
      <MultiInputContainer>
        <TextInput
          onChangeText={setFilterText}
          value={filterText}
          onClearValue={handleClearFilter}
          style={{ flex: 1 }}
          clearable
        />

        <FilterModalButtonContainer onClick={() => filterMenuOpen?.()}>
          <NormalFontAwesomeIcon
            icon={faSlidersH as unknown as IconDefinition}
            transform={{ rotate: 90 }}
          />
        </FilterModalButtonContainer>
      </MultiInputContainer>
      <HR />
      {filteredItems?.length ? (
        <MenuItemOuterContainer activeOpacity={1} top disabled>
          <MenuItemContainer isDragged={false}>
            <Row>
              <ClickTarget onPress={() => add?.(filteredItems)}>
                <View style={stylesheet.clickTarget}>
                  <NormalFontAwesomeIcon
                    icon={faPlusCircle as IconDefinition}
                  />
                </View>
              </ClickTarget>
              <FlexView>
                <NormalText style={cs.marginLeftFive}>ALL</NormalText>
              </FlexView>
            </Row>
          </MenuItemContainer>
        </MenuItemOuterContainer>
      ) : null}
      <FlatList
        data={filteredItems}
        keyExtractor={getItemKey}
        renderItem={renderItem}
      />
    </FlexView>
  );
};

const ColumnChooserModalInner: React.FC<ColumnChooserModalProps> = ({
  open,
  columns,
  onCancel,
  onAccept,
  showApplyAndSave,
}) => {
  const {
    BottomSheet,
    Button,
    ConfirmationDialog,
    FlexView,
    FullView,
  } = useSlots();
  const cs = useCommonStyles();
  const area = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const filterMenuState = useModalState();

  const confirmationModalState = useModalState();

  const [columnFilters, setColumnFilters] = React.useState<
    Record<string, boolean>
  >({});

  const [hasChanges, setHasChanges] = React.useState(false);

  const [[selectedColumns, availableColumns], setColumnState] =
    React.useState<ColumnStateType>([{}, []]);

  const [selectedColumnsPanelsOpen, setSelectedColumnsPanelsOpen] =
    React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setColumnState(() => createColumnState(columns));
    setSelectedColumnsPanelsOpen(() => createSelectedColumnsOpen(columns));
    setColumnFilters((state) => createFilters(columns, state));
  }, [columns]);

  const resetState = useRefCallback(() => {
    setHasChanges(false);
    confirmationModalState.closeModal();
    const resetColumnState = createColumnState(columns);
    setColumnState(() => resetColumnState);
  }, [columns, setHasChanges, confirmationModalState, setColumnState]);

  const handleCancel = useRefCallback(() => {
    if (hasChanges) confirmationModalState.openModal();
    else onCancel();
  }, [hasChanges, confirmationModalState, onCancel]);

  const handleConfirmCancel = useRefCallback(() => {
    resetState();
    onCancel();
  }, [onCancel]);

  const handleAccept = useRefCallback(
    (save?: boolean) => {
      let newColumns: ColumnChooserColumn[] = [];
      Object.keys(selectedColumns).forEach((key) => {
        for (const column of selectedColumns[key]) {
          newColumns.push(column);
        }
      });

      onAccept?.([...newColumns, ...availableColumns], save);
    },
    [onAccept, selectedColumns, availableColumns]
  );

  const handleAcceptAndSave = useRefCallback(() => handleAccept(true), []);

  const handleAdd = useRefCallback(
    (def: ColumnChooserColumn[]) => {
      setHasChanges(true);

      setColumnState((state) => {
        let newState = [...state] as ColumnStateType;
        def.forEach((column) => {
          newState[0][column.groupName] = [
            ...newState[0][column.groupName].filter((i) => i.id !== column.id),
            { ...column, selected: true },
          ];
        });
        newState[1] = newState[1].filter(
          (i) => !def.some((item) => item.id === i.id)
        );
        return newState;
      });
    },
    [setHasChanges, setColumnState]
  );

  const clickFilterCheckbox = useRefCallback(
    (key: string) => {
      setColumnFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [setColumnFilters]
  );

  const toggleAllFilter = useRefCallback(
    (value: boolean) => {
      setColumnFilters(createFilters(columns, {}, value));
    },
    [columns, setColumnFilters]
  );

  const handleClickSelectedColumnsTitle = useRefCallback(
    (key: string) => {
      setSelectedColumnsPanelsOpen((state) => ({
        ...state,
        [key]: !state[key],
      }));
    },
    [setSelectedColumnsPanelsOpen]
  );

  const handleRemove = useRefCallback(
    (def: ColumnChooserColumn) => {
      setHasChanges(true);
      setColumnState((state) => {
        let newState = [...state] as ColumnStateType;
        newState[0][def.groupName] = newState[0][def.groupName].filter(
          (i) => i.id !== def.id
        );
        newState[1] = sortBy(
          [
            ...newState[1].filter((i) => i.id !== def.id),
            { ...def, selected: false },
          ],
          ["name"]
        );
        return newState;
      });
    },
    [setHasChanges, setColumnState]
  );

  const handleReorder = useRefCallback(
    (data: ColumnChooserColumn[]) => {
      if (data.length) {
        setHasChanges(true);
        const groupName = data[0].groupName;
        setColumnState((state) => {
          let newState = [...state] as ColumnStateType;
          newState[0][groupName] = data;
          return newState;
        });
      }
    },
    [setHasChanges, setColumnState]
  );

  return (
    <>
      <BottomSheet
        isVisible={open}
        showBackdrop
        closeOnClickOutside
        snapPoints={["100%"]}
        onClose={handleConfirmCancel}
      >
        <ColumnContext.Provider
          value={{
            add: handleAdd,
            availableColumns,
            filterMenuOpen: () => filterMenuState.openModal(),
            columnFilters,
          }}
        >
          <FullView>
            <FlexView>
              <AccordionListViewContainer>
                {Object.keys(selectedColumns).map((item, idx) => {
                  let style = accordionStyles.topOne;
                  if (idx > 0) {
                    style = selectedColumnsPanelsOpen[item]
                      ? accordionStyles.topOne
                      : accordionStyles.topZero;
                  }

                  return (
                    <React.Fragment key={idx}>
                      <AccentBarAccordion
                        key={item}
                        title={item}
                        style={style}
                        titleProps={{ style: accordionStyles.accordionTitle }}
                        defaultOpen={selectedColumnsPanelsOpen[item]}
                        onClick={() => handleClickSelectedColumnsTitle(item)}
                      >
                        <FlexView>
                          <DraggableFlatList
                            data={selectedColumns[item] ?? []}
                            keyExtractor={getItemKey}
                            onDragEnd={({ data }) => handleReorder?.(data)}
                            renderItem={(
                              props: RenderItemParams<ColumnChooserColumn>
                            ) => (
                              <ColumnMenuItems
                                {...props}
                                onRemove={handleRemove}
                              />
                            )}
                            containerStyle={cs.flexOne}
                          />
                        </FlexView>
                      </AccentBarAccordion>

                      {Object.keys(selectedColumns).length - 1 === idx ? (
                        <AccentBarAccordion
                          key="available"
                          title="Available Columns"
                          style={
                            selectedColumnsPanelsOpen[item]
                              ? accordionStyles.topOne
                              : accordionStyles.topZero
                          }
                          safe
                          last
                          defaultOpen={selectedColumnsPanelsOpen[item]}
                          titleProps={{
                            style: accordionStyles.accordionTitle,
                          }}
                          onClick={() =>
                            handleClickSelectedColumnsTitle("available")
                          }
                          contentComponent={HiddenColumns}
                        />
                      ) : (
                        <></>
                      )}
                    </React.Fragment>
                  );
                })}

                <HR />
              </AccordionListViewContainer>
            </FlexView>
            <Footer bottomOffset={area.bottom}>
              {showApplyAndSave && (
                <Button
                  buttonTheme="primary"
                  onClick={handleAcceptAndSave}
                  containerStyles={[
                    cs.marginRightFive,
                    cs.flexOne,
                  ]}
                  text="Accept & Save"
                />
              )}

              <Button
                buttonTheme="primary"
                onClick={handleAccept}
                containerStyles={[
                  cs.marginRightFive,
                  cs.flexOne,
                ]}
                text="Accept"
              />
              <Button
                buttonTheme="secondary"
                onClick={handleCancel}
                containerStyles={cs.flexOne}
                text="Cancel"
              />
            </Footer>
          </FullView>
        </ColumnContext.Provider>
      </BottomSheet>

      <BottomSheet
        isVisible={filterMenuState.open}
        showBackdrop
        snapPoints={["50%", "100%"]}
        closeOnClickOutside
        onClose={filterMenuState.closeModal}
      >
        <>
          <StyledTopBar
            title="Filters"
            onBackClick={filterMenuState.closeModal}
          />

          <FilterContainer containerHeight={height * 0.75}>
            <Checkbox
              label="All"
              checked={Object.values(columnFilters).every((i) => i === true)}
              containerStyles={cs.marginBottomFive}
              onChange={toggleAllFilter}
            />

            <FlexGrowContentScrollView
              showsHorizontalScrollIndicator={false}
              horizontal
            >
              <VirtualizedListContainer
                data={Object.keys(columnFilters)}
                getItemCount={getItemCount}
                getItem={getItem}
                keyExtractor={VirtualizedListItemKey}
                renderItem={(res) => {
                  const item = res.item as string;
                  return (
                    <View key={res.index}>
                      <Checkbox
                        containerStyles={cs.marginBottomFive}
                        onChange={() => clickFilterCheckbox(item)}
                        checked={columnFilters[item]}
                        label={item}
                      />
                    </View>
                  );
                }}
                renderScrollComponent={(props) => <ScrollView {...props} />}
              />
            </FlexGrowContentScrollView>
          </FilterContainer>
        </>
      </BottomSheet>
      <ConfirmationDialog
        open={open && confirmationModalState.open && hasChanges}
        onCancel={confirmationModalState.closeModal}
        onSubmit={handleConfirmCancel}
        submitButtonText="Confirm"
      >
        Are you sure you want to cancel? All changes will be lost.
      </ConfirmationDialog>
    </>
  );
};

export const ColumnChooserModal: React.FC<ColumnChooserModalProps> = (props) => {
  const hasSlots = React.useContext(SlotsContext) !== null;
  if (hasSlots) return <ColumnChooserModalInner {...props} />;
  return (
    <SlotsProvider defaults={DEFAULT_SLOTS}>
      <ColumnChooserModalInner {...props} />
    </SlotsProvider>
  );
};
