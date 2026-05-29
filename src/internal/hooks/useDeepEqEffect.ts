import { cloneDeep, isEqual, uniqueId } from "lodash";
import * as React from "react";

type DL = React.DependencyList;

function isDeepChange(deps: DL, refDeps: DL) {
  return deps.some((e, idx) => !isEqual(refDeps[idx], e));
}

export function useDeepEqChange(deepDeps: DL = []) {
  const ref = React.useRef<DL>([]);
  const refDepVal = React.useRef("");

  const deep = isDeepChange(deepDeps, ref.current)
    ? uniqueId()
    : refDepVal.current;
  if (refDepVal.current !== deep) ref.current = cloneDeep(deepDeps);

  refDepVal.current = deep;

  return deep;
}

export function useDeepEqEffect(
  cb: () => void | VoidFunction,
  deps: DL = [],
  deepDeps: DL = []
) {
  const deep = useDeepEqChange(deepDeps);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    return cb();
  }, [...deps, deep]);
}

export function useDeepEqMemo<T>(
  cb: () => T,
  deps: DL = [],
  deepDeps: DL = []
): T {
  const deep = useDeepEqChange(deepDeps);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => {
    return cb();
  }, [...deps, deep]);
}
