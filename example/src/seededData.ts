import type { SkiaGridColumn } from "react-native-skia-grid";

/**
 * Deterministic seeded test data. Same seed → same data → stable visual
 * snapshots in Detox specs. Never use Math.random / Date.now here.
 */

export type Row = {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  side: "Buy" | "Sell";
  status: "Pending" | "Filled" | "Cancelled";
};

const SYMBOLS = ["AAPL", "MSFT", "GOOG", "AMZN", "META", "TSLA", "NVDA", "ORCL"];
const SIDES: Row["side"][] = ["Buy", "Sell"];
const STATUSES: Row["status"][] = ["Pending", "Filled", "Cancelled"];

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
  const rows: Row[] = new Array(count);
  for (let i = 0; i < count; i++) {
    rows[i] = {
      id: `row-${i}`,
      symbol: SYMBOLS[Math.floor(rng() * SYMBOLS.length)],
      quantity: Math.floor(rng() * 1000) + 1,
      price: Math.round(rng() * 10000) / 100,
      side: SIDES[Math.floor(rng() * SIDES.length)],
      status: STATUSES[Math.floor(rng() * STATUSES.length)],
    };
  }
  return rows;
}

export function basicColumns(): SkiaGridColumn<Row>[] {
  return [
    { id: "symbol", field: "symbol", name: "Symbol", width: 100 },
    {
      id: "quantity",
      field: "quantity",
      name: "Qty",
      width: 80,
      alignment: "right",
    },
    {
      id: "price",
      field: "price",
      name: "Price",
      width: 100,
      alignment: "right",
    },
    { id: "side", field: "side", name: "Side", width: 80 },
    { id: "status", field: "status", name: "Status", width: 120 },
  ];
}
