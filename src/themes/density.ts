export type Density = "high" | "medium" | "low";

export type Tokens = Readonly<{
  // Primitives (7 master knobs)
  controlHeight: number;
  controlPadding: number;
  fontSizeSm: number;
  fontSizeMd: number;
  fontSizeBase: number;
  fontSizeLg: number;
  fontSizeXl: number;

  // Spacing scale (5 levels)
  spacingS: number;
  spacing: number;
  spacingL: number;
  spacingXl: number;
  spacingXxl: number;

  // Input
  inputHeight: number;
  inputFontSize: number;
  inputPadding: number;

  // Button
  buttonHeight: number;
  buttonFontSize: number;
  buttonLineHeight: number;
  buttonPaddingV: number;
  buttonPaddingH: number;
  buttonSm: number;

  // Icon-button
  iconButtonFontSize: number;

  // Checkbox
  checkboxHeight: number;
  checkboxFontSize: number;

  // Select / dropdown / filter input
  selectHeight: number;
  selectFontSize: number;

  // Tab / top-bar / action-bar
  tabContainerHeight: number;
  topBarHeight: number;
  formTopBarHeight: number;
  actionBarHeight: number;

  // Compact-control (menu item, accordion, list row, click target)
  compactControlHeight: number;
  columnGroupItemHeight: number;
  clickTargetSize: number;
  clickTargetSm: number;

  // Modal / alert / section
  modalTitleFontSize: number;
  sectionPadding: number;
  alertFontSize: number;
  alertPadding: number;

  // Bottom sheet
  bottomSheetHandleHeight: number;

  // Chevron (column grouping pill)
  chevronBorderV: number;
  chevronBorderH: number;

  // Icon / line-height
  iconSize: number;
  lineHeightControl: number;
  lineHeightHeader: number;

  // Canvas (Skia rendering — used in Phase 3)
  canvasRowHeight: number;
  canvasHeaderHeight: number;
  canvasFontSize: number;
  canvasCellPadding: number;

  // Radii (not density-scaled — tokenized to remove literals)
  radiusSubtle: number;
  radiusSm: number;
  radius: number;
  radiusRounded: number;
  radiusPill: number;

  // Borders
  borderHairline: number;
  borderThin: number;
}>;

export function getTokens(density: Density): Tokens {
  const high = density === "high";
  const low = density === "low";

  // Primitives
  const controlHeight = high ? 32 : low ? 44 : 38;
  const controlPadding = high ? 6 : low ? 10 : 8;
  const fontSizeSm = high ? 11 : low ? 13 : 12;
  const fontSizeMd = high ? 13 : low ? 15 : 14;
  const fontSizeBase = high ? 14 : low ? 17 : 16;
  const fontSizeLg = high ? 18 : low ? 21 : 19;
  const fontSizeXl = high ? 22 : low ? 26 : 24;

  // Spacing scale
  const spacingS = high ? 2 : low ? 3 : 2;
  const spacing = high ? 3 : low ? 5 : 4;
  const spacingL = high ? 6 : low ? 10 : 8;
  const spacingXl = high ? 10 : low ? 16 : 12;
  const spacingXxl = high ? 16 : low ? 24 : 20;

  // Derived: compact-control (needed by several other derivations)
  const compactControlHeight = controlHeight - 8;

  return Object.freeze({
    // Primitives
    controlHeight,
    controlPadding,
    fontSizeSm,
    fontSizeMd,
    fontSizeBase,
    fontSizeLg,
    fontSizeXl,

    // Spacing scale
    spacingS,
    spacing,
    spacingL,
    spacingXl,
    spacingXxl,

    // Input
    inputHeight: controlHeight,
    inputFontSize: fontSizeMd,
    inputPadding: controlPadding,

    // Button
    buttonHeight: controlHeight,
    buttonFontSize: fontSizeSm,
    buttonLineHeight: fontSizeMd * 2,
    buttonPaddingV: Math.round(controlPadding / 2),
    buttonPaddingH: controlPadding * 2,
    buttonSm: controlHeight - 2,

    // Icon-button
    iconButtonFontSize: fontSizeMd,

    // Checkbox
    checkboxHeight: controlHeight,
    checkboxFontSize: fontSizeMd,

    // Select
    selectHeight: controlHeight - 2,
    selectFontSize: fontSizeMd,

    // Tab / top-bar / action-bar
    tabContainerHeight: controlHeight - 4,
    topBarHeight: controlHeight - 6,
    formTopBarHeight: controlHeight + 2,
    actionBarHeight: controlHeight - 10,

    // Compact-control
    compactControlHeight,
    columnGroupItemHeight: controlHeight - 3,
    clickTargetSize: compactControlHeight,
    clickTargetSm: Math.round((compactControlHeight * 2) / 3),

    // Modal / alert / section
    modalTitleFontSize: fontSizeBase,
    sectionPadding: controlPadding * 2,
    alertFontSize: fontSizeSm,
    alertPadding: controlPadding,

    // Bottom sheet
    bottomSheetHandleHeight: compactControlHeight - 5,

    // Chevron
    chevronBorderV: Math.round((controlHeight - 3) * 0.5),
    chevronBorderH: controlPadding + 2,

    // Icon / line-height
    iconSize: fontSizeBase,
    lineHeightControl: fontSizeBase,
    lineHeightHeader: fontSizeBase + 6,

    // Canvas
    canvasRowHeight: high ? 22 : low ? 36 : 30,
    canvasHeaderHeight: high ? 22 : low ? 34 : 28,
    canvasFontSize: high ? 11 : low ? 16 : 14,
    canvasCellPadding: controlPadding - 2,

    // Radii (not density-scaled)
    radiusSubtle: 3,
    radiusSm: 4,
    radius: 6,
    radiusRounded: 10,
    radiusPill: 50,

    // Borders
    borderHairline: 0,
    borderThin: 1,
  });
}
