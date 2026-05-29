# Plan: Modern density system for react-native-skia-grid

## Context

Every form / modal / menu surface in `packages/react-native-skia-grid/src/` hardcodes its own dimensions (~180+ numeric literals across 26+ files). The filter modal is visibly oversized vs. the canvas. There's no single knob to tune density. The package also leans heavily on `styled-components/native`, which is the legacy RN styling pattern — modern RN UI libraries (React Native Paper, Restyle, NativeBase v3+, Tamagui, NativeWind) all use **hook + StyleSheet** instead.

Goal: introduce a density system AND modernize the styling layer in one coherent pass. End state:

- `density?: "high" | "medium" | "low"` prop on `<DataGrid>`. Default `medium`. Medium is **pixel-identical** to the pre-change render (zero visual regression when omitted).
- A single token factory `getTokens(density)` modeled on web-core's [`getCss(theme)`](packages/web-core/src/theme/utils.ts) but RN-flavored: 7 primitives, 5-level spacing scale, ~30 derived component tokens.
- Density is **decoupled from theme**. Separate context, separate provider, separate hook. Theme stays color-only; density stays size-only.
- Density also drives the **Skia canvas** sizing (row height, header height, cell font) — analogous to web's `--ag-row-height`.
- **All `styled-components/native` usage is removed from the package** by the end of the migration. Every styled-component becomes a function component with `useMemo`-wrapped `StyleSheet.create`. After Phase 4 the package no longer depends on styled-components/native.

## Target architecture

### Density module — new files

[src/themes/density.ts](packages/react-native-skia-grid/src/themes/density.ts)
- `export type Density = "high" | "medium" | "low"`
- `export type Tokens = Readonly<{ ... }>` — primitives + derived
- `export function getTokens(density: Density): Tokens` — pure factory

[src/themes/DensityProvider.tsx](packages/react-native-skia-grid/src/themes/DensityProvider.tsx)
- `DensityContext` — React context holding the resolved `Tokens` object
- `<DensityProvider density>` — memoizes `getTokens(density)` and provides
- `useTokens(): Tokens` — single density-read hook
- Default fallback when no provider is mounted: `getTokens("medium")` (no crash if used outside a grid)

### Token specification (mirrors web naming, RN values)

**Primitives (7) — the master knobs:**

| Token | high | medium | low |
|---|---|---|---|
| `controlHeight` | 32 | 38 | 44 |
| `controlPadding` | 6 | 8 | 10 |
| `fontSizeSm` | 11 | 12 | 13 |
| `fontSizeMd` | 13 | 14 | 15 |
| `fontSizeBase` | 14 | 16 | 17 |
| `fontSizeLg` | 18 | 19 | 21 |
| `fontSizeXl` | 22 | 24 | 26 |

**Spacing scale (5 levels):**

| Token | high | medium | low |
|---|---|---|---|
| `spacingS` | 2 | 2 | 3 |
| `spacing` | 3 | 4 | 5 |
| `spacingL` | 6 | 8 | 10 |
| `spacingXl` | 10 | 12 | 16 |
| `spacingXxl` | 16 | 20 | 24 |

**Derived component tokens (~30, computed from primitives via JS math — the RN equivalent of `calc()`):**

