import * as React from "react";
import { Text as RNText, View } from "react-native";
import type { GridSlots } from "react-native-skia-grid";

import { StoryScaffold } from "../components/StoryScaffold";
import { basicColumns, makeRows } from "../seededData";
import { Grid } from "./_grid";

/**
 * SLOT OVERRIDES
 * --------------
 * Every piece of built-in UI chrome (buttons, text, inputs, the bottom sheet,
 * dividers, checkboxes …) is a "slot" you can replace via the `slots` prop:
 *
 *     <Grid slots={{ Text: MyText, BottomSheet: MySheet, ... }} />
 *
 * Pass a `Partial<GridSlots>` — anything you omit keeps the default. Below we
 * override the three lowest-risk, purely-presentational slots so the override
 * is visible in the column action sheet without changing behaviour.
 *
 * GUIDANCE for the interactive slots (kept as defaults here on purpose):
 *  - `Button` / `ActionButton`: ButtonSlotProps = PressableProps & { text,
 *    children, ... }. NOTE the grid calls them with an `onClick` prop (not
 *    `onPress`); your custom component must forward it. Always render `text`
 *    and `children` so the control stays tappable (incl. for Detox by.text).
 *  - `TextInput`: TextInputSlotProps = RN TextInputProps & { name, errors,
 *    clearable, iconRight, ... } — used by number/text/set filter inputs.
 *  - `BottomSheet`: BottomSheetSlotProps = { isVisible, onClose, snapPoints,
 *    children, ... } — present/dismiss based on `isVisible`.
 */

// Custom Text: tint + italic. Drop the slot-only props so RN <Text> stays clean.
const CustomText: GridSlots["Text"] = ({
  children,
  style,
  color: _color,
  muted: _muted,
  fontSize: _fontSize,
  fontWeight: _fontWeight,
  fontStyle: _fontStyle,
  disabled: _disabled,
  ...rest
}) => (
  <RNText {...rest} style={[{ color: "#8be9c0" }, style]}>
    {children}
  </RNText>
);

const CustomMutedText: GridSlots["MutedText"] = ({
  children,
  style,
  color: _color,
  muted: _muted,
  fontSize: _fontSize,
  fontWeight: _fontWeight,
  fontStyle: _fontStyle,
  disabled: _disabled,
  ...rest
}) => (
  <RNText {...rest} style={[{ color: "#6b6b72", fontStyle: "italic" }, style]}>
    {children}
  </RNText>
);

const CustomDivider: GridSlots["Divider"] = (props) => (
  <View {...props} style={[{ height: 1, backgroundColor: "#8be9c0", opacity: 0.5 }, props.style]} />
);

const SLOTS: Partial<GridSlots> = {
  Text: CustomText,
  MutedText: CustomMutedText,
  Divider: CustomDivider,
};

const COLUMNS = basicColumns();
const ROWS = makeRows(100);

export function SlotsStory(): React.ReactElement {
  return (
    <StoryScaffold
      title="Slot overrides"
      description="Replace built-in UI via slots — here Text / MutedText / Divider."
      instructions={[
        "Tap a header to open the action sheet — its text/dividers use our slots.",
        "Override is a Partial<GridSlots>; omitted slots keep the default.",
        "See the commented guidance in slots.tsx for Button / TextInput / BottomSheet.",
      ]}
    >
      {(reportState) => (
        <Grid
          rows={ROWS}
          columnDefs={COLUMNS}
          getRowId={(r) => r.id}
          rowSelection="single"
          slots={SLOTS}
          onLayoutComplete={reportState}
        />
      )}
    </StoryScaffold>
  );
}
