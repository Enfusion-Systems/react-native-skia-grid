import type { Transforms3d } from "@shopify/react-native-skia";
import {
  type DerivedValue,
  type SharedValue,
  useDerivedValue,
} from "react-native-reanimated";

import type { ColumnSection } from "../../core/types";

function rmTranslateY(val: SharedValue<Transforms3d>) {
  "worklet";
  return val.value.filter((o) => !Object.keys(o).includes("translateY"));
}

export function useHeaderTransform(
  contentTransform: Record<ColumnSection, SharedValue<Transforms3d>>
) {
  const leftHeaderTransform = useDerivedValue(() => {
    return [...rmTranslateY(contentTransform.left), { translateY: 0 }];
  });

  const rightHeaderTransform = useDerivedValue(() => {
    return [...rmTranslateY(contentTransform.right), { translateY: 0 }];
  });

  const centerHeaderTransform = useDerivedValue(() => {
    return [...rmTranslateY(contentTransform.center), { translateY: 0 }];
  });

  return {
    left: leftHeaderTransform,
    right: rightHeaderTransform,
    center: centerHeaderTransform,
  } as Record<ColumnSection, DerivedValue<Transforms3d>>;
}

export default useHeaderTransform;
