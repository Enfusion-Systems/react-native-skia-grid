import { clearFontCaches, getFont, getTextWidth } from "../fontUtils";

type FakeFont = {
  setSize: jest.Mock;
  measureText: jest.Mock;
};

const buildFakeFont = (widthPerChar = 7): FakeFont => ({
  setSize: jest.fn(),
  measureText: jest.fn((text: string) => ({ width: text.length * widthPerChar })),
});

jest.mock(
  "@shopify/react-native-skia",
  () => ({
    FontStyle: { Normal: { slant: 0, weight: 400 } },
    matchFont: jest.fn(),
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

const { matchFont } = jest.requireMock("@shopify/react-native-skia") as {
  matchFont: jest.Mock;
};

const fakeFontManager = {} as never;

describe("fontUtils caches", () => {
  beforeEach(() => {
    clearFontCaches();
    matchFont.mockReset();
  });

  describe("getFont", () => {
    it("should call matchFont on first invocation", () => {
      matchFont.mockReturnValueOnce(buildFakeFont());
      const font = getFont(fakeFontManager, 14, "Lato");
      expect(matchFont).toHaveBeenCalledTimes(1);
      expect(font).toBeDefined();
    });

    it("should return same font reference for identical params", () => {
      const fake = buildFakeFont();
      matchFont.mockReturnValueOnce(fake);
      const first = getFont(fakeFontManager, 14, "Lato");
      const second = getFont(fakeFontManager, 14, "Lato");
      expect(first).toBe(second);
      expect(matchFont).toHaveBeenCalledTimes(1);
    });

    it("should create new font when fontSize differs", () => {
      matchFont.mockReturnValueOnce(buildFakeFont()).mockReturnValueOnce(buildFakeFont());
      getFont(fakeFontManager, 14, "Lato");
      getFont(fakeFontManager, 16, "Lato");
      expect(matchFont).toHaveBeenCalledTimes(2);
    });

    it("should create new font when fontFamily differs", () => {
      matchFont.mockReturnValueOnce(buildFakeFont()).mockReturnValueOnce(buildFakeFont());
      getFont(fakeFontManager, 14, "Lato");
      getFont(fakeFontManager, 14, "Helvetica");
      expect(matchFont).toHaveBeenCalledTimes(2);
    });

    it("should call setSize with the resolved size", () => {
      const fake = buildFakeFont();
      matchFont.mockReturnValueOnce(fake);
      getFont(fakeFontManager, 18, "Lato");
      expect(fake.setSize).toHaveBeenCalledWith(18);
    });

    it("should substitute DEFAULT_FONT_SIZE when negative size passed", () => {
      const fake = buildFakeFont();
      matchFont.mockReturnValueOnce(fake);
      getFont(fakeFontManager, -5, "Lato");
      expect(fake.setSize).toHaveBeenCalledWith(expect.any(Number));
      expect(fake.setSize.mock.calls[0][0]).toBeGreaterThan(0);
    });
  });

  describe("getTextWidth", () => {
    it("should call measureText on first invocation", () => {
      const fake = buildFakeFont();
      matchFont.mockReturnValueOnce(fake);
      const font = getFont(fakeFontManager, 14, "Lato");
      getTextWidth(font, "hello");
      expect(fake.measureText).toHaveBeenCalledTimes(1);
      expect(fake.measureText).toHaveBeenCalledWith("hello");
    });

    it("should return cached width on repeat call for same font+text", () => {
      const fake = buildFakeFont();
      matchFont.mockReturnValueOnce(fake);
      const font = getFont(fakeFontManager, 14, "Lato");
      const first = getTextWidth(font, "hello");
      const second = getTextWidth(font, "hello");
      expect(first).toBe(second);
      expect(fake.measureText).toHaveBeenCalledTimes(1);
    });

    it("should measure separately for different text", () => {
      const fake = buildFakeFont();
      matchFont.mockReturnValueOnce(fake);
      const font = getFont(fakeFontManager, 14, "Lato");
      getTextWidth(font, "hello");
      getTextWidth(font, "world");
      expect(fake.measureText).toHaveBeenCalledTimes(2);
    });

    it("should fall back to uncached measurement for fonts not from getFont", () => {
      const stray = buildFakeFont();
      // Never registered via getFont → no key in WeakMap
      getTextWidth(stray as never, "hello");
      getTextWidth(stray as never, "hello");
      expect(stray.measureText).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearFontCaches", () => {
    it("should force matchFont to be called again after clear", () => {
      matchFont.mockReturnValueOnce(buildFakeFont()).mockReturnValueOnce(buildFakeFont());
      getFont(fakeFontManager, 14, "Lato");
      clearFontCaches();
      getFont(fakeFontManager, 14, "Lato");
      expect(matchFont).toHaveBeenCalledTimes(2);
    });

    it("should force measureText to be called again after clear", () => {
      const fakeA = buildFakeFont();
      const fakeB = buildFakeFont();
      matchFont.mockReturnValueOnce(fakeA).mockReturnValueOnce(fakeB);
      const first = getFont(fakeFontManager, 14, "Lato");
      getTextWidth(first, "hello");
      clearFontCaches();
      const second = getFont(fakeFontManager, 14, "Lato");
      getTextWidth(second, "hello");
      expect(fakeA.measureText).toHaveBeenCalledTimes(1);
      expect(fakeB.measureText).toHaveBeenCalledTimes(1);
    });
  });
});
