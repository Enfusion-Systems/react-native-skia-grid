/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRefCallback } from "../../../internal/hooks";
import type { GridTheme } from "../../../themes";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faAngleDown, faAngleRight } from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import {
  ComponentClass,
  FunctionComponent,
  useEffect,
  useState,
} from "react";
import {
  InteractionManager,
  LayoutAnimation,
  StyleProp,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";

import { useGridTheme, useTokens } from "../../../themes";
import { StyleablePressable, StyleablePressableProps } from "./DefaultPressable";
import { NormalFontAwesomeIcon, NormalText, NormalTextProps } from "./DefaultText";
import { commonStyles } from "./commonStyles";

// --- AccordionTitleInnerContainer (Pattern C) ---

function AccordionTitleInnerContainer(props: StyleablePressableProps) {
  const t = useTokens();
  return (
    <StyleablePressable
      height={t.compactControlHeight}
      pressedStyles={{ opacity: 0.7 }}
      style={[
        { width: "100%", alignItems: "center", justifyContent: "flex-start", flexDirection: "row" },
        props.style,
      ]}
      {...props}
    />
  );
}

// --- AccordionTitleText (Pattern D) ---

function AccordionTitleText({ style, ...props }: React.ComponentProps<typeof NormalText> & NormalTextProps) {
  return <NormalText style={[{ marginLeft: 10 }, style]} {...props} />;
}

// --- AccordionTitle ---

const AccordionTitle: React.FC<{
  title: string;
  open: boolean;
  onClick: VoidFunction;
  style?: StyleProp<ViewStyle>;
  titleProps?: NormalTextProps;
  iconColor?: keyof GridTheme;
  icon?: (open: boolean) => IconDefinition;
  leftIcon?: React.ReactNode;
  rightContent?: React.ReactNode;
  checkSelection?: boolean;
}> = ({
  title,
  open,
  onClick,
  style,
  titleProps,
  iconColor,
  icon = (openIcon: boolean) => (openIcon ? faAngleDown : faAngleRight),
  leftIcon,
  rightContent,
  checkSelection = false,
}) => {
  const handlePress = () => {
    InteractionManager.runAfterInteractions(() => {
      onClick();
    });
  };

  const accordionContent = () => (
    <AccordionTitleInnerContainer
      onPress={handlePress}
      style={checkSelection ? {} : style}
    >
      {!checkSelection ? leftIcon : null}
      <NormalFontAwesomeIcon activeColor={iconColor} icon={icon(open)} />
      <AccordionTitleText {...titleProps}>{title}</AccordionTitleText>
      {rightContent}
    </AccordionTitleInnerContainer>
  );

  return checkSelection ? (
    <View
      style={[
        { width: "100%", alignItems: "center", justifyContent: "flex-start", flexDirection: "row" },
        style as ViewStyle,
      ]}
    >
      {leftIcon}
      {accordionContent()}
    </View>
  ) : (
    <>{accordionContent()}</>
  );
};

export type ContentComponent<P = any> =
  | ComponentClass<P, any>
  | FunctionComponent<P>;

function useEverTrue(value: boolean) {
  const everTrueRef = React.useRef(value);

  return React.useMemo(() => {
    if (value) everTrueRef.current = true;
    return everTrueRef.current;
  }, [value]);
}

export const Accordion: React.FC<
  React.PropsWithChildren<{
    title?: string;
    defaultOpen?: boolean;
    leftIcon?: React.ReactNode;
    rightContent?: React.ReactNode;
    open?: boolean;
    last?: boolean;
    safe?: boolean;
    contentComponent?: ContentComponent;
    iconColor?: keyof GridTheme;
    icon?: (open: boolean) => IconDefinition;
    style?: StyleProp<ViewStyle>;
    titleProps?: NormalTextProps;
    onClick?: VoidFunction;
    elevate?: boolean;
    contentContainerStyle?: StyleProp<ViewStyle>;
    checkSelection?: boolean;
    keepRendered?: boolean;
    defaultRendered?: boolean;
    onOpenStateChange?: (open: boolean) => void;
    animate?: boolean;
  }>
> = React.memo(
  ({
    icon,
    iconColor,
    title = "",
    defaultOpen = false,
    leftIcon,
    last = true,
    safe = true,
    contentComponent: ContentComponent,
    style,
    titleProps,
    onClick,
    elevate = true,
    children,
    open,
    contentContainerStyle,
    rightContent,
    checkSelection = false,
    keepRendered = false,
    defaultRendered = false,
    onOpenStateChange,
    animate = true,
  }) => {
    const [isOpen, setOpenBase] = useState(open || defaultOpen);
    const everOpen = useEverTrue(
      keepRendered ? defaultRendered || isOpen : false
    );

    const setOpen = useRefCallback(
      (value: boolean) => {
        if (animate)
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpenBase(value);
        onOpenStateChange?.(value);
      },
      [setOpenBase, onOpenStateChange, animate]
    );

    useEffect(() => {
      if (typeof open !== "undefined" && open !== isOpen) {
        setOpen(open);
      }
    }, [open]);

    const handleClick = useRefCallback(() => {
      setOpen(!isOpen);
      onClick?.();
    }, [onClick, isOpen]);

    return (
      <>
        <AccordionTitle
          titleProps={titleProps}
          style={[style, elevate ? commonStyles.elevatedLow : {}]}
          iconColor={iconColor}
          icon={icon}
          title={title}
          open={isOpen}
          onClick={handleClick}
          leftIcon={leftIcon}
          rightContent={rightContent}
          checkSelection={checkSelection}
        />
        <View
          style={[
            contentContainerStyle as any,
            isOpen ? { flex: 1 } : { height: 0, overflow: "hidden" },
          ]}
        >
          {ContentComponent && (isOpen || everOpen) ? (
            <ContentComponent open={isOpen} last={last} safe={safe} />
          ) : null}
          {children}
        </View>
      </>
    );
  }
);

// AccentBarAccordion — wraps Accordion with theme-based accent bar styling
export function AccentBarAccordion(props: React.ComponentProps<typeof Accordion>) {
  const theme = useGridTheme();
  const t = useTokens();
  return (
    <Accordion
      {...props}
      style={[
        {
          backgroundColor: theme.accentBackgroundColor,
          borderColor: theme.borderColor,
          borderBottomWidth: t.borderThin,
          paddingHorizontal: 10,
        },
        props.style,
      ]}
    />
  );
}

export const DefaultAccordion = Accordion;
