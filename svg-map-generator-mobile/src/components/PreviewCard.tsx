import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

import type { Messages } from "../lib/i18n";
import type { PreviewController } from "../hooks/useMapPreview";
import { useTheme } from "../providers/ThemeProvider";

type PreviewCardProps = {
  controller: PreviewController;
  zoom: number;
  text: Messages["map"];
};

export function PreviewCard({ controller, zoom, text }: PreviewCardProps) {
  const { palette } = useTheme();
  const { status, error, svg, dirty } = controller;

  return (
    <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>{text.previewHeading}</Text>
        {status === "ready" && (
          <Text style={[styles.zoomText, { color: palette.mutedText }]}>
            {text.previewZoom.replace("{value}", zoom.toFixed(2))}
          </Text>
        )}
      </View>
      <View style={[styles.previewArea, { borderColor: palette.border }]}>
        {status === "rendering" && (
          <Text style={[styles.previewText, { color: palette.mutedText }]}>{text.previewStatus.rendering}</Text>
        )}
        {status === "error" && (
          <Text style={[styles.previewText, { color: palette.danger }]}>{error ?? text.previewStatus.error}</Text>
        )}
        {status === "idle" && (
          <Text style={[styles.previewText, { color: palette.mutedText }]}>{text.previewStatus.idle}</Text>
        )}
        {status === "ready" && svg && <SvgXml xml={svg} width="100%" height="100%" />}
        {dirty && status === "ready" && (
          <View style={[styles.badge, { backgroundColor: palette.mapControl }]}>
            <Text style={styles.badgeText}>{text.previewOutdatedBadge}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  zoomText: {
    fontSize: 12,
  },
  previewArea: {
    minHeight: 220,
    maxHeight: 360,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewText: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  badge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    color: "#f8fafc",
  },
});
