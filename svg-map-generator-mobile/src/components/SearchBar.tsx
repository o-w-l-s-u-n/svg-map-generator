import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { useTheme } from "../providers/ThemeProvider";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  loading: boolean;
};

export function SearchBar({ value, onChange, onSubmit, placeholder, loading }: SearchBarProps) {
  const { palette } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <TextInput
        style={[styles.input, { color: palette.text }]}
        placeholder={placeholder}
        placeholderTextColor={palette.mutedText}
        value={value}
        onChangeText={onChange}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
      />
      <Pressable
        onPress={onSubmit}
        disabled={loading || !value.trim()}
        style={[styles.button, { borderColor: palette.border }]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={palette.accent} />
        ) : (
          <Feather name="search" size={16} color={palette.text} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
