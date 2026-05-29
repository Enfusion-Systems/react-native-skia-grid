import { createTheme } from "../createTheme";
import { DEFAULT_TOKENS } from "../tokens";
import type { GridTheme, GridThemeTokens } from "../tokens";

describe("createTheme", () => {
  it("should return a frozen theme object", () => {
    const theme = createTheme();
    expect(Object.isFrozen(theme)).toBe(true);
  });

  it("should include all DEFAULT_TOKENS when called with no overrides", () => {
    const theme = createTheme();
    for (const key of Object.keys(DEFAULT_TOKENS) as (keyof GridThemeTokens)[]) {
      expect(theme[key]).toBe(DEFAULT_TOKENS[key]);
    }
  });

  it("should override specified tokens", () => {
    const theme = createTheme({
      backgroundColor: "#fff",
      cellTextColor: "#000",
    });
    expect(theme.backgroundColor).toBe("#fff");
    expect(theme.cellTextColor).toBe("#000");
  });

  it("should expose withOverrides method", () => {
    const theme = createTheme();
    expect(typeof theme.withOverrides).toBe("function");
  });

  describe("cascading defaults", () => {
    it("should cascade headerBackgroundColor from backgroundColor", () => {
      const theme = createTheme({
        backgroundColor: "#custom",
        headerBackgroundColor: undefined as unknown as string,
      });
      expect(theme.headerBackgroundColor).toBe("#custom");
    });

    it("should cascade headerTextColor from cellTextColor", () => {
      const theme = createTheme({
        cellTextColor: "#textcolor",
        headerTextColor: undefined as unknown as string,
      });
      expect(theme.headerTextColor).toBe("#textcolor");
    });

    it("should cascade cellSelectedTextColor from cellTextColor", () => {
      const theme = createTheme({
        cellTextColor: "#textcolor",
        cellSelectedTextColor: undefined as unknown as string,
      });
      expect(theme.cellSelectedTextColor).toBe("#textcolor");
    });

    it("should cascade separatorColor from borderColor", () => {
      const theme = createTheme({
        borderColor: "#border",
        separatorColor: undefined as unknown as string,
      });
      expect(theme.separatorColor).toBe("#border");
    });

    it("should cascade sortIconColor from mutedTextColor", () => {
      const theme = createTheme({
        mutedTextColor: "#muted",
        sortIconColor: undefined as unknown as string,
      });
      expect(theme.sortIconColor).toBe("#muted");
    });

    it("should cascade filterActiveColor from accentColor", () => {
      const theme = createTheme({
        accentColor: "#accent",
        filterActiveColor: undefined as unknown as string,
      });
      expect(theme.filterActiveColor).toBe("#accent");
    });

    it("should cascade checkboxCheckedColor from accentColor", () => {
      const theme = createTheme({
        accentColor: "#accent",
        checkboxCheckedColor: undefined as unknown as string,
      });
      expect(theme.checkboxCheckedColor).toBe("#accent");
    });

    it("should cascade checkboxPartialColor from checkboxCheckedColor", () => {
      const theme = createTheme({
        checkboxCheckedColor: "#checked",
        checkboxPartialColor: undefined as unknown as string,
      });
      expect(theme.checkboxPartialColor).toBe("#checked");
    });

    it("should not cascade when explicit value is provided", () => {
      const theme = createTheme({
        backgroundColor: "#bg",
        headerBackgroundColor: "#explicit-header",
      });
      expect(theme.headerBackgroundColor).toBe("#explicit-header");
    });
  });

  describe("withOverrides", () => {
    it("should create a new theme with overrides applied", () => {
      const base = createTheme({ backgroundColor: "#base" });
      const derived = base.withOverrides({ backgroundColor: "#derived" });

      expect(base.backgroundColor).toBe("#base");
      expect(derived.backgroundColor).toBe("#derived");
    });

    it("should preserve non-overridden values", () => {
      const base = createTheme({ backgroundColor: "#base", cellTextColor: "#text" });
      const derived = base.withOverrides({ backgroundColor: "#new" });

      expect(derived.cellTextColor).toBe("#text");
    });

    it("should return a frozen theme", () => {
      const base = createTheme();
      const derived = base.withOverrides({ backgroundColor: "#new" });
      expect(Object.isFrozen(derived)).toBe(true);
    });

    it("should re-apply cascading on the derived theme", () => {
      const base = createTheme({
        cellTextColor: "#original",
        headerTextColor: undefined as unknown as string,
      });
      expect(base.headerTextColor).toBe("#original");

      const derived = base.withOverrides({
        cellTextColor: "#updated",
        headerTextColor: undefined as unknown as string,
      });
      expect(derived.headerTextColor).toBe("#updated");
    });
  });
});
