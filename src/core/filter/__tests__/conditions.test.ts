import type {
  CombinedFilterModel,
  FilterModel,
} from "../../types";
import {
  FilterTypes,
  JoinOperators,
  SimpleFilterTypes,
} from "../../types";
import {
  appendEmptyConditionIfNeeded,
  makeDefaultCombinedFilter,
  removeEmptyConditions,
  resolveFilterParamDefaults,
} from "../conditions";

describe("resolveFilterParamDefaults", () => {
  it("should default defaultOption to StartsWith for text filterType", () => {
    expect(resolveFilterParamDefaults(undefined, "text")).toEqual({
      maxNumConditions: 4,
      defaultJoinOperator: JoinOperators.OR,
      defaultOption: SimpleFilterTypes.StartsWith,
    });
  });

  it("should default defaultOption to Equals for non-text filterType", () => {
    expect(resolveFilterParamDefaults(undefined, "number").defaultOption).toBe(
      SimpleFilterTypes.Equals
    );
    expect(resolveFilterParamDefaults(undefined, "date").defaultOption).toBe(
      SimpleFilterTypes.Equals
    );
  });

  it("should honor explicit maxNumConditions and overrides from filterParams", () => {
    const result = resolveFilterParamDefaults(
      {
        maxNumConditions: 2,
        defaultJoinOperator: JoinOperators.AND,
        defaultOption: SimpleFilterTypes.Contains,
      },
      "text"
    );
    expect(result).toEqual({
      maxNumConditions: 2,
      defaultJoinOperator: JoinOperators.AND,
      defaultOption: SimpleFilterTypes.Contains,
    });
  });
});

describe("makeDefaultCombinedFilter", () => {
  it("should build a single-condition CombinedFilterModel", () => {
    expect(
      makeDefaultCombinedFilter(
        "number",
        SimpleFilterTypes.Equals,
        JoinOperators.AND
      )
    ).toEqual({
      conditions: [
        { type: SimpleFilterTypes.Equals, filterType: FilterTypes.Number },
      ],
      joinOperator: JoinOperators.AND,
    });
  });

  it("should fall back to text filterType when filterType is null", () => {
    expect(
      makeDefaultCombinedFilter(
        null,
        SimpleFilterTypes.StartsWith,
        JoinOperators.OR
      ).conditions[0].filterType
    ).toBe(FilterTypes.Text);
  });
});

