import * as React from "react";
import { View } from "react-native";

import { Button, ButtonProps } from "./DefaultButton";

export const QuickActionButton = React.forwardRef<View, ButtonProps>(
  function QuickActionButton(props, ref) {
    return <Button ref={ref} disabledBgColor="transparent" {...props} />;
  }
);

export const DefaultActionButton = QuickActionButton;
