/* eslint-disable @typescript-eslint/no-explicit-any */

export type ICacheKey = string | string[];

export interface ICache<T> {
  has(key: ICacheKey): boolean;
  set(key: ICacheKey, value: T): void;
  get(key: ICacheKey): T | undefined;
  delete(key: ICacheKey): boolean;
  clear(): void;
}

const getKey = (key: ICacheKey) => (Array.isArray(key) ? key[0] : key);

const DEFAULT_MAX_AGE = 60_000; // 1 minute in ms

export class SimpleCache<T = any> implements ICache<T> {
  private store = new Map<string, any>();

  public has = (key: ICacheKey) => this.store.has(getKey(key));

  public get = (key: ICacheKey) => this.store.get(getKey(key));

  public set = (key: ICacheKey, value: T) => this.store.set(getKey(key), value);

  public delete = (key: ICacheKey) => this.store.delete(getKey(key));

  public clear = () => this.store.clear();
}

export class BasicLRUCache<T = any> implements ICache<T> {
  private store = new Map<string, { d: number; v: T }>();

  private maxAge = DEFAULT_MAX_AGE;

  constructor(maxAge = DEFAULT_MAX_AGE) {
    this.maxAge = maxAge;
  }

  public has = (key: ICacheKey) => {
    const k = getKey(key);
    this.store.forEach((val, ek) => {
      if (ek !== k && Date.now() - val.d >= this.maxAge) this.store.delete(ek);
    });

    return this.store.has(k);
  };

  public get = (key: ICacheKey) => {
    const { v } = this.store.get(getKey(key))!;
    if (!this.has(key)) return undefined;
    this.set(key, v);
    return v;
  };

  public set = (key: ICacheKey, value: T) => {
    this.store.set(getKey(key), { d: Date.now(), v: value });
  };

  public delete = (key: ICacheKey) => this.store.delete(getKey(key));

  public clear = () => this.store.clear();
}
