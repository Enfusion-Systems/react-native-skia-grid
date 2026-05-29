import {
  type SkFont,
  type SkTypefaceFontProvider,
  FontStyle,
  matchFont,
} from "@shopify/react-native-skia";
import { Platform } from "react-native";

import { DEFAULT_FONT_SIZE, FONT_WIDTH_ADJ_MULTIPLIER } from "../../utils/constants";

export const defaultFontFamily = Platform.select({
  ios: "Helvetica",
  android: "helvetica",
  default: "sans",
});

type Slant = "normal" | "oblique" | "italic";

// ─── Caches ──────────────────────────────────────────────────────────────────
// Bounded LRU caches for Skia font lookups and text-width measurements. Both
// are deterministic for a given key, so caching is safe and has no effect on
// rendering output. JavaScript `Map` preserves insertion order, so deleting +
// re-inserting on hit moves the entry to the "most recently used" end; when
// the size cap is exceeded we evict the first (oldest) entry.

const FONT_CACHE_MAX = 64;
const TEXT_WIDTH_CACHE_MAX = 2000;

const fontCache = new Map<string, SkFont>();
const fontKeys = new WeakMap<SkFont, string>();
const textWidthCache = new Map<string, number>();

function lruGet<K, V>(map: Map<K, V>, key: K): V | undefined {
  const value = map.get(key);
  if (value === undefined) return undefined;
  // touch: move to MRU end
  map.delete(key);
  map.set(key, value);
  return value;
}

function lruSet<K, V>(map: Map<K, V>, key: K, value: V, max: number): void {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  if (map.size > max) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
}

function buildFontKey(
  family: string,
  size: number,
  style: Slant,
  weight: string
): string {
  return `${family}|${size}|${style}|${weight}`;
}

/**
 * Clear the font and text-width caches. Call this if `fontManager` is
 * replaced at runtime or in test setup/teardown.
 */
export function clearFontCaches(): void {
  fontCache.clear();
  textWidthCache.clear();
  // WeakMap entries clean up automatically as SkFont instances are GC'd.
}

export function getFont(
  fontManager: SkTypefaceFontProvider,
  fontSize: number = DEFAULT_FONT_SIZE,
  fontFamily = "Lato",
  fontStyle = FontStyle.Normal
) {
  const size = fontSize < 0 ? DEFAULT_FONT_SIZE : fontSize;
  const slant = fontStyle.slant ? fontStyle.slant.valueOf() : 0;

  let style: Slant = slant === 0 ? "normal" : "oblique";
  if (slant === 1) style = "italic";

  const fontWeight = fontStyle.weight
    ? (fontStyle.weight.toString() as "100")
    : "normal";

  const key = buildFontKey(fontFamily, size, style, fontWeight);
  const cached = lruGet(fontCache, key);
  if (cached !== undefined) return cached;

  const font = matchFont(
    {
      fontFamily,
      fontSize: size,
      fontStyle: style,
      fontWeight,
    },
    fontManager
  );

  font.setSize(size);

  lruSet(fontCache, key, font, FONT_CACHE_MAX);
  fontKeys.set(font, key);

  return font;
}

export function getTextWidth(font: SkFont, text: string) {
  const fontKey = fontKeys.get(font);
  if (fontKey !== undefined) {
    const cacheKey = `${fontKey}\u0000${text}`;
    const cached = lruGet(textWidthCache, cacheKey);
    if (cached !== undefined) return cached;

    const width = font.measureText(text).width * FONT_WIDTH_ADJ_MULTIPLIER;
    lruSet(textWidthCache, cacheKey, width, TEXT_WIDTH_CACHE_MAX);
    return width;
  }

  // Font was not produced by getFont (caller built it directly).
  // Fall back to uncached measurement — correct, just slower.
  return font.measureText(text).width * FONT_WIDTH_ADJ_MULTIPLIER;
}
