import type { AggFunc, SkiaGridColumn } from "react-native-skia-grid";

/**
 * Deterministic seeded test data. Same seed → same data → stable visual
 * snapshots in Detox specs. Never use Math.random / Date.now here.
 *
 * The `Row` shape is shared by every story. The first five fields
 * (symbol/quantity/price/side/status) are load-bearing for `smoke.spec.ts`
 * (it asserts the exact basic-story column ids) — do not reorder/remove them.
 * The remaining fields back the richer showcase stories (date filter, numeric
 * aggregation, redIfNegative P&L, set filter on trader).
 */
export type Row = {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  side: "Buy" | "Sell";
  status: "Pending" | "Filled" | "Cancelled";
  trader: string;
  notional: number;
  pnl: number; // can be negative — drives the redIfNegative demo
  updatedAt: string; // ISO yyyy-mm-dd — drives the date-filter demo
};

const SYMBOLS = ["AAPL", "MSFT", "GOOG", "AMZN", "META", "TSLA", "NVDA", "ORCL"];
const SIDES: Row["side"][] = ["Buy", "Sell"];
const STATUSES: Row["status"][] = ["Pending", "Filled", "Cancelled"];
const TRADERS = ["Ada", "Linus", "Grace", "Alan", "Margaret", "Dennis"];

// Fixed epoch so dates are deterministic (never Date.now()).
const DATE_BASE = Date.UTC(2024, 0, 1);

// Mulberry32 — small deterministic PRNG. Keeps generated data stable across
// runs and platforms without bringing in a seedrandom dependency.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRows(count: number, seed = 42): Row[] {
  const rng = mulberry32(seed);
  const rows: Row[] = new Array(Math.max(count, 0));
  for (let i = 0; i < count; i++) {
    const price = Math.round(rng() * 10000) / 100;
    const quantity = Math.floor(rng() * 1000) + 1;
    const days = Math.floor(rng() * 365);
    rows[i] = {
      id: `row-${i}`,
      symbol: SYMBOLS[Math.floor(rng() * SYMBOLS.length)],
      quantity,
      price,
      side: SIDES[Math.floor(rng() * SIDES.length)],
      status: STATUSES[Math.floor(rng() * STATUSES.length)],
      trader: TRADERS[Math.floor(rng() * TRADERS.length)],
      notional: Math.round(price * quantity * 100) / 100,
      pnl: Math.round((rng() * 2000 - 1000) * 100) / 100, // -1000..+1000
      updatedAt: new Date(DATE_BASE + days * 86400000)
        .toISOString()
        .slice(0, 10),
    };
  }
  return rows;
}

// Capability flags shared by most demo columns. The column-action modal only
// opens on header tap when a column has at least one of these set
// (ColumnActionsModal gates on `actionEnabled`).
const ACTIONS = {
  sortable: true,
  canResize: true,
  canPinned: true,
  canGrouped: true,
  canFilter: true,
} as const;

/**
 * The canonical 5-column / basic story config. Load-bearing for smoke.spec.ts —
 * keep the ids and order: symbol, quantity, price, side, status.
 */
export function basicColumns(): SkiaGridColumn<Row>[] {
  return [
    { id: "symbol", field: "symbol", name: "Symbol", width: 100, filterType: "set", ...ACTIONS },
    { id: "quantity", field: "quantity", name: "Qty", width: 80, alignment: "right", filterType: "number", ...ACTIONS },
    { id: "price", field: "price", name: "Price", width: 100, alignment: "right", filterType: "number", ...ACTIONS },
    { id: "side", field: "side", name: "Side", width: 80, filterType: "set", ...ACTIONS },
    { id: "status", field: "status", name: "Status", width: 120, filterType: "set", ...ACTIONS },
  ];
}

/** Columns that demonstrate every filter type (set / number / text / date). */
export function filterColumns(): SkiaGridColumn<Row>[] {
  return [
    { id: "symbol", field: "symbol", name: "Symbol", width: 100, filterType: "set", ...ACTIONS },
    { id: "trader", field: "trader", name: "Trader", width: 100, filterType: "text", ...ACTIONS },
    { id: "quantity", field: "quantity", name: "Qty", width: 80, alignment: "right", filterType: "number", ...ACTIONS },
    { id: "side", field: "side", name: "Side", width: 80, filterType: "set", ...ACTIONS },
    { id: "updatedAt", field: "updatedAt", name: "Updated", width: 120, filterType: "date", ...ACTIONS },
  ];
}

/**
 * Columns with aggregation + groupable dimensions for the grouping story.
 * Dimension columns intentionally expose only sort + group (not filter/resize/
 * pin) so the action sheet stays short and the "Group" button is on-screen.
 */
