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
