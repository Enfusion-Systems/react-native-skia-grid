jest.mock(
  "@shopify/react-native-skia",
  () => ({
    PaintStyle: { Fill: 0, Stroke: 1 },
    Skia: {
      Color: jest.fn((c: string) => c),
      Path: {
        MakeFromSVGString: jest.fn(() => null),
      },
      XYWHRect: jest.fn((x: number, y: number, w: number, h: number) => ({
        x,
        y,
        w,
        h,
      })),
    },
    TextAlign: { Left: 0, Right: 1, Center: 2 },
  }),
  { virtual: true }
);

jest.mock(
  "react-native",
  () => ({
    Platform: { select: (obj: Record<string, unknown>) => obj.default ?? obj.ios },
  }),
  { virtual: true }
);

import {
  clearParagraphCache,
  getOrBuildParagraph,
} from "../drawingPrimitives";

type FakeParagraph = {
  id: number;
  getHeight: jest.Mock;
  paint: jest.Mock;
};

let nextId = 0;
const buildFake = (): FakeParagraph => ({
  id: ++nextId,
  getHeight: jest.fn(() => 18),
  paint: jest.fn(),
});

describe("paragraphCache", () => {
  beforeEach(() => {
    clearParagraphCache();
    nextId = 0;
  });

  describe("getOrBuildParagraph", () => {
    it("should call build on first invocation", () => {
      const build = jest.fn(buildFake);
      const result = getOrBuildParagraph("key-1", build);
      expect(build).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it("should return cached paragraph for same key", () => {
      const build = jest.fn(buildFake);
      const first = getOrBuildParagraph("key-1", build);
      const second = getOrBuildParagraph("key-1", build);
      expect(first).toBe(second);
      expect(build).toHaveBeenCalledTimes(1);
    });

    it("should build separately for different keys", () => {
      const build = jest.fn(buildFake);
      const a = getOrBuildParagraph("key-a", build);
      const b = getOrBuildParagraph("key-b", build);
      expect(a).not.toBe(b);
      expect(build).toHaveBeenCalledTimes(2);
    });

    it("should not re-invoke build for repeated access under cache bound", () => {
      const build = jest.fn(buildFake);
      for (let i = 0; i < 10; i++) getOrBuildParagraph("stable-key", build);
      expect(build).toHaveBeenCalledTimes(1);
    });

    it("should treat whitespace differences as distinct keys", () => {
      const build = jest.fn(buildFake);
      getOrBuildParagraph("key-a|1", build);
      getOrBuildParagraph("key-a| 1", build);
      expect(build).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearParagraphCache", () => {
    it("should force rebuild after clear", () => {
      const build = jest.fn(buildFake);
      getOrBuildParagraph("key-1", build);
      clearParagraphCache();
      getOrBuildParagraph("key-1", build);
      expect(build).toHaveBeenCalledTimes(2);
    });

    it("should clear independently of other keys", () => {
      const build = jest.fn(buildFake);
      getOrBuildParagraph("key-a", build);
      getOrBuildParagraph("key-b", build);
      clearParagraphCache();
      getOrBuildParagraph("key-a", build);
      getOrBuildParagraph("key-b", build);
      expect(build).toHaveBeenCalledTimes(4);
    });
  });

  describe("LRU eviction", () => {
    it("should not grow unbounded when many unique keys are added", () => {
      // Cap is 2000; push 2100 entries with unique keys and verify that
      // the first entries have been evicted.
      const build = jest.fn(buildFake);
      for (let i = 0; i < 2100; i++) {
        getOrBuildParagraph(`k-${i}`, build);
      }
      // All 2100 unique builds happened.
      expect(build).toHaveBeenCalledTimes(2100);

      // Most-recent key is still cached — no rebuild.
      const buildForRecent = jest.fn(buildFake);
      getOrBuildParagraph("k-2099", buildForRecent);
      expect(buildForRecent).toHaveBeenCalledTimes(0);

      // Earliest key was evicted — rebuild expected.
      const buildForEvicted = jest.fn(buildFake);
      getOrBuildParagraph("k-0", buildForEvicted);
      expect(buildForEvicted).toHaveBeenCalledTimes(1);
    });

    it("should keep recently-accessed keys when cache fills", () => {
      const build = jest.fn(buildFake);
      // Fill cache to cap
      for (let i = 0; i < 2000; i++) {
        getOrBuildParagraph(`k-${i}`, build);
      }
      // Touch k-0 to make it most-recently-used
      getOrBuildParagraph("k-0", build);
      // Push one more distinct key — should evict k-1 (now least-recently-used),
      // not k-0 (which was just touched).
      getOrBuildParagraph("k-2000", build);

      // k-0 should still be cached
      const buildForK0 = jest.fn(buildFake);
      getOrBuildParagraph("k-0", buildForK0);
      expect(buildForK0).toHaveBeenCalledTimes(0);

      // k-1 should have been evicted
      const buildForK1 = jest.fn(buildFake);
      getOrBuildParagraph("k-1", buildForK1);
      expect(buildForK1).toHaveBeenCalledTimes(1);
    });
  });
});
