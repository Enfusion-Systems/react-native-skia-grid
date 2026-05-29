import { faCircleInfo } from "@fortawesome/pro-solid-svg-icons";
import * as React from "react";
import { View } from "react-native";

import { StyledFontAwesomeIcon } from "./formActionStyles";
import { useSlots } from "../../slots";
import { useGridStyles } from "../../../themes";
import type { SkiaInternalGridColumn } from "../../../core/types";

export type HeaderTooltipArgs = {
  column: SkiaInternalGridColumn | undefined;
};

export const HeaderTooltip = (args: HeaderTooltipArgs) => {
  const { column } = args;
  const { Text } = useSlots();
  const { headerTooltip } = useGridStyles();
  const tooltipValue = React.useMemo(() => column?.headerTooltip, [column]);

  return tooltipValue ? (
    <View style={headerTooltip.container}>
      <StyledFontAwesomeIcon icon={faCircleInfo} size={14} />
      <Text style={{ flex: 1 }} fontSize={12}>
        {tooltipValue}
      </Text>
    </View>
  ) : null;
};
