import type { LayoutRectangle } from "react-native";
import {
  Gesture,
  type GestureStateChangeEvent,
  type GestureUpdateEvent,
  type PanGestureChangeEventPayload,
  type PanGestureHandlerEventPayload,
  type TapGestureHandlerEventPayload,
} from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";

import { PanGestures, type PanGesture, type SkiaGridTapLocation } from "../../core/types";
import { LONG_PRESS_DURATION } from "../../utils/constants";

type DrawPos =
  | GestureUpdateEvent<
      PanGestureHandlerEventPayload & PanGestureChangeEventPayload
    >
  | GestureStateChangeEvent<
      PanGestureHandlerEventPayload | TapGestureHandlerEventPayload
    >;

type HandleEndPos =
  | GestureStateChangeEvent<PanGestureHandlerEventPayload>
  | GestureStateChangeEvent<TapGestureHandlerEventPayload>;

type UseGridGesturesArgs = {
  draw: (pos: DrawPos, gesture: PanGesture, longPress?: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleEnd: (pos: any, longPress: boolean) => void;
  onPressInside?: (location: SkiaGridTapLocation) => void;
  layout: SharedValue<LayoutRectangle>;
  fullHeight: number;
};

export function useGridGestures(args: UseGridGesturesArgs) {
  const { draw, handleEnd, onPressInside, layout, fullHeight } = args;

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onStart((pos) => {
      draw(pos, PanGestures.START);
      onPressInside?.({
        x: pos.x,
        y: pos.y,
        width: layout.value.width,
        height: fullHeight,
        absoluteX: pos.absoluteX,
        absoluteY: pos.absoluteY,
      });
    })
    .onEnd((pos: HandleEndPos) => {
      handleEnd(pos, false);
    });

  const longPress = Gesture.LongPress()
    .minDuration(LONG_PRESS_DURATION)
    .runOnJS(true)
    .onStart((pos) => {
      draw(pos, PanGestures.START, true);
    })
    .onEnd((pos) => {
      handleEnd(pos, true);
    });

  const scroll = Gesture.Pan()
    .runOnJS(true)
    .onBegin((pos) => {
      draw(pos, PanGestures.START);
    })
    .onChange((pos) => {
      draw(pos, PanGestures.ACTIVE);
    })
    .onEnd((pos) => {
      handleEnd(pos, false);
    });

  return Gesture.Race(tap, scroll, longPress);
}