describe("appendEmptyConditionIfNeeded", () => {
  const opts = {
    maxNumConditions: 4,
    defaultOption: SimpleFilterTypes.Equals,
    filterType: "text" as const,
  };

  it("should append when the conditions array is empty", () => {
    const result = appendEmptyConditionIfNeeded(
      { joinOperator: JoinOperators.AND, conditions: [] },
      opts
    );
    expect(result.conditions).toHaveLength(1);
  });

  it("should append when the last condition has a non-empty filter value", () => {
    const result = appendEmptyConditionIfNeeded(
      {
        joinOperator: JoinOperators.AND,
        conditions: [
          {
            type: SimpleFilterTypes.Equals,
            filterType: FilterTypes.Text,
            filter: "abc",
          },
        ],
      },
      opts
    );
    expect(result.conditions).toHaveLength(2);
  });

  it("should append when the last condition has a non-empty filterTo value", () => {
    const result = appendEmptyConditionIfNeeded(
      {
        joinOperator: JoinOperators.AND,
        conditions: [
          {
            type: SimpleFilterTypes.InRange,
            filterType: FilterTypes.Number,
            filterTo: 10,
          },
        ],
      },
      opts
    );
    expect(result.conditions).toHaveLength(2);
  });

  it("should NOT append when last condition has both filter and filterTo empty", () => {
    const result = appendEmptyConditionIfNeeded(
      {
        joinOperator: JoinOperators.AND,
        conditions: [
          { type: SimpleFilterTypes.Equals, filterType: FilterTypes.Text },
        ],
      },
      opts
    );
    expect(result.conditions).toHaveLength(1);
  });

  it("should NOT append when last condition is Blank with empty filter (length-0 rule)", () => {
    const result = appendEmptyConditionIfNeeded(
      {
        joinOperator: JoinOperators.AND,
        conditions: [
          { type: SimpleFilterTypes.Blank, filterType: FilterTypes.Text },
        ],
      },
      opts
    );
    expect(result.conditions).toHaveLength(1);
  });

  it("should NOT append when conditions are at maxNumConditions cap", () => {
    const filled = (n: number): CombinedFilterModel => ({
      joinOperator: JoinOperators.AND,
      conditions: Array.from({ length: n }, () => ({
        type: SimpleFilterTypes.Equals,
        filterType: FilterTypes.Text,
        filter: "x",
      })),
    });
    const result = appendEmptyConditionIfNeeded(filled(4), opts);
    expect(result.conditions).toHaveLength(4);
  });

  it("should treat numeric 0 as a non-empty filter (length-truthiness rule)", () => {
    const result = appendEmptyConditionIfNeeded(
      {
        joinOperator: JoinOperators.AND,
        conditions: [
          {
            type: SimpleFilterTypes.Equals,
            filterType: FilterTypes.Number,
            filter: 0,
          },
        ],
      },
      opts
    );
    expect(result.conditions).toHaveLength(2);
  });

  it("should treat empty-string filter as empty (length-0 rule)", () => {
    const result = appendEmptyConditionIfNeeded(
      {
        joinOperator: JoinOperators.AND,
        conditions: [
          {
            type: SimpleFilterTypes.Equals,
            filterType: FilterTypes.Text,
            filter: "",
          },
        ],
      },
      opts
    );
    expect(result.conditions).toHaveLength(1);
  });

  it("should not mutate the input filter", () => {
    const input: CombinedFilterModel = {
      joinOperator: JoinOperators.AND,
      conditions: [
        {
          type: SimpleFilterTypes.Equals,
          filterType: FilterTypes.Text,
          filter: "abc",
        },
      ],
    };
    appendEmptyConditionIfNeeded(input, opts);
    expect(input.conditions).toHaveLength(1);
  });
});

describe("removeEmptyConditions", () => {
  it("should keep all conditions when all have filter values", () => {
    const conditions: FilterModel[] = [
      {
        type: SimpleFilterTypes.Equals,
        filterType: FilterTypes.Text,
        filter: "a",
      },
      {
        type: SimpleFilterTypes.Contains,
        filterType: FilterTypes.Text,
        filter: "b",
      },
    ];
    expect(removeEmptyConditions(conditions)).toEqual(conditions);
  });

  it("should drop conditions with no filter or filterTo", () => {
    const conditions: FilterModel[] = [
      {
        type: SimpleFilterTypes.Equals,
        filterType: FilterTypes.Text,
        filter: "a",
      },
      { type: SimpleFilterTypes.Equals, filterType: FilterTypes.Text },
    ];
    expect(removeEmptyConditions(conditions)).toHaveLength(1);
  });

  it("should retain Blank/NotBlank conditions even when filter is empty", () => {
    const conditions: FilterModel[] = [
      { type: SimpleFilterTypes.Blank, filterType: FilterTypes.Text },
      { type: SimpleFilterTypes.NotBlank, filterType: FilterTypes.Text },
    ];
    expect(removeEmptyConditions(conditions)).toEqual(conditions);
  });

  it("should retain conditions with filter=0 (numeric)", () => {
    const conditions: FilterModel[] = [
      {
        type: SimpleFilterTypes.Equals,
        filterType: FilterTypes.Number,
        filter: 0,
      },
    ];
    expect(removeEmptyConditions(conditions)).toEqual(conditions);
  });

  it("should drop conditions with filter=null or undefined", () => {
    const conditions: FilterModel[] = [
      {
        type: SimpleFilterTypes.Equals,
        filterType: FilterTypes.Text,
        filter: null,
      },
      { type: SimpleFilterTypes.Equals, filterType: FilterTypes.Text },
    ];
    expect(removeEmptyConditions(conditions)).toEqual([]);
  });
});
