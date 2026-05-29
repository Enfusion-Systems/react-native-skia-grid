/* eslint-disable @typescript-eslint/no-explicit-any */
import { ICache, ICacheKey, SimpleCache } from "./cache";

type AnyFunction = (...args: any[]) => any;

export function memoize<T extends AnyFunction>(
  method: T,
  keyGetter: (...args: Parameters<T>) => ICacheKey = (...args) =>
    JSON.stringify(args),
  cache: ICache<ReturnType<T>> = new SimpleCache<ReturnType<T>>()
) {
  return ((...args: any[]) => {
    const key = keyGetter(...(args as any));
    if (cache.has(key)) return cache.get(key)!;
    const res = method(...args);
    cache.set(key, res);
    return res;
  }) as unknown as T;
}