export function groupableColumns(): SkiaGridColumn<Row>[] {
  const groupable = { sortable: true, canGrouped: true } as const;
  return [
    { id: "side", field: "side", name: "Side", width: 90, ...groupable },
    { id: "status", field: "status", name: "Status", width: 110, ...groupable },
    { id: "symbol", field: "symbol", name: "Symbol", width: 90, ...groupable },
    { id: "quantity", field: "quantity", name: "Qty", width: 90, alignment: "right", aggFunc: "sum", ...groupable },
    { id: "price", field: "price", name: "Avg Px", width: 90, alignment: "right", aggFunc: "avg", ...groupable },
  ];
}

/** Columns with editable cells for the cell-editing story. */
export function editableColumns(): SkiaGridColumn<Row>[] {
  return [
    { id: "symbol", field: "symbol", name: "Symbol", width: 100, ...ACTIONS },
    { id: "quantity", field: "quantity", name: "Qty", width: 90, alignment: "right", editable: true, ...ACTIONS },
    { id: "price", field: "price", name: "Price", width: 90, alignment: "right", editable: true, ...ACTIONS },
    { id: "status", field: "status", name: "Status", width: 120, editable: true, ...ACTIONS },
  ];
}

/** valueFormatter + redIfNegative showcase (custom cell display). */
export function customRenderColumns(): SkiaGridColumn<Row>[] {
  return [
    { id: "symbol", field: "symbol", name: "Symbol", width: 100, ...ACTIONS },
    {
      id: "price",
      field: "price",
      name: "Price",
      width: 110,
      alignment: "right",
      // valueFormatter receives { row, column, value } and returns the display string.
      valueFormatter: ({ value }) => `$${Number(value).toFixed(2)}`,
      ...ACTIONS,
    },
    {
      id: "notional",
      field: "notional",
      name: "Notional",
      width: 130,
      alignment: "right",
      valueFormatter: ({ value }) => Number(value).toLocaleString("en-US"),
      ...ACTIONS,
    },
    {
      id: "pnl",
      field: "pnl",
      name: "P&L",
      width: 100,
      alignment: "right",
      redIfNegative: true, // negative values render in the theme danger color
      valueFormatter: ({ value }) =>
        `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(2)}`,
      ...ACTIONS,
    },
  ];
}

/** Wide, mixed config for the large-dataset "enterprise" story. */
export function enterpriseColumns(): SkiaGridColumn<Row>[] {
  return [
    { id: "symbol", field: "symbol", name: "Symbol", width: 90, pinned: "left", filterType: "set", ...ACTIONS },
    { id: "trader", field: "trader", name: "Trader", width: 90, filterType: "text", ...ACTIONS },
    { id: "side", field: "side", name: "Side", width: 70, filterType: "set", ...ACTIONS },
    { id: "quantity", field: "quantity", name: "Qty", width: 80, alignment: "right", filterType: "number", ...ACTIONS },
    { id: "price", field: "price", name: "Price", width: 90, alignment: "right", filterType: "number", ...ACTIONS },
    { id: "notional", field: "notional", name: "Notional", width: 110, alignment: "right", filterType: "number", ...ACTIONS },
    { id: "pnl", field: "pnl", name: "P&L", width: 90, alignment: "right", redIfNegative: true, filterType: "number", ...ACTIONS },
    { id: "updatedAt", field: "updatedAt", name: "Updated", width: 110, filterType: "date", ...ACTIONS },
    { id: "status", field: "status", name: "Status", width: 100, pinned: "right", filterType: "set", ...ACTIONS },
  ];
}

/**
 * Runtime column-count helper for DataSizeControls. Extends `base` with extra
 * numeric columns (reusing real fields so they always render data) or trims it.
 * Always returns at least one column.
 */
export function buildColumns(
  base: SkiaGridColumn<Row>[],
  count: number
): SkiaGridColumn<Row>[] {
  const target = Math.max(count, 1);
  if (target <= base.length) return base.slice(0, target);
  const reuseFields: Array<keyof Row> = ["quantity", "price", "notional", "pnl"];
  const extra: SkiaGridColumn<Row>[] = [];
  for (let i = base.length; i < target; i++) {
    const field = reuseFields[(i - base.length) % reuseFields.length];
    extra.push({
      id: `c${i}`,
      field: field as string,
      name: `C${i}`,
      width: 90,
      alignment: "right",
      filterType: "number",
      ...ACTIONS,
    });
  }
  return [...base, ...extra];
}

/** Demo aggregation functions registered via the grid's `aggFuncs` prop. */
export const demoAggFuncs: Record<string, AggFunc<Row>> = {
  sum: ({ rowNode, colDef }) =>
    (rowNode.children ?? []).reduce(
      (acc, child) => acc + (Number((child.data as Row)?.[colDef.field as keyof Row]) || 0),
      0
    ),
  avg: ({ rowNode, colDef }) => {
    const kids = rowNode.children ?? [];
    if (kids.length === 0) return 0;
    const total = kids.reduce(
      (acc, child) => acc + (Number((child.data as Row)?.[colDef.field as keyof Row]) || 0),
      0
    );
    return Math.round((total / kids.length) * 100) / 100;
  },
};
