# `react-native-skia-grid` — Detox e2e host app

Minimal RN host app for Detox end-to-end tests. Not shipped; consumed only by the library's regression suite.

Scope and rationale: [`../docs/skia-grid-refactor.md`](../docs/skia-grid-refactor.md) §3 (Track B).

---

## Layout

```
example/
├── README.md                          ← you are here
├── package.json                       ← deps + scripts pinned to RN 0.79.4 / Skia 2.0.7 / RNGH 2.24 / Reanimated 3.17.4
├── babel.config.js                    ← module-resolver alias to ../src
├── metro.config.js                    ← watchFolders for the parent library source
├── index.js                           ← AppRegistry entry
├── app.json                           ← RN app manifest (name = SkiaGridExample)
├── App.tsx                            ← SafeAreaProvider + StatusBar + BasicScene
├── tsconfig.json
├── Gemfile                            ← CocoaPods Ruby deps
├── .ruby-version                      ← pins Ruby 4.0.5 for pod install
├── .detoxrc.js                        ← Detox config (iOS sim, iPhone 17 Pro)
├── .gitignore                         ← stock RN template ignores
├── .watchmanconfig
├── src/
│   ├── StateBridge.tsx                ← hidden View; JSON-serializes onLayoutComplete state into accessibilityLabel
│   ├── seededData.ts                  ← Mulberry32-seeded deterministic rows + basic columns
│   └── scenes/
│       └── basic.tsx                  ← 100 rows × 5 cols, single selection, wires Grid → StateBridge
├── ios/
│   ├── Podfile, Podfile.lock
│   ├── SkiaGridExample/               ← AppDelegate.swift, Info.plist, etc.
│   ├── SkiaGridExample.xcodeproj/
│   ├── SkiaGridExample.xcworkspace/   ← open this in Xcode (NOT the .xcodeproj)
│   └── .xcode.env                     ← node binary lookup for build phase
└── e2e/
    ├── jest.config.js
    ├── tsconfig.json
    ├── helpers/
    │   ├── stateBridge.ts             ← readGridState / waitForGridState
    │   └── gridDriver.ts              ← declarative interaction helpers
    └── specs/
        └── smoke.spec.ts              ← 3 Week-1 smoke tests
```

The library source is at `../src` (repo root). Babel + Metro + tsconfig alias `react-native-skia-grid` to that path, so the example always consumes the live source — no `yarn build` needed during development.

---

## First-time setup on a new machine

Tested working with: macOS 24, Node 26, Yarn 1.22, Xcode 26.3, Ruby 4.0.5 (Homebrew `ruby@4`), CocoaPods 1.16.2, applesimutils 0.9.12.

### 1. Install Homebrew deps

```bash
brew tap wix/brew
brew install applesimutils ruby@4
```

`applesimutils` is required by Detox to drive iOS simulators. `ruby@4` is needed because RN 0.79's Podfile codegen pipeline fails on the macOS system Ruby (2.6).

### 2. Install JS deps

```bash
cd example
yarn install
```

The example app's `package.json` declares **`uuid`, `lodash`, `date-fns`** as direct deps. These are runtime dependencies of the parent library; because the example consumes the library via source-alias (not the published artifact), Yarn won't auto-install them transitively — they have to be listed here.

### 3. Pod install

```bash
cd example/ios
export PATH="/opt/homebrew/opt/ruby@4/bin:$PATH"
pod install
```

The `PATH` export must come **before** `pod install` so it uses Ruby 4 instead of system Ruby 2.6. The included `.ruby-version` documents the version intent but doesn't switch Ruby on its own unless you use rbenv/asdf.

### 4. Verify simulator

```bash
xcrun simctl list devices "iPhone 17 Pro"
```

If empty, edit `.detoxrc.js` and pin a device you do have. The pin must match a real installed simulator family.

### 5. Smoke test

Free port 8081 first (no other Metro running), then:

```bash
cd example
yarn react-native start --reset-cache &     # background Metro
./node_modules/.bin/detox build --configuration ios.sim.debug
./node_modules/.bin/detox test --configuration ios.sim.debug
```

Or use the npm scripts:

```bash
yarn build:ios
yarn e2e:ios:smoke
```

Expected: 3 specs pass in ~25 seconds on a warm simulator.

---

## If you need to regenerate the iOS project from scratch

The `ios/` directory tracks an RN 0.79.4 community template renamed from `HelloWorld` to `SkiaGridExample`. To recreate it from the official upstream template:

