import { forwardRef } from "../../internal/utils";
import * as React from "react";

export const ColumnMenuContext = React.createContext({
  columnMenuOpen: {} as Record<string, boolean>,
  setColumnMenuOpen: (_key: string, _open: boolean) => {},
});

export type ColumnMenuContextProviderAPI = {
  setColumnMenuOpen: (key: string, open: boolean) => void;
};

export const ColumnMenuContextProvider = React.memo(
  forwardRef<
    ColumnMenuContextProviderAPI,
    React.PropsWithChildren<{ keys: Array<string> }>
  >(function ColumnMenuContextProvider({ keys, children }, ref) {
    const [columnMenuOpen, setColumnMenuState] = React.useState(() =>
      keys.reduce(
        (res, key) => ({ ...res, [key]: false }),
        {} as Record<string, boolean>
      )
    );
    const setColumnMenuOpen = React.useCallback(
      (key: string, open: boolean) => {
        setColumnMenuState((state) => ({ ...state, [key]: open }));
      },
      []
    );
    const columnMenuProviderValue = React.useMemo(
      () => ({ columnMenuOpen, setColumnMenuOpen }),
      [columnMenuOpen, setColumnMenuOpen]
    );

    React.useImperativeHandle(
      ref,
      () => ({
        setColumnMenuOpen,
      }),
      [setColumnMenuOpen]
    );

    return (
      <ColumnMenuContext.Provider value={columnMenuProviderValue}>
        {children}
      </ColumnMenuContext.Provider>
    );
  })
);
