import React from "react";

import { ColumnSection } from "../core/types";

type ColumnSectionArgs = {
  sectionWidth: Record<ColumnSection, number>;
  columnSeparatorWidths: { left: number; right: number };
};

const useDerivedXVal = (args: ColumnSectionArgs) => {
  const { sectionWidth, columnSeparatorWidths } = args;
  return React.useMemo(() => {
    const center = sectionWidth.left + columnSeparatorWidths.left;

    const right =
      sectionWidth.left +
      sectionWidth.center +
      columnSeparatorWidths.right +
      columnSeparatorWidths.left;

    return { left: 0, right, center };
  }, [
    sectionWidth.left,
    sectionWidth.center,
    sectionWidth.right,
    columnSeparatorWidths.left,
    columnSeparatorWidths.right,
  ]);
};

export default useDerivedXVal;
