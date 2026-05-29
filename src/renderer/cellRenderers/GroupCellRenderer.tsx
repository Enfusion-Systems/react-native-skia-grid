import {
  faCaretDown,
  faCaretRight,
  faEmptySet,
} from "@fortawesome/pro-solid-svg-icons";

import type { CellRenderer } from "../../core/types";
import { getPadding } from "../../utils/constants";
import { drawSvgPath } from "../drawing/drawMethods";

export const GroupCellRenderer: CellRenderer = (args, ctx) => {
  const {
    x,
    y,
    height,
    width,
    textColor,
    fontSize,
    row,
    value: baseValue,
    drawText,
  } = args;

  if (!row?.group) return;

  const value = row.groupRowData?.[row.field ?? ""] ?? baseValue;
  const groupIcon = row.expanded ? faCaretDown : faCaretRight;
  const level = row.level + 1;
  const [iconWidth] = drawSvgPath(ctx, {
    path: groupIcon.icon[4] as unknown as string,
    box: [groupIcon.icon[0], groupIcon.icon[1]],
    x: x + 5 * level,
    color: textColor,
    y: y + height / 2,
    size: fontSize - 2,
    hPlacement: "left",
  });

  const offset = 5 * level + (iconWidth || 0);

  if (value?.length) {
    drawText(
      value,
      { padding: getPadding(0) },
      { xy: { x: x + offset + 10 }, hw: { width: width - offset - 10 } }
    );
  } else {
    const xOffset = x + 5 * level;
    const groupEmptyIcon = faEmptySet;
    drawSvgPath(ctx, {
      path: groupEmptyIcon.icon[4] as unknown as string,
      box: [groupEmptyIcon.icon[0], groupEmptyIcon.icon[1]],
      x: xOffset + 12,
      y: y + height / 2,
      color: textColor,
      size: fontSize * 1.8,
      hPlacement: "left",
    });
  }
};
