import * as React from "react";

import { useSlots } from "./slots";
import type { CellEditorParams } from "../core/types";

export const DefaultInputCellEditor = React.memo(
  function DefaultInputCellEditor({ value, onValueChange }: CellEditorParams) {
    const { TextInput } = useSlots();
    return (
      <TextInput
        value={value?.toString() as string}
        onChangeText={onValueChange}
        clearable
      />
    );
  }
);
