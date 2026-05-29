/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useGridTheme, useGridStyles } from "../../../themes";

type SelectOption = { value: any; label: string };

type SelectProps = {
  value?: any;
  options?: SelectOption[];
  onChange?: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  [key: string]: any;
};

export function Select({
  value,
  options = [],
  onChange,
  placeholder = "Select...",
  disabled,
}: SelectProps) {
  const { filterInput } = useGridStyles();
  const [isOpen, setIsOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      <Pressable
        onPress={() => !disabled && setIsOpen(!isOpen)}
        style={[
          filterInput.selectTrigger,
          filterInput.surface,
          disabled ? filterInput.disabled : filterInput.enabled,
        ]}
      >
        <Text
          style={[
            selected ? filterInput.inputColor : filterInput.placeholderColor,
            filterInput.fontSize14,
          ]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Text style={filterInput.placeholderColor}>&#x25BC;</Text>
      </Pressable>
      {isOpen && (
        <View style={[filterInput.dropdown, filterInput.surface]}>
          <ScrollView style={dropdownScrollStyle}>
            {options.map((opt) => (
              <Pressable
                key={String(opt.value)}
                onPress={() => {
                  onChange?.(opt.value);
                  setIsOpen(false);
                }}
                style={[
                  filterInput.option,
                  opt.value === value && filterInput.optionSelected,
                ]}
              >
                <Text style={[filterInput.inputColor, filterInput.fontSize14]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

type NumericInputProps = {
  value?: number | string | null;
  onChange?: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  [key: string]: any;
};

export function NumericInput({
  value,
  onChange,
  placeholder,
  disabled,
}: NumericInputProps) {
  const theme = useGridTheme();
  const { filterInput } = useGridStyles();

  return (
    <TextInput
      value={value != null ? String(value) : ""}
      onChangeText={(text) => {
        const num = parseFloat(text);
        onChange?.(isNaN(num) ? null : num);
      }}
      placeholder={placeholder}
      placeholderTextColor={theme.mutedTextColor}
      keyboardType="numeric"
      editable={!disabled}
      style={[
        filterInput.input,
        filterInput.surface,
        filterInput.inputColor,
        disabled ? filterInput.disabled : filterInput.enabled,
      ]}
    />
  );
}

type DatePickerInputProps = {
  value?: string | Date | null;
  onChange?: (value: Date | null) => void;
  placeholder?: string;
  mode?: "date" | "time" | "datetime";
  disabled?: boolean;
  [key: string]: any;
};

export function DatePickerInput({
  value,
  onChange,
  placeholder = "Select date...",
  disabled,
}: DatePickerInputProps) {
  const theme = useGridTheme();
  const { filterInput } = useGridStyles();
  const displayValue =
    value instanceof Date ? value.toLocaleDateString() : value ?? "";

  return (
    <TextInput
      value={String(displayValue)}
      onChangeText={(text) => {
        const date = new Date(text);
        onChange?.(isNaN(date.getTime()) ? null : date);
      }}
      placeholder={placeholder}
      placeholderTextColor={theme.mutedTextColor}
      editable={!disabled}
      style={[
        filterInput.input,
        filterInput.surface,
        filterInput.inputColor,
        disabled ? filterInput.disabled : filterInput.enabled,
      ]}
    />
  );
}

type ButtonGroupSelectProps = {
  value?: any;
  options?: { value: any; label: string }[];
  onChange?: (value: any) => void;
  disabled?: boolean;
  [key: string]: any;
};

export function ButtonGroupSelect({
  value,
  options = [],
  onChange,
  disabled,
  style,
}: ButtonGroupSelectProps) {
  const { filterInput } = useGridStyles();

  return (
    <View style={[filterInput.buttonGroup, style]}>
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => !disabled && onChange?.(opt.value)}
            style={[
              filterInput.groupButton,
              isSelected ? filterInput.groupButtonOn : filterInput.groupButtonOff,
              disabled ? filterInput.disabled : filterInput.enabled,
            ]}
          >
            <Text
              style={[
                isSelected ? filterInput.groupBtnTextOn : filterInput.inputColor,
                filterInput.fontSize12,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const dropdownScrollStyle = { maxHeight: 200 };
