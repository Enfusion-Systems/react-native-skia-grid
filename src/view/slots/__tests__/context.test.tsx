import * as React from "react";
import { renderHook } from "@testing-library/react-native";

import { SlotsProvider, useSlots } from "../context";
import type { GridSlots } from "../types";

const mockText = () => null;
const mockButton = () => null;

const MOCK_DEFAULTS: GridSlots = {
  Button: mockButton,
  Text: mockText,
  MutedText: mockText,
  TextInput: () => null,
  Checkbox: () => null,
  Pressable: () => null,
  TopBar: () => null,
  FormContainer: () => null,
  BottomSheet: () => null,
  ConfirmationDialog: () => null,
  Accordion: () => null,
  Icon: () => null,
  ActionButton: () => null,
  FlexView: () => null,
  FullView: () => null,
  ScrollView: () => null,
  Divider: () => null,
} as GridSlots;

describe("useSlots", () => {
  it("should throw when used outside SlotsProvider", () => {
    const { result } = renderHook(() => {
      try {
        return useSlots();
      } catch (e) {
        return e;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
  });

  it("should return defaults when provider has no overrides", () => {
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <SlotsProvider defaults={MOCK_DEFAULTS}>{children}</SlotsProvider>
    );
    const { result } = renderHook(() => useSlots(), { wrapper });
    expect(result.current.Button).toBe(mockButton);
    expect(result.current.Text).toBe(mockText);
  });

  it("should override specific slots while preserving others", () => {
    const CustomButton = () => null;
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <SlotsProvider
        defaults={MOCK_DEFAULTS}
        slots={{ Button: CustomButton as GridSlots["Button"] }}
      >
        {children}
      </SlotsProvider>
    );
    const { result } = renderHook(() => useSlots(), { wrapper });
    expect(result.current.Button).toBe(CustomButton);
    expect(result.current.Text).toBe(mockText);
  });

  it("should allow overriding multiple slots at once", () => {
    const CustomButton = () => null;
    const CustomText = () => null;
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <SlotsProvider
        defaults={MOCK_DEFAULTS}
        slots={{
          Button: CustomButton as GridSlots["Button"],
          Text: CustomText as GridSlots["Text"],
        }}
      >
        {children}
      </SlotsProvider>
    );
    const { result } = renderHook(() => useSlots(), { wrapper });
    expect(result.current.Button).toBe(CustomButton);
    expect(result.current.Text).toBe(CustomText);
    expect(result.current.MutedText).toBe(mockText);
  });
});