```ts
// input
inputHeight:        controlHeight             // 38
inputFontSize:      fontSizeMd                // 14
inputPadding:       controlPadding            // 8

// button
buttonHeight:       controlHeight             // 38
buttonFontSize:     fontSizeSm                // 12
buttonLineHeight:   fontSizeMd * 2            // 28
buttonPaddingV:     controlPadding / 2        // 4
buttonPaddingH:     controlPadding * 2        // 16
buttonSm:           controlHeight - 2         // 36 (small / inline button variant)

// icon-button
iconButtonFontSize: fontSizeMd                // 14

// checkbox
checkboxHeight:     controlHeight             // 38
checkboxFontSize:   fontSizeMd                // 14

// select / dropdown / filter input
selectHeight:       controlHeight - 2         // 36
selectFontSize:     fontSizeMd                // 14

// tab / top-bar / action-bar
tabContainerHeight: controlHeight - 4         // 34
topBarHeight:       controlHeight - 6         // 32
formTopBarHeight:   controlHeight + 2         // 40
actionBarHeight:    controlHeight - 10        // 28

// compact-control (menu item, accordion, list row, click target)
compactControlHeight: controlHeight - 8       // 30
columnGroupItemHeight: controlHeight - 3      // 35
clickTargetSize:    compactControlHeight      // 30
clickTargetSm:      Math.round(compactControlHeight * 2 / 3)  // 20

// modal / alert / section
modalTitleFontSize: fontSizeBase              // 16
sectionPadding:     controlPadding * 2        // 16
alertFontSize:      fontSizeSm                // 12
alertPadding:       controlPadding            // 8

// bottom sheet
bottomSheetHandleHeight: compactControlHeight - 5  // 25

// chevron (column grouping pill)
chevronBorderV:     Math.round((controlHeight - 3) * 0.5)  // 18
chevronBorderH:     controlPadding + 2        // 10

// icon / line-height
iconSize:           fontSizeBase              // 16
lineHeightControl:  fontSizeBase              // 16
lineHeightHeader:   fontSizeBase + 6          // 22

// canvas (Skia rendering — Phase 3)
canvasRowHeight:    high 22 / medium 30 / low 36   // matches GridThemeTokens.rowHeight at medium
canvasHeaderHeight: high 22 / medium 28 / low 34   // matches GridThemeTokens.headerHeight at medium
canvasFontSize:     high 11 / medium 14 / low 16
canvasCellPadding:  controlPadding - 2        // 6 at medium

// radii (NOT density-scaled — visually equivalent at these sizes; tokenized only to remove literals)
radiusSubtle: 3   radiusSm: 4   radius: 6   radiusRounded: 10   radiusPill: 50

// borders
borderHairline: 0   borderThin: 1
```

Medium values match every existing literal in the audit. High and low scale proportionally.

### Consumer API

```tsx
// Top-level
<DataGrid density="high" theme={dark} />

// Inside a component (the universal pattern)
function Foo() {
  const t = useTokens();          // density values
  const theme = useGridTheme();   // colors

  const styles = useMemo(
    () => StyleSheet.create({
      container: {
        height: t.inputHeight,
        padding: t.inputPadding,
        backgroundColor: theme.backgroundColor,
        borderRadius: t.radiusSm,
      },
    }),
    [t, theme]
  );

  return <View style={styles.container} />;
}
```

No styled-components. No theme-prop interpolation. One hook per concern.

---

## Migration playbook (the conversion patterns)

Every styled-component conversion follows one of these four patterns. Documented here as a single source of truth so every file's diff is mechanical.

### Pattern A — Plain styled.View → function component

```tsx
// Before
const Container = styled.View`
  padding: 8px;
  background: ${({ theme }) => theme.backgroundColor};
`;

// After
function Container({ style, children, ...rest }: ViewProps) {
  const t = useTokens();
  const theme = useGridTheme();
  const styles = useMemo(
    () => StyleSheet.create({
      root: { padding: t.inputPadding, backgroundColor: theme.backgroundColor },
    }),
    [t, theme]
  );
  return <View {...rest} style={[styles.root, style]}>{children}</View>;
}
```

### Pattern B — Styled with custom props (variants, conditionals)

```tsx
// Before
const Chevron = styled.View<{ isSelected?: boolean }>`
  border-top-color: ${({ theme, isSelected }) =>
    isSelected ? theme.accentColor : theme.accentBackgroundColor};
`;

// After
type ChevronProps = ViewProps & { isSelected?: boolean };
function Chevron({ isSelected, style, ...rest }: ChevronProps) {
  const theme = useGridTheme();
  return (
    <View
      {...rest}
      style={[
        { borderTopColor: isSelected ? theme.accentColor : theme.accentBackgroundColor },
        style,
      ]}
    />
  );
}
```

### Pattern C — `.attrs(...)` chains

