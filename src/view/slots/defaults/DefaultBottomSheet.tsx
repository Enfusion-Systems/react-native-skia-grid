/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
import { useRefCallback } from "../../../internal/hooks";
import { forwardRef } from "../../../internal/utils";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { isNumber } from "lodash";
import * as React from "react";
import {
  Dimensions,
  Keyboard,
  LayoutChangeEvent,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { type AnimatedStyle, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SlotsContext } from "../context";
import { type GridTheme, GridThemeProvider, useGridTheme, useGridStyles, useTokens } from "../../../themes";
import { Button } from "./DefaultButton";
import { ErrorBoundary } from "./ErrorBoundary";
import { ButtonText, NormalText } from "./DefaultText";

type StylableBottomSheetProps = {
  containerStyle?: AnimatedStyle<
    Omit<
      ViewStyle,
      | "flexDirection"
      | "position"
      | "top"
      | "left"
      | "bottom"
      | "right"
      | "opacity"
      | "transform"
    >
  >;
  style?: StyleProp<
    Omit<ViewStyle, "position" | "top" | "left" | "bottom" | "right">
  >;
};

export const BottomActionModalContext = React.createContext<
  boolean | undefined
>(undefined);

export const useIsInBottomActionModal = () =>
  React.useContext(BottomActionModalContext);

export const BottomSheetHandle: React.FC<{
  onDone?: VoidFunction;
  label?: React.ReactNode;
  buttonText?: string;
}> = ({ onDone, label, buttonText = "Done" }) => {
  const t = useTokens();
  const { bottomSheet } = useGridStyles();
  return (
    <View style={[handleStyles.root, { height: t.bottomSheetHandleHeight }]}>
      {label && (
        <NormalText style={handleStyles.label} numberOfLines={1}>
          {label}
        </NormalText>
      )}
      <View style={bottomSheet.handleBar} />
      {onDone && (
        <Button
          buttonTheme="basic"
          containerStyles={handleStyles.doneContainer}
          style={[handleStyles.doneButton, { width: buttonText.length * 10 || 40 }]}
          onClick={onDone}
        >
          <ButtonText numberOfLines={1} activeColor="accentColor">
            {buttonText}
          </ButtonText>
        </Button>
      )}
    </View>
  );
};

// --- StylableBottomSheet ---

const StylableBottomSheet = forwardRef<
  BottomSheetModal,
  BottomSheetModalProps & StylableBottomSheetProps
>(function StylableBottomSheet(
  { style, containerStyle, children, ...props },
  ref
) {
  const reduceMotion = useReducedMotion();

  return (
    <BottomSheetModal
      ref={ref}
      backgroundStyle={style}
      style={containerStyle}
      animateOnMount={!reduceMotion}
      {...props}
    >
      {children}
    </BottomSheetModal>
  );
});

// --- BottomSheetContainer (Pattern B) ---

type BottomSheetContainerProps = React.ComponentProps<typeof StylableBottomSheet> & {
  background?: keyof GridTheme;
};

const BottomSheetContainer = React.forwardRef<BottomSheetModal, BottomSheetContainerProps>(
  function BottomSheetContainer({ background = "accentBackgroundColor", style, ...rest }, ref) {
    const theme = useGridTheme();
    const { bottomSheet } = useGridStyles();
    const bgStyle = background === "accentBackgroundColor"
      ? bottomSheet.defaultBg
      : { backgroundColor: theme[background as keyof GridTheme] as string };
    return (
      <StylableBottomSheet
        ref={ref}
        style={[bottomSheet.base, bgStyle, style as ViewStyle]}
        {...rest}
      />
    );
  }
);

const SNAP_OFFSET = 40;

const max = (p: number, i = 0) =>
  Math.min(Math.max(p, 0), Dimensions.get("window").height);

// Simple layout hook
function useLayout() {
  const [layout, setLayout] = React.useState<{
    width: number;
    height: number;
  } | null>(null);

  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    setLayout({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  }, []);

  return { layout, onLayout };
}

export const processPercent = (p: string | number) =>
  typeof p === "string" && p.includes("%")
    ? (Dimensions.get("window").height / 100) * Number(p.replace("%", ""))
    : Number(p);

type SnapList = number | string | Array<number | string>;

export const BottomActionModal = forwardRef<
  BottomSheetModal,
  Omit<
    BottomSheetModalProps,
    | "enablePanDownToClose"
    | "onDismiss"
    | "backdropComponent"
    | "snapPoints"
    | "onChange"
  > &
    StylableBottomSheetProps & {
      isVisible: boolean;
      onClose?: VoidFunction;
      onChange?: (index: number, snapPoints: (string | number)[]) => void;
      snapPoints?: SnapList;
      closeable?: boolean;
      closeOnClickOutside?: boolean;
      showBackdrop?: boolean;
      children?: React.ReactNode;
      background?: keyof GridTheme;
      isKeyboard?: boolean;
      fitContent?: boolean;
      disableHandle?: boolean;
      startingSnaps?: SnapList;
      endSnaps?: SnapList;
      enableDismissOnClose?: boolean;
    }
>(function BottomActionModal(
  {
    isVisible,
    onClose,
    children,
    snapPoints,
    startingSnaps,
    endSnaps,
    closeable = true,
    closeOnClickOutside = false,
    showBackdrop = false,
    isKeyboard = false,
    fitContent = false,
    disableHandle = false,
    containerStyle,
    enableDismissOnClose,
    enableDynamicSizing = false,
    onChange,
    ...modalProps
  },
  ref
) {
  const sheetRef = React.useRef<BottomSheetModal | null>(null);
  const { layout, onLayout } = useLayout();
  const safeArea = useSafeAreaInsets();
  const { width } = Dimensions.get("window");

  const snapPointsMapped = React.useMemo<Array<string | number>>(() => {
    let offset = safeArea.bottom + SNAP_OFFSET;

    let list: Array<string | number> = [];
    const add = (e: SnapList) =>
      (list = Array.isArray(e) ? [...list, ...e] : [...list, e]);

    if (typeof startingSnaps !== "undefined") add(startingSnaps);

    if (fitContent && typeof layout?.height === "number") {
      add(layout.height);
    } else if (typeof snapPoints !== "undefined") {
      add(snapPoints);
    }

    if (typeof endSnaps !== "undefined") add(endSnaps);

    if (list.length === 0) return ["1%"];

    return list.map((p, idx) =>
      max(offset + (isNumber(p) ? p : processPercent(p)), idx)
    );
  }, [
    safeArea,
    isKeyboard,
    fitContent,
    layout?.height,
    layout?.width,
    JSON.stringify(startingSnaps),
    JSON.stringify(snapPoints),
    JSON.stringify(endSnaps),
  ]);

  const handleSetRef = React.useCallback(
    (refObj: BottomSheetModal) => {
      sheetRef.current = refObj;
      if (typeof ref === "function") {
        ref(refObj);
      } else if (ref) {
        // eslint-disable-next-line no-param-reassign
        ref.current = refObj;
      }
    },
    [sheetRef, ref]
  );

  const closeModal = useRefCallback(async () => {
    Keyboard.dismiss();
    sheetRef.current?.close();
  }, []);

  React.useEffect(() => {
    if (isVisible) {
      sheetRef.current?.present();
    } else if (!isVisible) {
      closeModal();
    }
  }, [isVisible, snapPointsMapped]);

  const handleBackDropPress = useRefCallback(() => {
    if (closeOnClickOutside && closeable) {
      onClose?.();
    }
  }, [closeOnClickOutside, closeable, onClose]);

  const renderBackdrop = useRefCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        opacity={
          showBackdrop
            ? 0.5
            : closeOnClickOutside && Platform.OS === "android"
            ? 0.1
            : 0
        }
        disappearsOnIndex={showBackdrop || closeOnClickOutside ? -1 : 0}
        appearsOnIndex={showBackdrop || closeOnClickOutside ? 0 : 10}
        pressBehavior={
          closeOnClickOutside ? (closeable ? "close" : "none") : "none"
        }
        onPress={handleBackDropPress}
      />
    ),
    [closeOnClickOutside, showBackdrop, closeable]
  );

  const handleContainerChange = useRefCallback(
    (idx: number) => {
      onChange?.(idx, snapPointsMapped);
    },
    [onChange, snapPointsMapped]
  );

  // @gorhom/bottom-sheet renders in a portal, stripping all React context
  // (including GridThemeProvider and SlotsProvider), so we re-provide them here.
  const currentTheme = useGridTheme();
  const currentSlots = React.useContext(SlotsContext);

  return (
    <ErrorBoundary>
      <BottomSheetContainer
        index={isVisible ? 0 : -1}
        ref={handleSetRef}
        onDismiss={onClose}
        stackBehavior="push"
        topInset={safeArea.top + SNAP_OFFSET}
        snapPoints={snapPointsMapped}
        enablePanDownToClose={closeable}
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
        onChange={handleContainerChange}
        enableDynamicSizing={enableDynamicSizing}
        keyboardBlurBehavior="restore"
        handleStyle={
          disableHandle
            ? {
                display: "none",
                margin: 0,
                padding: 0,
                height: 0,
              }
            : undefined
        }
        containerStyle={{
          width,
          ...(containerStyle as any),
        }}
        enableDismissOnClose={enableDismissOnClose ?? true}
        {...modalProps}
      >
        <GridThemeProvider theme={currentTheme}>
          <SlotsContext.Provider value={currentSlots}>
            <BottomActionModalContext.Provider value={isVisible}>
              <BottomSheetView onLayout={onLayout}>{children}</BottomSheetView>
            </BottomActionModalContext.Provider>
          </SlotsContext.Provider>
        </GridThemeProvider>
      </BottomSheetContainer>
    </ErrorBoundary>
  );
});

export const DefaultBottomSheet = BottomActionModal;

// ─── Styles ────────────────────────────────────────────────────────────────

const handleStyles = StyleSheet.create({
  root:          { flexDirection: "row", width: "100%", overflow: "visible", alignItems: "center", justifyContent: "center", marginBottom: 5 },
  label:         { position: "absolute", top: 5, left: 10, width: "45%", textAlign: "left", lineHeight: 16 },
  doneContainer: { position: "absolute", top: -15, right: 10, width: 40 },
  doneButton:    { position: "absolute", top: 10, right: 10 },
});