```bash
# 1. Clone the upstream template at the right tag
git clone --depth 1 --branch 0.79-stable \
  https://github.com/react-native-community/template.git /tmp/rn-template

# 2. Copy ios/ into the example app
cp -R /tmp/rn-template/template/ios example/ios
cp /tmp/rn-template/template/_xcode.env example/ios/.xcode.env

# 3. Rename HelloWorld → SkiaGridExample (directories + file contents)
cd example
mv ios/HelloWorld ios/SkiaGridExample
mv ios/HelloWorld.xcodeproj ios/SkiaGridExample.xcodeproj
find ios -depth -name '*HelloWorld*' -execdir bash -c \
  'mv "$1" "${1//HelloWorld/SkiaGridExample}"' _ {} \;
find ios -type f \( -name '*.swift' -o -name '*.plist' -o -name '*.storyboard' \
  -o -name '*.pbxproj' -o -name 'Podfile' -o -name '*.xcprivacy' \
  -o -name '*.xcscheme' -o -name '*.xcworkspacedata' \) -print0 \
  | xargs -0 perl -i -pe 's/HelloWorld/SkiaGridExample/g'

# 4. Pod install (with modern Ruby on PATH as above)
cd ios && export PATH="/opt/homebrew/opt/ruby@4/bin:$PATH" && pod install
```

We **don't** use `npx @react-native-community/cli init` because (a) the project rules forbid `npm`/`npx` directly, and (b) the v18 CLI hard-refuses to run `init` outside of `npx`.

---

## How the Skia testability bridge works

The grid draws to a single `Canvas` — Detox cannot find cells via `by.id()` because no native view per cell exists. Instead:

1. The grid emits `onLayoutComplete(state)` after each React state-driven redraw (see [`../src/renderer/GridCanvas.tsx`](../src/renderer/GridCanvas.tsx)).
2. `BasicScene` stores the state in React state.
3. `<StateBridge state={state} />` renders a positioned `<View testID="grid-state">` whose `accessibilityLabel` is `JSON.stringify(state)`.
4. Specs call `await readGridState()`, which fetches the label via `element(by.id("grid-state")).getAttributes()` and `JSON.parse`s it back.

`GridReportableState` shape (see [`../src/core/types/grid.ts`](../src/core/types/grid.ts)):

```ts
type GridReportableState = {
  selectedRowIds: string[];
  rowCount: number;
  columnIds: string[];
  pinnedColumnIds: { left: string[]; right: string[] };
  sortStatus: MultiColumnSortStatus | null;
  filterColumnIds: string[];
  editingCell: { rowId: string; colId: string } | null;
  sectionWidths: Record<ColumnSection, number>;
};
```

It will grow as more specs need more state. Keep the payload under ~4kb to avoid `accessibilityLabel` truncation on older OS versions; if it grows past that, split into multiple `testID`'d views (e.g. `grid-state-rows`, `grid-state-cols`).

**Do NOT** set `accessibilityElementsHidden={true}` or `importantForAccessibility="no"` on the StateBridge view — both also hide it from Detox's element matcher on iOS. Position the view at zero opacity instead.

---

## Writing new specs

- Use **Detox's `expect`** for element matchers (`expect(element(by.id("foo"))).toBeVisible()`). It's the global default in Detox 20+.
- Use **`jestExpect` from `@jest/globals`** for value matchers — Detox 20 globally overrides `expect` and rejects non-element arguments. See the import at the top of `e2e/specs/smoke.spec.ts`.
- Compose calls via `gridDriver` rather than raw `element()`/`by.id()` so specs stay refactor-tolerant.
- Specs run sequentially (`maxWorkers: 1`) — Detox cannot parallelize across one simulator.

---

## What's coming in Weeks 2-6

Per [`../docs/skia-grid-refactor.md`](../docs/skia-grid-refactor.md) §3.7:

| Week | Specs to add | Scenes to add |
| ---- | --- | --- |
| 2 | scroll, selection, sort | (basic only) |
| 3 | filter, pinning, resizing | enterprise |
| 4 | grouping, cellEditing, themeAndDensity | grouped, editable |
| 5 | CI wiring, flake review | — |
| 6 | Final regression sweep | — |

Don't pre-stub these; the patterns will refine as Week-1 hits real CI.

---

## Known caveats

- **Reanimated sync.** Detox tracks declarative Reanimated animations (Detox PR #4040) but does not introspect arbitrary `runOnUI` worklets. Phase 3 of the parent refactor will introduce UI-thread worklet loops; gate any persistent ones behind `global.__DETOX__` to avoid stalling idle detection.
- **Visual snapshots.** Detox's `device.takeScreenshot` exists but doesn't diff — pair with `pixelmatch` or `jest-image-snapshot` in a post-step. Reserve for `themeAndDensity.spec.ts` once it lands; Skia text rasterization is device-dependent.
- **Port 8081.** Metro binds to 8081 by default. If another RN dev session is using it, free the port first or pass `--port` and rebuild with `RCT_METRO_PORT=<port>`.
- **Single platform today.** Only iOS Simulator is wired up. Android emulator config is sketched in `.detoxrc.js` but the `android/` directory hasn't been regenerated yet.