```tsx
// Before
const StyledButton = styled(Button).attrs({
  height: 36, buttonTheme: "basic", disabledBgColor: "transparent",
})``;

// After
const StyledButton = React.forwardRef<View, ButtonProps>(function StyledButton(
  props, ref
) {
  const t = useTokens();
  return (
    <Button
      ref={ref}
      height={t.buttonSm}
      buttonTheme="basic"
      disabledBgColor="transparent"
      {...props}
    />
  );
});
```

### Pattern D — Simple `styled(X).attrs({ ... })` wrappers (most "H1 / H2 / SuccessText" cases)

```tsx
// Before
const H1 = styled(HeaderText).attrs({ fontSize: "large" })``;

// After
const H1 = React.forwardRef<typeof HeaderText, HeaderTextProps>((props, ref) =>
  <HeaderText ref={ref} fontSize="large" {...props} />
);
```

### Universal rules

1. **Preserve the export name** — no breaking imports.
2. **Preserve the prop shape** — same props, same defaults, same types.
3. **Preserve `style` merge order** — every replacement ends with `style={[internal, props.style]}` so callers always win.
4. **Preserve refs** — wrap in `forwardRef` if the original could forward (i.e. anything callers might attach a ref to).
5. **Memoize StyleSheets** with `useMemo(() => StyleSheet.create({...}), [tokens, theme])`. Inline `style={{...}}` is acceptable only for trivial one-liner overrides.
6. **Hook order**: `useTokens()` then `useGridTheme()` — consistent across files.

---

## Phased rollout

### Phase 0 — Infrastructure (invisible)

**Files created:**
- [src/themes/density.ts](packages/react-native-skia-grid/src/themes/density.ts) — token factory + types
- [src/themes/DensityProvider.tsx](packages/react-native-skia-grid/src/themes/DensityProvider.tsx) — context, provider, `useTokens` hook

**Files modified:**
- [src/themes/index.ts](packages/react-native-skia-grid/src/themes/index.ts) — export `Density`, `Tokens`, `getTokens`, `DensityProvider`, `useTokens`
- [src/core/types/grid.ts](packages/react-native-skia-grid/src/core/types/grid.ts) — add `density?: Density` to `SkiaGridProps`
- [src/view/DataGrid.tsx](packages/react-native-skia-grid/src/view/DataGrid.tsx) — destructure `density = "medium"`; mount `<DensityProvider density={density}>` around the existing render tree

**Acceptance:**
- `yarn typecheck` baseline unchanged
- Grid renders identically — provider mounted, no consumer reads tokens yet
- `useTokens()` callable from any descendant; outside the provider it returns `getTokens("medium")` without crashing

### Phase 1 — Slot defaults (~16 files)

Convert every component in `view/slots/defaults/` from styled-components to function + `useMemo(StyleSheet.create)`. Order matters — leaves first.

