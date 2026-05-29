import { lightBg, ThemeDefinition, themes } from "@enfusion-ui/constants";
import { hexToRgb, hexToRgbBase } from "@enfusion-ui/utils";

export const DesktopThemeMap: Record<string, ThemeDefinition> = {
  FlatDarkCarbonLookAndFeel: themes.darkCarbon,
  FlatDarkCobalt: themes.darkCobalt,
  FlatDarkPurpleLookAndFeel: themes.dark,
  FlatDarkSolarizedLookAndFeel: themes.darkSolarized,
  FlatDarkHighContrast: themes.dark,
  FlatGruvBoxDarkHard: themes.dark,
  FlatMonocai: themes.monokai,
  FlatNord: themes.darkSpaceGray,
  FlatDarcula: themes.dracula,
  FlatNightOwlContrast: themes.dark,
  FlatDarkSpaceGrayLookAndFeel: themes.darkSpaceGray,
  FlatVividDarkSpaceGrayLookAndFeel: themes.darkSpaceGray,
  FlatLightLookAndFeel: themes.light,
  FlatGrayLookAndFeel: themes.light,
};

const defaultFont = `"Noto Sans", "Noto Sans KR", "Noto Sans JP", "Noto Sans SC", "Noto Sans Arabic", "Noto Sans Bengali", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
"Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
sans-serif`;

export const zIndexes = {
  hiddenZ: 0,
  baseZ: 1,
  popupZ: 1000,
  layoverZ: 1001,
  toastZ: 1002,
  sideBarOverlayBackdrop: 1003,
  modalBackdropZ: 1004,
  modalContentZ: 1005,
  aboveModalZ: 1006,
};

