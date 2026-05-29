/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: incrementally remove per-line */
import type { SkiaInternalGridColumn } from "./column";
import type { RowNode } from "./row";

export type AggFuncParams<T extends Object> = {
  rowNode: RowNode<T>;
  colDef: SkiaInternalGridColumn<T>;
  context: any;
};

export type AggFunc<T extends Object = any> = (params: AggFuncParams<T>) => any;