1. [DefaultText.tsx](packages/react-native-skia-grid/src/view/slots/defaults/DefaultText.tsx) — `NormalText`, `BoldText`, `MutedText`, `InputWrapper`, `InputLabel*`, `InputError`, `HeaderText`, `H1`, `H2`, `ButtonText`, all `*FontAwesomeIcon` variants. Remove the static `DEFAULT_FORM_INPUT_HEIGHT` constant; it gets replaced by `t.inputHeight` everywhere.
2. [DefaultPressable.tsx](packages/react-native-skia-grid/src/view/slots/defaults/DefaultPressable.tsx) — `StyleablePressable`, `StyleablePressableThemed`, `StyleablePressableBase`. Default height comes from `t.inputHeight`.
3. [DefaultButton.tsx](packages/react-native-skia-grid/src/view/slots/defaults/DefaultButton.tsx) — `Button` and its `StyledPressable` wrapper. Default height from `t.buttonHeight`. Border-radius `t.radiusSm`.
4. [DefaultTextInput.tsx](packages/react-native-skia-grid/src/view/slots/defaults/DefaultTextInput.tsx) — `TextInput`, `TextInputContainer`, `commonTextInputStyles`, `RightIconContainer`, `StyledButton`, `RightContent`. Multi-line height: `rows * t.lineHeightHeader + t.spacingL`.
5. [DefaultCheckbox.tsx](packages/react-native-skia-grid/src/view/slots/defaults/DefaultCheckbox.tsx) — `Checkbox`, `CheckSquare`, `CheckboxContainer`, `StyledLabel`.
6. [DefaultTopBar.tsx](packages/react-native-skia-grid/src/view/slots/defaults/DefaultTopBar.tsx) — `TopBar`, `TopBarContainer`, `TopBarAction`, `TopBarActionButton`, `TopBarTitleContainer`. Drop the `TOP_BAR_HEIGHT = 32` export (no external skia-grid consumers; verified). Heights via `t.topBarHeight`.
7. [DefaultAccordion.tsx](packages/react-native-skia-grid/src/view/slots/defaults/DefaultAccordion.tsx) — `Accordion`, `AccordionTitleInnerContainer`, `AccordionTitleText`, `AccentBarAccordion`. Heights via `t.compactControlHeight`.
8. [DefaultBottomSheet.tsx](packages/react-native-skia-grid/src/view/slots/defaults/DefaultBottomSheet.tsx) — `BottomSheetHandle`, `BottomActionModal`. Handle height `t.bottomSheetHandleHeight`. Backdrop opacity stays literal (interaction state, not layout).
9. [DefaultFormContainer.tsx](packages/react-native-skia-grid/src/view/slots/defaults/DefaultFormContainer.tsx) — `FormElementContainer`, `Panel`, `PanelColumn`, `PanelRow`, `PanelContent`, `FormElementLabel`. Margin/padding via spacing scale.
10. [DefaultLayout.tsx](packages/react-native-skia-grid/src/view/slots/defaults/DefaultLayout.tsx) — `HR` height = `t.borderThin`. The `FlexView`, `FullView`, etc. are layout primitives — no density tokens needed.
11. [DefaultIcon.tsx](packages/react-native-skia-grid/src/view/slots/defaults/DefaultIcon.tsx) — size literals → `t.iconSize`.
12. [DefaultActionButton.tsx](packages/react-native-skia-grid/src/view/slots/defaults/DefaultActionButton.tsx) — height/padding via tokens.
13. [DefaultConfirmDialog.tsx](packages/react-native-skia-grid/src/view/slots/defaults/DefaultConfirmDialog.tsx) — `ConfirmationText` padding `t.sectionPadding`, `TopActionsContainer` padding `t.spacingXxl`.
14. [commonStyles.ts](packages/react-native-skia-grid/src/view/slots/defaults/commonStyles.ts) — convert the static StyleSheet to `useCommonStyles()` hook (factory memoized per-tokens). Keep "Five"/"Ten"-named keys for backwards compat; values now come from spacing scale.
15. [filterInputs.tsx](packages/react-native-skia-grid/src/view/slots/defaults/filterInputs.tsx) — `Select`, `NumericInput`, `DatePickerInput`, `ButtonGroupSelect`. Convert internal `styles` to `createStyles(t)` factory. Already function components — only the styles change.
16. [ErrorBoundary.tsx](packages/react-native-skia-grid/src/view/slots/defaults/ErrorBoundary.tsx) — paddings via spacing scale; large display fonts (40/32) stay literal (typography presets).

### Phase 2 — Feature containers (~14 files)

Convert all `columnActions/`, `columnChooser/`, and `view/`-level container components.

