import type { SharedValue } from "react-native-reanimated";
import { withDecay } from "react-native-reanimated";

import { VELOCITY_FACTOR } from "../../utils/constants";

export function applyScrollDecay(
  target: SharedValue<number>,
  velocity: number,
  clamp: [number, number]
) {
  target.value = withDecay({
    velocity,
    velocityFactor: VELOCITY_FACTOR,
    clamp,
  });
}
