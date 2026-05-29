import type { CellRenderer } from "../../core/types";
import { BOX_OFFSET } from "../../utils/constants";
import { drawSelectionCheckbox } from "../drawing/drawMethods";

export const SelectionCellRenderer: CellRenderer = (args, ctx) => {
  const { x, y, icons, selected, width, height, column } = args;

  drawSelectionCheckbox(ctx, {
    x,
    y,
    xOffset: BOX_OFFSET,
    yOffset: BOX_OFFSET,
    width,
    height,
    isSelected: selected,
    icons: { ...icons, ...(column?.icons ?? {}) },
  });
};