17. [columnActions/formActionStyles.ts](packages/react-native-skia-grid/src/columnActions/formActionStyles.ts) — `StyledFontAwesomeIcon`, `StyledButton`, `StyledTopBar`. `width: 98%` stays (semantic % choice; comment added).
18. [columnActions/ColumnActionsModal.tsx](packages/react-native-skia-grid/src/columnActions/ColumnActionsModal.tsx) — any inline literals.
19. [columnActions/HeaderTooltip.tsx](packages/react-native-skia-grid/src/columnActions/HeaderTooltip.tsx) — `HeaderTooltipContainer` padding, tooltip font.
20. [columnActions/autoSize/AutoSizeMenu.tsx](packages/react-native-skia-grid/src/columnActions/autoSize/AutoSizeMenu.tsx) — convert.
21. [columnActions/pin/PinMenu.tsx](packages/react-native-skia-grid/src/columnActions/pin/PinMenu.tsx) — convert.
22. [columnActions/filter/FilterMenu.tsx](packages/react-native-skia-grid/src/columnActions/filter/FilterMenu.tsx) — `StyledTopBar`, switch `commonStyles` import to `useCommonStyles` hook.
23. [columnActions/filter/ConditionsList.tsx](packages/react-native-skia-grid/src/columnActions/filter/ConditionsList.tsx) — `ConditionContainer` padding/row-gap, AND/OR `ButtonGroupSelect` margin.
24. [columnActions/filter/SetFilter.tsx](packages/react-native-skia-grid/src/columnActions/filter/SetFilter.tsx) — `SetFilterContainer` padding, search-input margin, modal checkbox margin. The `Dimensions.get("window").height - 300` responsive calc stays.
25. [columnChooser/styled.tsx](packages/react-native-skia-grid/src/columnChooser/styled.tsx) — biggest single file: `MenuItemContainer`, `MenuItemOuterContainer`, `ClickTarget`, `FilterModalButtonContainer`, `MultiInputContainer`, `FilterContainer`, `Footer`, `accordionStyles`. The pre-existing `width: 98%` on `StyledTopBar` stays.
26. [columnChooser/ColumnChooserModal.tsx](packages/react-native-skia-grid/src/columnChooser/ColumnChooserModal.tsx) — convert `commonStyles` import to hook.
27. [columnChooser/ColumnMenuItems.tsx](packages/react-native-skia-grid/src/columnChooser/ColumnMenuItems.tsx) — convert `commonStyles` import to hook.
28. [view/CellEditingModal.tsx](packages/react-native-skia-grid/src/view/CellEditingModal.tsx) — `FooterContainer` padding/margin. The `Platform.OS === "android" ? 25 : 0` stays as a platform check.
29. [view/ColumnGroupingControl.tsx](packages/react-native-skia-grid/src/view/ColumnGroupingControl.tsx) — `MenuItemOuterContainer`, `SortIconContainer`, `ClickTarget`, `StyledText`, `StartChevron`, `EndChevron`. The internal `stylesheet` becomes a `createStyles(t)` factory called from each component.
30. [view/DefaultInputCellEditor.tsx](packages/react-native-skia-grid/src/view/DefaultInputCellEditor.tsx) — convert any layout literals.

### Phase 3 — Canvas density

