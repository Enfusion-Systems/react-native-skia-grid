import type { ColumnSection } from "../core/types";
import { MIN_SECTION_SIZE } from "../utils/constants";

export const translationClamp = (val: number, max: number, min = 0) => {
  "worklet";
  return Math.min(Math.max(val, Math.min(max, min)), min);
};

export const getSectionWidth = (min: number, max: number, current: number) =>
  Math.max(Math.min(max, current), min);

export const getPositionValue = (value: number, clampMax: number) => {
  const translateValue = translationClamp(value, clampMax);
  return translateValue
    ? Math.abs(value) > clampMax
      ? translateValue
      : value
    : 0;
};

export function calculatePinnedWidth(
  pinnedWidth: number,
  occupiedWidth: number,
  availableWidth: number
) {
  if (pinnedWidth === 0) return 0;
  if (pinnedWidth + occupiedWidth <= availableWidth) return pinnedWidth;
  return Math.ceil(Math.min(pinnedWidth, availableWidth / 3));
}

export function calculateSectionWidth(
  curr: Record<ColumnSection, number>,
  to: Partial<Record<ColumnSection, number>>
) {
  const maxWidth = {
    left: curr.left + curr.center - MIN_SECTION_SIZE,
    right: curr.center + curr.right - MIN_SECTION_SIZE,
    center:
      curr.center +
      (curr.left
        ? Math.max(curr.left - MIN_SECTION_SIZE, MIN_SECTION_SIZE)
        : 0) +
      (curr.right
        ? Math.max(curr.right - MIN_SECTION_SIZE, MIN_SECTION_SIZE)
        : 0),
  };

  const sectionWidth = Object.keys(to)
    .sort()
    .reduce<Record<ColumnSection, number>>(
      (res, key) => {
        const typedKey = key as ColumnSection;

        res[typedKey] = to[typedKey]
          ? getSectionWidth(
              MIN_SECTION_SIZE,
              maxWidth[typedKey],
              to[typedKey] ?? MIN_SECTION_SIZE
            )
          : curr[typedKey];

        if (typedKey !== "center" && res.center - curr.center === 0) {
          const changedWidth =
            (to[typedKey] ?? curr[typedKey]) - curr[typedKey];

          res.center = getSectionWidth(
            MIN_SECTION_SIZE,
            maxWidth["center"],
            curr.center - changedWidth
          );
        }
        return res;
      },
      { ...curr }
    );
  return sectionWidth;
}
