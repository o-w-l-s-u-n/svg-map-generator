import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useLanguage } from "../providers/LanguageProvider";
import { useTheme } from "../providers/ThemeProvider";

const orderedLocales = ["en", "ru"] as const;

export function HeaderActions() {
  const { theme, palette, toggleTheme } = useTheme();
  const { locale, setLocale, messages } = useLanguage();

  const nextLocale = orderedLocales[(orderedLocales.indexOf(locale) + 1) % orderedLocales.length];

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={messages.common.languageToggleAria}
        style={[styles.pillButton, { borderColor: palette.border }]}
        onPress={() => setLocale(nextLocale)}
      >
        <Text style={[styles.languageText, { color: palette.text }]}>
          {messages.common.languageShort[locale]}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={messages.common.themeToggleAria}
        style={[styles.iconButton, { borderColor: palette.border }]}
        onPress={toggleTheme}
      >
        <Feather name={theme === "light" ? "moon" : "sun"} size={18} color={palette.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pillButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  languageText: {
    fontSize: 12,
    letterSpacing: 4,
    fontWeight: "600",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
