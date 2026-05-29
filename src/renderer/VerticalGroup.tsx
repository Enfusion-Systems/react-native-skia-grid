import type { GridTheme } from "../themes";
import {
  type SkHostRect,
  type SkPicture,
  type Transforms3d,
  Group,
  Picture,
} from "@shopify/react-native-skia";
import * as React from "react";
import type { LayoutRectangle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { useGridLayout } from "../view/context";
import useHeaderTransform from "./layers/useHeaderTransform";
import {
  type ColumnSection,
  type RowNode,
  type SectionSeparatorKeys,
  type SkiaInternalGridColumn,
  SectionSeparators,
} from "../core/types";
import { createNoDataLayer } from "./gridLayers";
import { getEmptyPicture } from "../utils/gridUtils";

type VerticalGroupProps = {
  columns: Record<ColumnSection, SkiaInternalGridColumn[]>;
  rowHeight: number;
  layout: SharedValue<LayoutRectangle>;
  clip: Record<ColumnSection, Readonly<SharedValue<SkHostRect>>>;
  contentTransform: Record<ColumnSection, SharedValue<Transforms3d>>;
  cellBackground: Record<ColumnSection, SharedValue<SkPicture>>;
  cellOverlay: Record<ColumnSection, SharedValue<SkPicture>>;
  cellContent: Record<ColumnSection, SharedValue<SkPicture>>;
  headerBackground: Record<ColumnSection, SharedValue<SkPicture>>;
  headerOverlay: Record<ColumnSection, SharedValue<SkPicture>>;
  sectionOverlay: Record<ColumnSection, SharedValue<SkPicture>>;
  headerContent: Record<ColumnSection, SharedValue<SkPicture>>;
  sectionSeparator: Record<SectionSeparatorKeys, SharedValue<SkPicture>>;
  rows: RowNode[];
  allColumns: SkiaInternalGridColumn[];
  noDataText?: string;
  theme: GridTheme;
};

export const VerticalGroup = (props: VerticalGroupProps) => {
  const {
    columns,
    rowHeight,
    layout,
    clip,
    cellBackground,
    cellOverlay,
    cellContent,
    headerBackground,
    headerOverlay,
    headerContent,
    sectionSeparator,
    contentTransform,
    rows,
    allColumns,
    noDataText,
    sectionOverlay,
    theme,
  } = props;

  const { fontManager, topRowNode, totalHeaderHeight } = useGridLayout();

  const headerTransform = useHeaderTransform(contentTransform);

  const noDataPicture = React.useMemo(() => {
    if ((!topRowNode && rows.length === 0) || !allColumns?.length)
      return createNoDataLayer({
        totalHeaderHeight,
        theme,
        rowHeight,
        topRowNode: !!topRowNode,
        fontManager,
        canvasHeight: layout.value.height,
        canvasWidth: layout.value.width,
        text: noDataText ?? (!!allColumns?.length ? "No Data" : "No Columns"),
      });

    return getEmptyPicture({
      x: 0,
      y: 0,
      width: layout.value.width,
      height: layout.value.height,
    });
  }, [!!topRowNode, rows, allColumns]);

  return (
    <>
      <Picture picture={noDataPicture} />
      {Object.keys(columns).map((key, idx) => {
        const typedKey = key as ColumnSection;
        return (
          <Group key={`${typedKey}-${idx}`}>
            <Group transform={contentTransform[typedKey]} clip={clip[typedKey]}>
              <Picture picture={cellBackground[typedKey]} />
              <Picture picture={cellOverlay[typedKey]} />
              <Picture picture={cellContent[typedKey]} />
            </Group>
            <Group transform={headerTransform[typedKey]} clip={clip[typedKey]}>
              <Picture picture={headerBackground[typedKey]} />
              <Picture picture={headerOverlay[typedKey]} />
              <Picture picture={headerContent[typedKey]} />
            </Group>
          </Group>
        );
      })}
      {Object.values(SectionSeparators).map((section) => (
        <Group key={section}>
          <Picture picture={sectionSeparator[section]} />
          <Picture picture={sectionOverlay[section]} />
        </Group>
      ))}
    </>
  );
};
