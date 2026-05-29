import * as React from "react";

import type { SkiaInternalGridColumn } from "../core/types";
import type { ColumnSectionLayout } from "./columnSections";
import { partitionColumnsBySection } from "./columnSections";

/**
 * Memoized React binding around partitionColumnsBySection.
 *
 * Encapsulates the memoization strategy so the callsite doesn't need to know
 * how invalidation is tracked. The dependency `JSON.stringify(columns)` is
 * preserved from the legacy implementation to guarantee zero behavioral
 * change — invalidates on any column property mutation. Upgrading to a
 * signature-based or reference-based dep is orthogonal and belongs with the
 * ColumnManager refactor described in ARCHITECTURE.md.
 */
export function useColumnSectionLayout<T extends Object>(
  columns: SkiaInternalGridColumn<T>[]
): ColumnSectionLayout<T> {
  return React.useMemo(
    () => partitionColumnsBySection(columns),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(columns)]
  );
}