export const getCss = (theme: ThemeDefinition, onlyAgGrid = false) => {
  const density = theme?.density || "medium";

  const agGridVars = {
    "--ag-font-family": defaultFont,
    "--ag-accent": theme.colors.backgroundAccent,
    "--ag-border-color": theme.colors.backgroundAccent,
    "--ag-balham-active-color": theme.colors.primary,
    "--ag-foreground-color": theme.colors.textNormal,
    "--ag-background-color": theme.colors.backgroundColor2,
    "--ag-header-background-color": theme.colors.backgroundColor2,
    "--ag-tooltip-background-color": theme.colors.backgroundAccent,
    "--ag-subheader-background-color": theme.colors.backgroundColor2,
    "--ag-control-panel-background-color": theme.colors.backgroundColor2,
    "--ag-odd-row-background-color": theme.colors.backgroundColor1,
    "--ag-row-hover-color": hexToRgb(theme.colors.primary, 0.5),
    "--ag-column-hover-color": hexToRgb(theme.colors.primary, 0.5),
    "--ag-input-border-color": theme.colors.backgroundAccent,
    "--ag-invalid-color": theme.colors.danger,
    "--ag-input-focus-border-color": hexToRgb(theme.colors.primary, 0.8),
    "--ag-input-border-error": theme.colors.danger,
    "--ag-input-disabled-background-color": theme.colors.backgroundColor2,
    "--ag-checkbox-unchecked-color": theme.colors.textColor1,
    "--ag-checkbox-checked-color": theme.colors.textNormal,
    "--ag-checkbox-background-color": "transparent",
    // "--ag-advanced-filter-join-pill-color": theme.colors.,
    // "--ag-advanced-filter-column-pill-color": theme.colors.,
    // "--ag-advanced-filter-option-pill-color": theme.colors.,
    // "--ag-advanced-filter-value-pill-color": theme.colors.,
    "--ag-input-focus-box-shadow": hexToRgb(theme.colors.primary, 0.2),
    "--ag-range-selection-border-color": hexToRgb(theme.colors.primary, 0.2),
    "--ag-panel-background-color": theme.colors.backgroundColor2,
    "--ag-secondary-foreground-color": theme.colors.textColor1,
    "--ag-disabled-foreground-color": theme.colors.textMuted,
    "--ag-subheader-toolbar-background-color": theme.colors.backgroundColor2,
    "--ag-row-border-color": theme.colors.backgroundAccent,
    "--ag-chip-background-color": hexToRgb(theme.colors.backgroundAccent, 0.5),
    "--ag-chip-border-color": theme.colors.backgroundAccent,
    "--ag-range-selection-background-color": hexToRgb(
      theme.colors.primary,
      0.2
    ),
    "--ag-range-selection-background-color-2": hexToRgb(
      theme.colors.primary,
      0.36
    ),
    "--ag-range-selection-background-color-3": hexToRgb(
      theme.colors.primary,
      0.49
    ),
    "--ag-range-selection-background-color-4": hexToRgb(
      theme.colors.primary,
      0.59
    ),
    "--ag-selected-row-background-color": hexToRgb(theme.colors.primary, 0.28),
    "--ag-data-color": theme.colors.textNormal,
    "--ag-value-change-delta-up-color": theme.colors.success,
    "--ag-value-change-delta-down-color": theme.colors.danger,
    "--ag-header-column-separator": hexToRgb(
      theme.colors.backgroundAccent,
      0.5
    ),

    /* ── ag-grid density sizing ── */
    "--ag-font-size": `${
      density === "high" ? 11 : density === "low" ? 14 : 12
    }px`,
    "--ag-row-height": `${
      density === "high" ? 18 : density === "low" ? 28 : 22
    }px`,
    "--ag-header-height": `${
      density === "high" ? 22 : density === "low" ? 32 : 26
    }px`,
  };

  if (onlyAgGrid) return agGridVars;

  return {
    "--primary": theme.colors.primary,
    "--primary-hover": theme.colors.primaryHover,
    "--info": theme.colors.info,
    "--info-hover": theme.colors.infoHover ?? "#16203c",
    "--success": theme.colors.success,
    "--success-hover": theme.colors.successHover ?? "#308867",
    "--warning": theme.colors.warning,
    "--warning-hover": theme.colors.warningHover ?? "#967c38",
    "--danger": theme.colors.danger,
    "--danger-hover": theme.colors.dangerHover ?? "#e21a0c",

    "--background-color-0": theme.colors.backgroundColor0,
    "--background-color-0-rgb": hexToRgbBase(
      theme.colors.backgroundColor0,
      "0,0,0"
    ),
    "--background-color-0-hover":
      theme.colors.backgroundColor0Hover ?? "#2b2d32",
    "--background-color-1": theme.colors.backgroundColor1,
    "--background-color-1-rgb": hexToRgbBase(
      theme.colors.backgroundColor1,
      "0,0,0"
    ),
    "--background-color-1-hover":
      theme.colors.backgroundColor1Hover ?? "#25272b",
    "--background-color-2": theme.colors.backgroundColor2,
    "--background-color-2-rgb": hexToRgbBase(
      theme.colors.backgroundColor2,
      "0,0,0"
    ),
    "--background-accent": theme.colors.backgroundAccent,
    "--background-color-accent-rgb": hexToRgbBase(
      theme.colors.backgroundAccent,
      "0,0,0"
    ),
    "--background-danger": "#540a04",
    "--background-warning": "#4b3e1c",
    "--text-normal": theme.colors.textNormal,
    "--text-normal-alpha": theme.colors.textNormal + "4D",
    "--text-inverted": theme.colors.textInverted,
    "--text-color-1": theme.colors.textColor1,
    "--text-hover": theme.colors.textHover,
    "--text-muted": theme.colors.textMuted,
    "--text-muted-alpha": theme.colors.textMuted + "4D",
    "--text-input-border": theme.colors.textInputBorder,
    "--border": theme.colors.border,
    "--input-background": theme.colors.inputBackground,
    "--input-border": theme.colors.inputBorder,
    "--overlay": theme.colors.overlay,
    "--tab-icon-color-0": theme.colors.tabIconColor0,
    "--background-top-app-bar": theme.colors.backgroundTopAppBar,
    "--background-form":
      theme.colors.backgroundForm || theme.colors.backgroundColor0,
    "--shadow": "0px 4px 4px rgba(0, 0, 0, 0.25)",

    ...theme.colors.dashboardVisuals.reduce(
      (res, entry, idx) => ({
        ...res,
        [`--dashboard-color-${idx}`]: entry,
      }),
      {} as Record<string, string>
    ),

    ...theme.colors.dashboardVisuals.reduce(
      (res, entry, idx) => ({
        ...res,
        [`--dashboard-color-alpha-${idx}`]: entry + "CC",
      }),
      {} as Record<string, string>
    ),

    "--preferred-button-color-0": "rgb(135, 206, 250)",
    "--preferred-button-color-1": "rgb(216, 191, 216)",
    "--preferred-button-color-2": theme.key?.startsWith("light")
      ? "rgb(82, 200, 82)"
      : "rgb(152, 251, 152)",
    "--preferred-button-color-3": "rgb(222, 184, 135)",
    "--preferred-button-color-4": theme.key?.startsWith("light")
      ? "rgb(100, 100, 25)"
      : "rgb(255, 250, 205)",
    "--preferred-button-color-5": "rgb(218, 112, 214)",
    "--preferred-button-color-6": theme.key?.startsWith("light")
      ? "rgb(255, 75, 238)"
      : "rgb(255, 245, 238)",
    "--preferred-button-color-7": "rgb(255, 165, 170)",

    "--preferred-button-bg-color-0": "rgb(135, 206, 250, 0.1)",
    "--preferred-button-bg-color-1": "rgb(216, 191, 216, 0.1)",
    "--preferred-button-bg-color-2": "rgb(152, 251, 152, 0.1)",
    "--preferred-button-bg-color-3": "rgb(222, 184, 135, 0.1)",
    "--preferred-button-bg-color-4": "rgb(255, 250, 205, 0.1)",
    "--preferred-button-bg-color-5": "rgb(218, 112, 214, 0.1)",
    "--preferred-button-bg-color-6": "rgb(255, 245, 238, 0.1)",
    "--preferred-button-bg-color-7": "rgb(255, 165, 170, 0.1)",

    /* standard spacing — density-aware */
    "--spacing-s":
      density === "high" ? "0.1rem" : density === "low" ? "0.2rem" : "0.15rem",
    "--spacing":
      density === "high" ? "0.2rem" : density === "low" ? "0.3rem" : "0.25rem",
    "--spacing-l":
      density === "high" ? "0.35rem" : density === "low" ? "0.65rem" : "0.5rem",
    "--spacing-xl":
      density === "high" ? "0.5rem" : density === "low" ? "1rem" : "0.75rem",
    "--spacing-xxl":
      density === "high" ? "0.9rem" : density === "low" ? "1.6rem" : "1.25rem",
    "--spacing-2xl":
      density === "high" ? "0.7rem" : density === "low" ? "1.3rem" : "1rem",
    "--spacing-3xl":
      density === "high" ? "1.1rem" : density === "low" ? "1.9rem" : "1.5rem",

    "--radius-xl": "15px",
    "--radius-l": "10px",
    "--radius": "5px",

    /* fonts */
    "--default-font": defaultFont,
    "--header-font": defaultFont,

    /* font size */
    "--default-font-size": density === "high" ? "small" : "medium",

    /*
     * ═══════════════════════════════════════════
     *  PRIMITIVE TOKENS — the knobs for density
     *  high → compact   medium → default   low → spacious
     * ═══════════════════════════════════════════
     */
    "--control-height":
      density === "high" ? "32px" : density === "low" ? "44px" : "38px",
    "--font-size-sm":
      density === "high" ? "0.65rem" : density === "low" ? "0.8rem" : "0.75rem",
    "--font-size-md":
      density === "high"
        ? "0.75rem"
        : density === "low"
        ? "0.95rem"
        : "0.875rem",
    "--font-size-base":
      density === "high" ? "0.8rem" : density === "low" ? "1.075rem" : "1rem",
    "--font-size-lg":
      density === "high" ? "1rem" : density === "low" ? "1.3rem" : "1.2rem",
    "--font-size-xl":
      density === "high" ? "1.2rem" : density === "low" ? "1.625rem" : "1.5rem",
    "--control-padding":
      density === "high" ? "0.4em" : density === "low" ? "0.6em" : "0.5em",

    /*
     * ═══════════════════════════════════════════
     *  COMPONENT TOKENS — derived from primitives
     * ═══════════════════════════════════════════
     */

    /* ── input ── */
    "--input-height": "var(--control-height)",
    "--input-font-size": "var(--font-size-md)",
    "--input-padding": "var(--control-padding)",

    /* ── button ── */
    "--button-height": "var(--control-height)",
    "--button-font-size": "var(--font-size-sm)",
    "--button-line-height": "2em",
    "--button-padding-v": "calc(var(--control-padding) / 2)",
    "--button-padding-h": "calc(var(--control-padding) * 2)",

    /* ── icon-button ── */
    "--icon-button-font-size": "var(--font-size-md)",

    /* ── checkbox ── */
    "--checkbox-height": "var(--control-height)",
    "--checkbox-font-size": "var(--font-size-md)",

    /* ── toggle ── */
    "--toggle-width-m": "42px",
    "--toggle-height-m": "24px",
    "--toggle-circle-m": "16px",
    "--toggle-width-s": "36px",
    "--toggle-height-s": "20px",
    "--toggle-circle-s": "12px",
    "--toggle-margin": "3px",

    /* ── tab ── */
    "--tab-container-height": "calc(var(--control-height) - 4px)",
    "--tertiary-tab-height": "calc(var(--control-height) * 0.6)",

    /* ── action-bar ── */
    "--action-bar-height": "calc(var(--control-height) - 10px)",

    /* ── compact-control (pickers, list items, column rows) ── */
    "--compact-control-height": "calc(var(--control-height) - 8px)",

    /* ── modal ── */
    "--modal-title-font-size": "var(--font-size-base)",

    /* ── alert ── */
    "--alert-font-size": "var(--font-size-sm)",
    "--alert-padding": "var(--control-padding)",

    /* ── sidebar ── */
    "--sidebar-item-height": "calc(var(--control-height) + 2px)",

    /* ── navbar ── */
    "--navbar-size": `${
      density === "high" ? 40 : density === "low" ? 56 : 50
    }px`,

    /* ── color-picker ── */
    "--color-picker-height": "var(--compact-control-height)",

    /* ── file-node ── */
    "--file-node-height": "23px",
    "--file-node-font-size": "var(--font-size-md)",
    "--file-node-label-font-size": "var(--font-size-sm)",

    /* ── notification ── */
    "--notification-settings-height": "var(--compact-control-height)",

    /* ── grid (non-ag) ── */
    "--grid-label-font-size": "var(--font-size-sm)",

    /* z-indexes */
    "--hidden-z": String(zIndexes.hiddenZ),
    "--base-z": String(zIndexes.baseZ),
    "--popup-z": String(zIndexes.popupZ),
    "--layover-z": String(zIndexes.layoverZ),
    "--toast-z": String(zIndexes.toastZ),
    "--sidebar-overlay-backdrop-z": String(zIndexes.sideBarOverlayBackdrop),
    "--modal-backdrop-z": String(zIndexes.modalBackdropZ),
    "--modal-content-z": String(zIndexes.modalContentZ),
    "--above-modal-z": String(zIndexes.aboveModalZ),

    /* backgrounds */
    "--landing-bg": theme.backgrounds?.landingBg || lightBg,

    /*AgGrid style vars*/
    ...agGridVars,

    ...Object.entries(theme.colors.notificationSeverity).reduce(
      (res, [key, val]) => ({ ...res, [`--severity-${key}`]: val }),
      {} as Record<string, string>
    ),

    /* @atlaskit/pragmatic-drag-and-drop-react-drop-indicator color */
    "--ds-border-selected": theme.colors.primary,
    "--drag-target-hover": "brightness(0.8)",
  };
};


const Line2Text = styled.span`
  opacity: 0.7;
  font-size: 14px;
  font-size: var(--file-node-font-size);
`;

export const BasicButton = styled.button`
  font-weight: bold;
  font-size: var(--button-font-size);
  line-height: var(--button-line-height);
  border: none;
  border-radius: 4px;
  padding: var(--button-padding-v) var(--button-padding-h);
  cursor: pointer;
  transition: background-color 0.17s;
  width: 100%;
`;