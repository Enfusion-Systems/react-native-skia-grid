/* eslint-disable @typescript-eslint/ban-types */
import * as React from "react";

export type ForwardRefComponent<
  TReturnType,
  TProps = {}
> = React.NamedExoticComponent<TProps & React.RefAttributes<TReturnType>>;

export type ForwardRef = <TReturnType, TProps = {}>(
  render: (
    props: TProps,
    ref: React.ForwardedRef<TReturnType>
  ) => React.ReactNode
) => ForwardRefComponent<TReturnType, TProps>;

export const forwardRef = React.forwardRef as ForwardRef;
