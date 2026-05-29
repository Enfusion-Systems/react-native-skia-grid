import { StyleSheet } from "react-native";
import type { Tokens } from "./density";
import type { GridTheme } from "./tokens";

export type GridStyles = ReturnType<typeof computeGridStyles>;

export function computeGridStyles(t: Tokens, theme: GridTheme) {
  return {

    // ── Button / Pressable ──────────────────────────────────────────────────
    pressable: StyleSheet.create({
      root: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        borderWidth: 0,
        borderRadius: t.radiusSm,
      },
    }),

    // ── TextInput ───────────────────────────────────────────────────────────
    textInput: StyleSheet.create({
      // Base container structure
      container: {
        position: "relative",
        width: "100%",
        borderRadius: t.radiusSm,
        backgroundColor: theme.backgroundTertiaryColor,
        borderWidth: t.borderThin,
        flexDirection: "row",
        height: t.inputHeight,
      },
      // Border state variants (only borderColor changes).
      // Default uses borderColor (the theme separator token) so the input
      // reads as a defined field, not just a darker rectangle blending with
      // its fill. Focused / error states keep their semantic accent.
      borderDefault: { borderColor: theme.borderColor },
      borderFocused:  { borderColor: theme.accentHoverColor },
      borderError:    { borderColor: theme.dangerColor },
      // Input field base
      fieldBase: {
        flex: 1,
        padding: t.inputPadding,
        fontSize: t.inputFontSize,
        height: t.inputHeight,
      },
      // Field color variants (only color changes)
      fieldEnabled:  { color: theme.cellTextColor },
      fieldDisabled: { color: theme.mutedTextColor },
    }),

    // ── Checkbox ────────────────────────────────────────────────────────────
    checkbox: StyleSheet.create({
      // labelPlacement variants (only justifyContent changes)
      containerLeft: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: t.inputPadding,
        height: t.checkboxHeight,
      },
      containerRight: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: t.inputPadding,
        height: t.checkboxHeight,
      },
      // Flat list-row variant — used for long checkbox lists (e.g., set filter).
      // Bottom hairline divider replaces the boxed/card pattern for less visual noise.
      listRow: {
        borderBottomWidth: t.borderThin,
        borderBottomColor: theme.borderColor,
      },
      // Visual override for the inner Button when used in a flat list row:
      // strip the button background + radius so the row reads as a plain row
      // separated only by the hairline.
      listRowButton: {
        backgroundColor: "transparent",
        borderRadius: 0,
      },
    }),

    // ── TopBar ──────────────────────────────────────────────────────────────
    topBar: StyleSheet.create({
      // Stable structure — topInset is a runtime device value, kept inline
      base: {
        position: "relative",
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        borderColor: theme.borderColor,
        paddingBottom: 1,
        backgroundColor: theme.backgroundTertiaryColor,
        zIndex: 2,
      },
      // noBorder variants
      bordered:   { borderBottomWidth: t.borderThin },
      borderless: { borderBottomWidth: 0 },
    }),

    // ── BottomSheet ─────────────────────────────────────────────────────────
    bottomSheet: StyleSheet.create({
      // Rounded top corners give the sheet a lifted-card look.
      // Hairline border using borderColor blends with theme — frames the modal
      // without the harsh "dark outline" the page-color border created.
      base: {
        height: "100%",
        borderTopLeftRadius: t.radiusRounded,
        borderTopRightRadius: t.radiusRounded,
        borderTopWidth: t.borderThin,
        borderLeftWidth: t.borderThin,
        borderRightWidth: t.borderThin,
        borderColor: theme.borderColor,
        overflow: "hidden",
      },
      // Default background — uses accentBackgroundColor as the agreed
      // sheet-elevation token. Aligns with formAction.topBar and the mobile
      // BottomActionModal slot (which also defaults to backgroundAccent).
      // If a theme's accentBackgroundColor reads off (e.g., blue-tinted in the
      // standalone dark preset), tune the preset rather than re-tokening here.
      defaultBg: { backgroundColor: theme.accentBackgroundColor },
      // Drag handle bar — subtle, theme-aware
      handleBar: {
        backgroundColor: theme.mutedTextColor,
        width: 36,
        height: 4,
        borderRadius: 2,
        opacity: 0.5,
      },
    }),

    // ── Filter Inputs ───────────────────────────────────────────────────────
    filterInput: StyleSheet.create({
      // Layout / structural
      selectTrigger: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: t.borderThin,
        borderRadius: t.radius,
        paddingHorizontal: t.inputPadding + 2,
        paddingVertical: t.inputPadding,
        minHeight: t.selectHeight,
      },
      dropdown: {
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        borderWidth: t.borderThin,
        borderRadius: t.radius,
        zIndex: 999,
        marginTop: t.spacingS,
      },
      option: {
        paddingHorizontal: t.inputPadding + 2,
        paddingVertical: t.inputPadding,
      },
      input: {
        borderWidth: t.borderThin,
        borderRadius: t.radius,
        paddingHorizontal: t.inputPadding + 2,
        paddingVertical: t.inputPadding,
        fontSize: t.selectFontSize,
        minHeight: t.selectHeight,
      },
      buttonGroup: {
        flexDirection: "row",
        gap: t.spacing,
      },
      groupButton: {
        flex: 1,
        borderWidth: t.borderThin,
        borderRadius: t.radiusSm,
        paddingVertical: t.buttonPaddingV + 2,
        alignItems: "center",
      },
      // Theme/state variants
      surface:           { borderColor: theme.borderColor, backgroundColor: theme.backgroundColor },
      enabled:           { opacity: 1 },
      disabled:          { opacity: 0.4 },
      optionSelected:    { backgroundColor: theme.accentBackgroundColor },
      groupButtonOn:     { backgroundColor: theme.accentColor, borderColor: theme.borderColor },
      groupButtonOff:    { backgroundColor: theme.backgroundColor, borderColor: theme.borderColor },
      inputColor:        { color: theme.cellTextColor },
      placeholderColor:  { color: theme.mutedTextColor },
      groupBtnTextOn:    { color: "#ffffff" },
      fontSize14:        { fontSize: 14 },
      fontSize12:        { fontSize: 12 },
    }),

    // ── Row (GridCanvas) ────────────────────────────────────────────────────
    row: StyleSheet.create({
      root: {
        flexDirection: "row",
        height: t.selectHeight,
        width: "100%",
        backgroundColor: theme.rowAlternateBackgroundColor,
        borderBottomWidth: t.borderThin,
        borderBottomColor: theme.borderColor,
      },
    }),

    // ── Column Grouping ─────────────────────────────────────────────────────
    grouping: StyleSheet.create({
      clickTarget: {
        height: t.clickTargetSm,
        width: t.clickTargetSm,
        alignItems: "center",
        justifyContent: "center",
      },
      rowStyle: {
        height: "100%",
        flexDirection: "row",
        alignItems: "center",
      },
      styledText: {
        textAlign: "center",
        maxWidth: 100,
        padding: t.spacing + 1,
      },
    }),

    // ── HR / Divider ────────────────────────────────────────────────────────
    hr: StyleSheet.create({
      root: { width: "100%", backgroundColor: theme.borderColor, height: t.borderThin },
    }),

    // ── Header Tooltip ──────────────────────────────────────────────────────
    headerTooltip: StyleSheet.create({
      container: { flexDirection: "row", padding: t.spacing + 1 },
    }),

    // ── Conditions List (filter) ────────────────────────────────────────────
    conditions: StyleSheet.create({
      joinRow:   { marginVertical: t.spacingL },
      container: { flexDirection: "column", padding: t.sectionPadding, rowGap: t.spacing },
    }),

    // ── Cell Editing Modal ──────────────────────────────────────────────────
    cellEditing: StyleSheet.create({
      footerBase: {
        flexDirection: "row",
        justifyContent: "center",
        alignContent: "center",
        padding: t.spacing + 1,
        marginLeft: t.spacing + 1,
      },
    }),

    // ── Form Actions ────────────────────────────────────────────────────────
    formAction: StyleSheet.create({
      // FormButtonContainer base — flat row with a single bottom hairline.
      // Cells in the same row share the divider visually (no vertical
      // separators), giving a clean list/menu pattern instead of a grid.
      // Longhand margin overrides are required: FormElementContainer's base
      // applies `marginRight: 5, marginTop: 5`, and `margin: 0` shorthand
      // does not reliably override longhand values during style merging.
      buttonContainerBase: {
        marginTop: 0,
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0,
        borderBottomWidth: t.borderThin,
        borderBottomColor: theme.borderColor,
      },
      buttonContainerTopBorder: {
        borderTopWidth: t.borderThin,
        borderTopColor: theme.borderColor,
      },
      buttonContainerNoTopBorder: { borderTopWidth: 0 },
      // StyledTopBar — uses accentBackgroundColor to match the BottomSheet's
      // body color (see DefaultBottomSheet.defaultBg / mobile BottomActionModal,
      // both default to accentBackgroundColor / backgroundAccent). A hairline
      // bottom border defines the header zone via typography rather than
      // contrast. Note: in some themes accentBackgroundColor is *lighter* than
      // the page background (the modal-elevation color), in others it's a
      // tinted accent — either way it is the agreed sheet-body token.
      topBar: {
        paddingTop: 0,
        height: t.formTopBarHeight,
        backgroundColor: theme.accentBackgroundColor,
        borderBottomWidth: t.borderThin,
        borderBottomColor: theme.borderColor,
        width: "100%",
        alignSelf: "center",
      },
    }),

    // ── Error Fallback ──────────────────────────────────────────────────────
    errorFallback: StyleSheet.create({
      container:  { backgroundColor: "#fafafa", flex: 1, justifyContent: "center" },
      content:    { marginHorizontal: t.spacingXxl },
      title:      { fontSize: 40, fontWeight: "300", paddingBottom: t.spacingXxl, color: "#000" },
      subtitle:   { fontSize: 32, fontWeight: "800", color: "#000" },
      error:      { paddingVertical: t.spacingXxl },
      button:     { backgroundColor: "#2196f3", borderRadius: t.radiusPill, padding: t.spacingXxl },
      buttonText: { color: "#fff", fontWeight: "600", textAlign: "center" },
    }),

  };
}
