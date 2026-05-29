/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  faArrowLeft,
  faBars,
  faPlusCircle,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import {
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGridTheme, useGridStyles, useTokens } from "../../../themes";
import { Button, ButtonProps } from "./DefaultButton";
import { BoldText, NormalFontAwesomeIcon, NormalText } from "./DefaultText";

// --- TopBarContainerCore ---

type TopBarContainerCoreProps = ViewProps & { topInset: number; noBorder: boolean };

function TopBarContainerCore({ topInset, noBorder, style, children, ...rest }: TopBarContainerCoreProps) {
  const t = useTokens();
  const { topBar } = useGridStyles();
  return (
    <View
      {...rest}
      style={[
        topBar.base,
        noBorder ? topBar.borderless : topBar.bordered,
        // topInset is device-runtime (safe area) — unavoidable inline
        { paddingTop: topInset, height: topInset + t.topBarHeight },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export const TopBarContainer: React.FC<ViewProps & { noBorder: boolean; safe: boolean }> = ({
  children,
  safe = true,
  ...props
}) => {
  const insets = useSafeAreaInsets();
  return (
    <TopBarContainerCore {...props} topInset={safe ? insets.top : 0}>
      {children}
    </TopBarContainerCore>
  );
};

// --- TopBarAction ---

type TopBarActionProps = ViewProps & { offsetRight?: number; offsetLeft?: number };

function TopBarAction({ offsetLeft = 0, offsetRight = 0, style, children, ...rest }: TopBarActionProps) {
  const t = useTokens();
  return (
    <View
      {...rest}
      style={[
        { height: t.topBarHeight, flexDirection: "row", marginLeft: offsetLeft, marginRight: offsetRight },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// --- TopBarActionButton ---

export const TopBarActionButton = React.forwardRef<View, ButtonProps>(
  function TopBarActionButton(props, ref) {
    const t = useTokens();
    return <Button ref={ref} height={t.topBarHeight} {...props} style={[styles.actionButton, props.style as ViewStyle]} />;
  }
);

// --- TopBarTitleContainer & TitleTextContainer ---

function TopBarTitleContainer({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.titleContainer, style]}>
      {children}
    </View>
  );
}

function TitleTextContainer({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.titleTextContainer, style]}>
      {children}
    </View>
  );
}

// --- TopBar ---

export const TopBar: React.FC<{
  title: string | React.ReactNode;
  onMenuClick?: VoidFunction;
  noBorder?: boolean;
  style?: StyleProp<ViewStyle>;
  onBackClick?: VoidFunction;
  onSearch?: VoidFunction;
  searchActive?: boolean;
  onNew?: VoidFunction;
  LeftActions?: React.ReactNode;
  RightActions?: React.ReactNode;
  safe?: boolean;
}> = ({
  title,
  onMenuClick,
  style,
  onBackClick,
  onSearch,
  searchActive,
  onNew,
  noBorder = false,
  safe = true,
  LeftActions,
  RightActions,
}) => {
  const insets = useSafeAreaInsets();
  const theme = useGridTheme();

  return (
    <TopBarContainer noBorder={noBorder} style={style as any} safe={safe}>
      <TopBarAction offsetLeft={insets.left === 5 ? 0 : insets.left}>
        {onBackClick ? (
          <TopBarActionButton buttonTheme="basic" onClick={onBackClick}>
            <NormalFontAwesomeIcon icon={faArrowLeft} />
          </TopBarActionButton>
        ) : null}
        {onSearch ? (
          <TopBarActionButton buttonTheme="basic" onClick={onSearch}>
            <NormalFontAwesomeIcon
              style={searchActive ? { color: theme.accentColor } : {}}
              icon={faSearch}
            />
          </TopBarActionButton>
        ) : null}
        {onNew ? (
          <TopBarActionButton buttonTheme="basic" onClick={onNew}>
            <NormalFontAwesomeIcon icon={faPlusCircle} />
          </TopBarActionButton>
        ) : null}
        {LeftActions}
      </TopBarAction>
      <TopBarTitleContainer>
        {typeof title === "string" ? (
          <TitleTextContainer>
            <NormalText>
              <BoldText numberOfLines={1}>{title}</BoldText>
            </NormalText>
          </TitleTextContainer>
        ) : (
          title
        )}
      </TopBarTitleContainer>
      <TopBarAction offsetRight={insets.right === 5 ? 0 : insets.right}>
        {RightActions}
        {onMenuClick && (
          <TopBarActionButton buttonTheme="basic" onClick={onMenuClick}>
            <NormalFontAwesomeIcon icon={faBars} />
          </TopBarActionButton>
        )}
      </TopBarAction>
    </TopBarContainer>
  );
};

export const DefaultTopBar = TopBar;

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  actionButton:       { width: 30 },
  titleContainer:     { flex: 1, paddingHorizontal: 4, alignItems: "flex-start", justifyContent: "flex-end" },
  titleTextContainer: { width: "100%", justifyContent: "center", alignItems: "center", flexDirection: "row" },
});
