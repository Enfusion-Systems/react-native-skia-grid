# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-10-01

### Added

- Skia-based canvas rendering with 6 visual layers (header background, header content, cell background, cell content, cell overlay, section overlay)
- Column definitions with pinning (left/right), sorting, filtering, grouping, and resizing
- Row selection (single/multi) with checkbox support
- Cell editing with custom editor support via `cellEditor` and `cellEditorSelector`
- Custom cell renderers via `cellRenderer` on column definitions
- Filter system: text, number, date, and set filters with AND/OR join operators
- Multi-column sorting with absolute value sort option
- Row grouping with custom aggregation functions (`registerAggFunc`)
- CSV export via `gridApi.exportToCsv()`
- Theme system with `createTheme()`, cascading token defaults, and `darkTheme`/`lightTheme` presets
- Slot system for replacing built-in UI chrome (Button, TextInput, BottomSheet, etc.)
- Column chooser modal with drag-to-reorder
- Imperative `GridApi` exposed via ref (row data, column state, selection, filter/sort model, events)
- Extension points: `registerFilterMatcher`, `registerSortComparator`, `registerAggFunc`
- Gesture handling: pan to scroll, tap to select, long-press for context actions, pinch for column resize
- Performance: O(1) scroll (SharedValue only), in-place row mutations, LRU font cache, debounced pipeline
