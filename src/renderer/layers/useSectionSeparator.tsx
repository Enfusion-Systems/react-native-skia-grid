import { useGridTheme } from "../../themes";
import {
  PaintStyle,
  Skia,
  createPicture,
  type SkPicture,
} from "@shopify/react-native-skia";
import * as React from "react";
import type { LayoutRectangle } from "react-native";
import {
  type DerivedValue,
  type SharedValue,
  useDerivedValue,
} from "react-native-reanimated";

import { useGridLayout } from "../../view/context";
import {
  type ColumnSection,
  type SectionSeparatorKeys,
  type SkiaInternalGridColumn,
  SectionSeparators,
} from "../../core/types";
import { UI_THREAD_LAYERS } from "../featureFlags";
import { createSectionSeparatorLayer } from "../gridLayers";
import { usePicturesSeparator } from "./usePictures";

type SectionSeparatorPictureArgs<T extends Object> = {
  layout: SharedValue<LayoutRectangle>;
  sectionWidth: Record<ColumnSection, number>;
  columns: Record<ColumnSection, SkiaInternalGridColumn<T>[]>;
  columnWidths: Record<ColumnSection, number>;
  bottomInset: number;
  columnSeparatorWidths: Record<SectionSeparatorKeys, number>;
};

type SeparatorPictures = Record<SectionSeparatorKeys, DerivedValue<SkPicture>>;

/**
 * UI_THREAD_LAYERS.sectionSeparator is a build-time constant, so exactly one
 * hook path runs for the app's lifetime — hook order stays stable.
 */
export function useSectionSeparator<T extends Object>(
  args: SectionSeparatorPictureArgs<T>
): SeparatorPictures {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return UI_THREAD_LAYERS.sectionSeparator
    ? useSeparatorWorklet(args)
    : useSeparatorJs(args);
}

/** C1: record the separator picture on the UI thread (no text → no fontManager). */
function useSeparatorWorklet<T extends Object>(
  args: SectionSeparatorPictureArgs<T>
): SeparatorPictures {
  const { layout, sectionWidth, bottomInset, columnSeparatorWidths } = args;
  const { fullHeight } = useGridLayout();
  const theme = useGridTheme();

  const height = React.useMemo(
    () => Math.min(fullHeight - bottomInset, layout.value.height),
    [fullHeight, bottomInset, layout.value.height]
  );

  // Captured scalars — geometry/theme only. The derived value re-records on the
  // UI thread when any of these change (same trigger as the JS effect below).
  const color = theme.accentBackgroundColor;
  const leftX = sectionWidth.left;
  const leftW = columnSeparatorWidths.left;
  const rightX = sectionWidth.left + columnSeparatorWidths.left + sectionWidth.center;
  const rightW = columnSeparatorWidths.right;

  const left = useDerivedValue(
    () =>
      createPicture(
        (canvas) => {
          "worklet";
          const paint = Skia.Paint();
          paint.setStyle(PaintStyle.Fill);
          paint.setAntiAlias(true);
          paint.setColor(Skia.Color(color));
          canvas.drawRect(Skia.XYWHRect(leftX, 0, leftW, height), paint);
        },
        Skia.XYWHRect(leftX, 0, leftW, height)
      ),
    [leftX, leftW, height, color]
  );

  const right = useDerivedValue(
    () =>
      createPicture(
        (canvas) => {
          "worklet";
          const paint = Skia.Paint();
          paint.setStyle(PaintStyle.Fill);
          paint.setAntiAlias(true);
          paint.setColor(Skia.Color(color));
          canvas.drawRect(Skia.XYWHRect(rightX, 0, rightW, height), paint);
        },
        Skia.XYWHRect(rightX, 0, rightW, height)
      ),
    [rightX, rightW, height, color]
  );

  return React.useMemo(() => ({ left, right }), [left, right]);
}

/** Original JS-thread path: record in a useEffect into shared-value slots. */
function useSeparatorJs<T extends Object>(
  args: SectionSeparatorPictureArgs<T>
): SeparatorPictures {
  const {
    layout,
    sectionWidth,
    columns,
    columnWidths,
    bottomInset,
    columnSeparatorWidths,
  } = args;

  const { fullHeight, fontManager } = useGridLayout();
  const theme = useGridTheme();

  const height = React.useMemo(
    () => Math.min(fullHeight - bottomInset, layout.value.height),
    [fullHeight, bottomInset, layout.value.height]
  );

  const pictures = usePicturesSeparator(
    sectionWidth,
    columnSeparatorWidths,
    height
  );

  React.useEffect(() => {
    for (const section of Object.values(SectionSeparators)) {
      let x = sectionWidth.left;
      if (section !== "left")
        x += columnSeparatorWidths.left + sectionWidth.center;

      const width = columnSeparatorWidths[section];

      pictures[section].value = createSectionSeparatorLayer({
        x,
        height,
        width,
        theme,
        fontManager,
      });
    }
  }, [
    theme,
    fontManager,
    layout.value.width,
    columns.left.length,
    columns.center.length,
    columns.right.length,
    columnWidths.left,
    columnWidths.center,
    columnWidths.right,
    sectionWidth,
    height,
    columnSeparatorWidths,
  ]);

  return pictures;
}
