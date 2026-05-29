export type ValueOf<T> = T[keyof T];

export type AnyFunction = (...args: any[]) => any;

export type SelectOptionsType<T> = { value: T; label: string };
