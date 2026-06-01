import { isEqualWith } from "lodash";

import type {
  ColumnGroupHeader,
  ColumnGroupPath,
  SkiaColGroupDef,
  SkiaGridColumn,
  SkiaGridColumnDef,
  SkiaInternalGridColumn,
} from "../core/types";

export function isColGroupDef<T extends Object>(
  def: SkiaGridColumnDef<T>
): def is SkiaColGroupDef<T> {
  return "children" in def && Array.isArray(def.children);
}

export function flattenColumnDefs<T extends Object>(
  defs: SkiaGridColumnDef<T>[]
): SkiaGridColumn<T>[] {
  const result: SkiaGridColumn<T>[] = [];
  for (const def of defs) {
    if (isColGroupDef(def)) result.push(...flattenColumnDefs(def.children));
    else result.push(def);
  }
  return result;
}

export function buildColumnGroupPaths<T extends Object>(
  defs: SkiaGridColumnDef<T>[]
): Map<string, ColumnGroupPath> {
  const map = new Map<string, ColumnGroupPath>();

  function walk(
    entries: SkiaGridColumnDef<T>[],
    path: { headerName: string; depth: number }[]
  ) {
    for (const def of entries) {
      if (isColGroupDef(def)) {
        walk(def.children, [
          ...path,
          { headerName: def.headerName, depth: path.length },
        ]);
      } else {
        const colId = def.colId ?? def.field;
        if (path.length > 0) map.set(colId, path);
      }
    }
  }

  walk(defs, []);
  return map;
}

export function computeColumnGroupHeaders(
  columns: SkiaInternalGridColumn[],
  columnGroupPaths: Map<string, ColumnGroupPath>
): ColumnGroupHeader[] {
  const groups: ColumnGroupHeader[] = [];
  const seen = new Map<string, ColumnGroupHeader>();

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const colId = col.colId ?? col.field;
    const groupPath = columnGroupPaths.get(colId);
    if (!groupPath) continue;

    for (const group of groupPath) {
      const key = `${group.headerName}__${group.depth}`;
      const existing = seen.get(key);

      if (existing && existing.startColIndex + existing.colSpan === i) {
        existing.colSpan += 1;
      } else {
        if (existing) groups.push({ ...existing });
        seen.set(key, {
          headerName: group.headerName,
          depth: group.depth,
          startColIndex: i,
          colSpan: 1,
        });
      }
    }
  }

  for (const header of seen.values()) {
    if (!groups.includes(header)) {
      groups.push(header);
    }
  }

  return groups;
}

export function buildColGroupDepthMap<T extends Object>(
  columnGroupHeaders: ColumnGroupHeader[],
  columns: SkiaInternalGridColumn<T>[]
): Map<string, number> {
  const res = new Map<string, number>();

  for (const group of columnGroupHeaders) {
    for (
      let i = group.startColIndex;
      i < group.startColIndex + group.colSpan;
      i++
    ) {
      const colId = columns[i].colId ?? columns[i].field;
      const prev = res.get(colId) ?? 0;
      res.set(colId, Math.max(prev, group.depth + 1));
    }
  }
  return res;
}

export function mapToInternalColumns<T extends Object>(
  columns: SkiaGridColumn<T>[],
  defaultColumnDefs?: Partial<SkiaGridColumn<T>>,
  columnTypes?: Record<string, Partial<SkiaGridColumn<T>>>
): SkiaInternalGridColumn<T>[] {
  return columns.map((i, idx) => ({
    ...defaultColumnDefs,
    ...i,
    ...(columnTypes?.[i.type as string] ?? {}),
    id: i.id ?? `${idx}`,
    __index: idx,
    __id: i.id ?? `${idx}`,
    colId: i.colId ?? i.field,
  }));
}

