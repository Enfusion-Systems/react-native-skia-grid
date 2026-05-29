/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";

const noop = () => {};

export function useRefCallback<RefType extends (...args: any[]) => any>(
  method: RefType,
  deps: React.DependencyList,
  defaultValue: RefType = noop as RefType
) {
  const callbackRef = React.useRef<RefType>(defaultValue);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  callbackRef.current = React.useCallback(method, deps);

  const calledMethod = React.useCallback(
    (...args: any[]) => callbackRef.current(...args),
    [callbackRef]
  );

  return calledMethod as RefType;
}
