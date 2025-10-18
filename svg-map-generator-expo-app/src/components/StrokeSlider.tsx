import Slider from "@react-native-community/slider";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../providers/ThemeProvider";

type StrokeSliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

export function StrokeSlider({ label, value, onChange }: StrokeSliderProps) {
  const { palette } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: palette.mutedText }]}>{label}</Text>
        <Text style={[styles.value, { color: palette.text }]}>{value.toFixed(2)}×</Text>
      </View>
      <Slider
        value={value}
        minimumValue={0.1}
        maximumValue={3}
        step={0.05}
        onValueChange={onChange}
        minimumTrackTintColor={palette.accent}
        maximumTrackTintColor={palette.border}
        thumbTintColor={palette.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
  },
  value: {
    fontSize: 12,
    fontFamily: "monospace",
  },
});