31. [src/themes/tokens.ts](packages/react-native-skia-grid/src/themes/tokens.ts) — `GridThemeTokens.rowHeight` / `headerHeight` / `cellPadding` become **fallbacks** when explicit `rowHeight` / `headerHeight` props are unset. Keep the existing defaults at `medium`'s canvas values.
32. [src/view/DataGrid.tsx](packages/react-native-skia-grid/src/view/DataGrid.tsx) — when consumer omits `rowHeight` / `headerHeight` / canvas font props, fall back to `t.canvasRowHeight` / `t.canvasHeaderHeight` / `t.canvasFontSize`.
33. [src/renderer/drawing/*](packages/react-native-skia-grid/src/renderer/drawing) — replace any hardcoded canvas dimensions that aren't already prop-driven with token reads. Audit during execution; should be minimal (most canvas sizing already flows from props).

### Phase 4 — Drop styled-components dependency

34. Verify no remaining imports: `grep -r "from \"styled-components/native\"" packages/react-native-skia-grid/src/` returns zero matches in package-owned files.
35. Delete [src/styled-components-native.d.ts](packages/react-native-skia-grid/src/styled-components-native.d.ts).
36. Remove `styled-components` from `package.json` peerDependencies + peerDependenciesMeta.
37. Final `yarn build` (bob) confirms the package builds cleanly without styled-components.

---

## Safety guarantees

| Guarantee | How it's enforced |
|---|---|
| Medium = pixel-identical | Token medium values pinned to current literals (audit-mapped). Side-by-side render diff per file before committing. |
| Same exports, same prop shape | Conversion playbook (Pattern A-D) preserves names, defaults, ref forwarding, style-merge order. |
| Consumers' `style` prop still wins | Universal `style={[internal, props.style]}` rule for every replacement. |
| Refs keep working | `React.forwardRef` wrapping wherever the original styled-component could receive a ref. |
| No typecheck regression | `yarn typecheck` baseline error count unchanged after every file commit. |
| No silent migration miss | After Phase 2 finishes, `grep "from \"styled-components/native\"" src/` must return zero matches. |
| Rollback is surgical | One file per commit. `git revert <sha>` reverts exactly that file. |
| Density off = pre-density behavior | `<DataGrid>` (no `density` prop) renders identically to HEAD. |

---

## Verification (per phase)

**Phase 0:**
- `yarn typecheck` — baseline unchanged
- Mount the grid; provider is in tree; nothing visually changes
- `useTokens()` callable from any descendant

**Phase 1 (per file):**
- `yarn typecheck` — baseline unchanged
- `yarn jest` — snapshot tests pass (medium produces identical render)
- Eyeball: render the parent surface that uses this primitive at medium → same visual output

**Phase 2 (per file):**
- Same as Phase 1
- Mobile smoke on stress harness (5000 rows): open the relevant surface and confirm visual + behavioral parity at medium

**Post-Phase 2 (full surface verification at all densities):**
- `density="medium"` (default): every form / modal / menu / canvas surface visually identical to HEAD
- `density="high"`: visibly tighter inputs/buttons/menus, smaller fonts, denser canvas rows
- `density="low"`: visibly larger
- Surfaces to walk through: filter modal (text + set + AND/OR), column actions menu, autosize menu, pin menu, column chooser, column grouping control, cell editing modal, confirmation dialog, accordion, bottom sheet
- Scroll/gesture perf check at medium with 5000 rows — FPS delta vs HEAD < noise

**Phase 3:**
- Canvas at each density renders correctly. Row height adjusts. Cell font scales.
- Existing `rowHeight` / `headerHeight` consumer props still take precedence over density defaults.

**Phase 4:**
- `yarn build` (bob) succeeds
- `package.json` no longer lists styled-components peer dep
- `grep "styled-components" src/` zero matches in package-owned files

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Hidden coupling — a styled-component's template reads a theme value not visible in the obvious diff | Read every template top-to-bottom before rewriting. Enumerate every prop access, reproduce in the function body. |
| Ref forwarding dropped silently | Default to `React.forwardRef` for every conversion; only skip when certain no caller passes refs. |
| `style` prop merge order inverted | Universal `style={[internal, props.style]}` rule. Reviewer checks every conversion. |
| `attrs` chain merge order wrong | Document the original attrs in the commit message; verify by hand for each file with non-trivial attrs. |
| Snapshot drift at medium | Token values pinned to current literals up front. Pre-flight: render every surface at HEAD and at branch, diff visually. |
| Canvas size token regression at medium | Phase 3 last; before merging run the 5000-row stress harness at all densities. Compare frame time + visual against HEAD baseline. |
| TypeScript strictness exposing pre-existing weak types | Match the original surface's typing strictness initially. Tighten in a follow-up. |
| External consumer relying on a removed export (e.g. `TOP_BAR_HEIGHT`) | Pre-flight grep across the workspace for every removed export. None should exist outside the package; verify before deletion. |

---

## Rough timeline

- **Phase 0** — half day
- **Phase 1** — 1-1.5 days (16 files, mechanical conversions)
- **Phase 2** — 1 day (14 files)
- **Phase 3** — half day (canvas integration)
- **Phase 4** — 1-2 hours (cleanup)

Total: ~3-4 days of focused work. Delivered as ~37 commits (one per file modified, plus a few infrastructure commits).

---

## Out of scope

- No changes to the color palette or typography font families
- No changes to canvas drawing logic beyond size token reads
- No new public component APIs beyond `density` on `<DataGrid>`
- No migration of consumer apps (`apps/mobile`, `apps/web`) — those continue to use their own styling stack
- No changes to `mobile-core` / `mobile-components` `DEFAULT_FORM_INPUT_HEIGHT` (independent constant in those packages)