// Column properties a user mutates through grid interactions (resize, sort,
// pin, hide, group). On a `columnDefs` prop change these are preserved from
// the live column state — UNLESS the consumer changed the same property in
// the defs. Everything else (declarative props: name, field, renderers,
// formatters, …) always takes the new definition.
const RUNTIME_STATE_KEYS = [
  "width",
  "sort",
  "sortIndex",
  "sortByAbsoluteValue",
  "pinned",
  "hide",
  "rowGroup",
  "rowGroupIndex",
] as const;

// Durable identity for matching a column across a defs change. `colId`
// (derived from `field` by mapToInternalColumns when absent) is stable; `__id`
// can be index-based when the consumer omits explicit ids, so it's only a
// fallback.
function columnMergeKey<T extends Object>(
  col: SkiaInternalGridColumn<T>
): string {
  return col.colId ?? col.field ?? col.__id;
}

// `undefined` and `null` both mean "unset" for these optional props; treat
// them as equal so a consumer keeping a prop unset isn't mistaken for an
// intentional change that would clobber the user's live value.
function declaredEqual(a: unknown, b: unknown): boolean {
  return (a ?? null) === (b ?? null);
}

/**
 * Per-property three-way merge for reconciling a changed `columnDefs` prop
 * into live column state:
 *   - base    = the previously declared columns (what the consumer last said)
 *   - next    = the newly declared columns (what the consumer says now)
 *   - current = the manager's live columns (incl. the user's runtime gestures)
 *
 * For each runtime-state property (width/sort/pin/hide/group), the new
 * definition wins only when the consumer actually changed it in the defs
 * (`next !== base`); otherwise the user's live value is preserved. All other
 * properties take the new definition outright. Matching is by colId; genuinely
 * new columns (and columns with no live counterpart) pass through unchanged.
 */
export function mergeColumnDefsWithState<T extends Object>(
  baseDeclared: SkiaInternalGridColumn<T>[],
  nextDeclared: SkiaInternalGridColumn<T>[],
  current: SkiaInternalGridColumn<T>[]
): SkiaInternalGridColumn<T>[] {
  const baseByKey = new Map(
    baseDeclared.map((c) => [columnMergeKey(c), c] as const)
  );
  const currentByKey = new Map(
    current.map((c) => [columnMergeKey(c), c] as const)
  );

  return nextDeclared.map((next) => {
    const key = columnMergeKey(next);
    const base = baseByKey.get(key);
    const live = currentByKey.get(key);
    // Newly declared column, or no live counterpart → declared def wins as-is.
    if (!base || !live) return next;

    const merged: SkiaInternalGridColumn<T> = { ...next };
    // Indexing a column by a union of keys for a write narrows to `never` in
    // TS, so go through a string-keyed view for the per-property copy.
    const nextRec = next as Record<string, unknown>;
    const baseRec = base as Record<string, unknown>;
    const liveRec = live as Record<string, unknown>;
    const mergedRec = merged as Record<string, unknown>;
    for (const prop of RUNTIME_STATE_KEYS) {
      // Consumer left this property unchanged in the defs → keep the user's
      // live runtime value. Consumer changed it → `merged` already holds the
      // new declared value (it's spread from `next`).
      if (declaredEqual(nextRec[prop], baseRec[prop])) {
        mergedRec[prop] = liveRec[prop];
      }
    }
    return merged;
  });
}

/**
 * Value-equality for two `columnDefs` trees that treats any two functions as
 * equal. Gates `columnDefs` reconciliation: consumers routinely rebuild
 * columnDefs (with inline cellRenderer/valueGetter functions) fresh on every
 * render, and those identity-only changes must not trigger a re-sync (doing so
 * would dispatch — and re-render — on every render). Trade-off: a lone
 * function swap (e.g. a new inline cellRenderer with no other change) isn't
 * detected until the next declared change; memoize columnDefs to apply such a
 * change immediately.
 */
export function columnDefsContentEqual<T extends Object>(
  a: SkiaGridColumnDef<T>[],
  b: SkiaGridColumnDef<T>[]
): boolean {
  return isEqualWith(a, b, (av: unknown, bv: unknown) =>
    typeof av === "function" && typeof bv === "function" ? true : undefined
  );
}
