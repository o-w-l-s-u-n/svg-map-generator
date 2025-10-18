import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  cacheDirectory,
  documentDirectory,
  writeAsStringAsync,
  deleteAsync,
  getInfoAsync,
} from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { HeaderActions } from "../components/HeaderActions";
import { PreviewCard } from "../components/PreviewCard";
import { SearchBar } from "../components/SearchBar";
import { StrokeSlider } from "../components/StrokeSlider";
import { useMapPreview } from "../hooks/useMapPreview";
import { fetchSvgForBounds } from "../lib/overpass";
import { searchPlaces } from "../lib/search";
import { useLanguage } from "../providers/LanguageProvider";
import { useTheme } from "../providers/ThemeProvider";
import type { Bounds, DownloadState, StrokeControl } from "../types";
import {
  boundsArea,
  clampBounds,
  formatAreaDegrees,
  formatBounds,
  regionToBounds,
  zoomFromRegion,
} from "../utils/geo";

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const INITIAL_REGION: Region = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

const MAX_EXPORT_AREA_DEGREES = 0.5;

export function MapScreen() {
  const mapRef = useRef<any>(null);
  const suppressRegionRef = useRef(0);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [bounds, setBounds] = useState<Bounds>(() => clampBounds(regionToBounds(INITIAL_REGION)));
  const [mapZoom, setMapZoom] = useState<number>(() => zoomFromRegion(INITIAL_REGION));
  const [strokeScale, setStrokeScale] = useState<StrokeControl>({ outlines: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<DownloadState>({ status: "idle" });

  const preview = useMapPreview();
  const { palette } = useTheme();
  const { messages } = useLanguage();

  const area = useMemo(() => boundsArea(bounds), [bounds]);
  const areaIsLarge = area > MAX_EXPORT_AREA_DEGREES;
  const isWeb = Platform.OS === "web";

  const NativeMapView = useMemo(() => {
    if (isWeb) {
      return null;
    }
    return require("react-native-maps").default;
  }, [isWeb]);

  const handleRegionChange = useCallback(
    (nextRegion: Region) => {
      if (Platform.OS === "web") {
        return;
      }
      setRegion(nextRegion);
      const nextBounds = clampBounds(regionToBounds(nextRegion));
      setBounds(nextBounds);
      setMapZoom(zoomFromRegion(nextRegion));
      if (suppressRegionRef.current > 0) {
        suppressRegionRef.current -= 1;
        return;
      }
      preview.invalidate();
      setDownloadState({ status: "idle" });
    },
    [preview],
  );

  const handleSearch = useCallback(async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchError(messages.map.searchErrors.empty);
      return;
    }
    try {
      setSearchLoading(true);
      setSearchError(null);
      const result = await searchPlaces(trimmed);
      if (!result.bounds && !result.center) {
        setSearchError(messages.map.searchErrors.notFound);
        return;
      }
      if (result.displayName) {
        setSearchQuery(result.displayName);
      }
      if (result.bounds) {
        const { north, south, east, west } = result.bounds;
        const latitude = (north + south) / 2;
        const longitude = (east + west) / 2;
        const latitudeDelta = Math.max(Math.abs(north - south), 0.01);
        const longitudeDelta = Math.max(Math.abs(east - west), 0.01);
        const targetRegion: Region = {
          latitude,
          longitude,
          latitudeDelta,
          longitudeDelta,
        };
        suppressRegionRef.current = 2;
        setRegion(targetRegion);
        setBounds(result.bounds);
        setMapZoom(result.zoom ?? zoomFromRegion(targetRegion));
        preview.invalidate();
        setDownloadState({ status: "idle" });
        if (Platform.OS !== "web") {
          mapRef.current?.animateToRegion?.(targetRegion, 600);
        }
      } else if (result.center) {
        const targetRegion: Region = {
          latitude: result.center[0],
          longitude: result.center[1],
          latitudeDelta: region.latitudeDelta,
          longitudeDelta: region.longitudeDelta,
        };
        suppressRegionRef.current = 1;
        setRegion(targetRegion);
        setBounds(clampBounds(regionToBounds(targetRegion)));
        setMapZoom(result.zoom ?? zoomFromRegion(targetRegion));
        preview.invalidate();
        setDownloadState({ status: "idle" });
        if (Platform.OS !== "web") {
          mapRef.current?.animateToRegion?.(targetRegion, 600);
        }
      }
    } catch (error) {
      console.error("Search failed", error);
      setSearchError(messages.map.searchErrors.unexpected);
    } finally {
      setSearchLoading(false);
    }
  }, [messages.map.searchErrors, preview, region.latitudeDelta, region.longitudeDelta, searchQuery]);

  const handleGenerate = useCallback(async () => {
    if (areaIsLarge) {
      setDownloadState({ status: "error", message: messages.map.areaSection.zoomTip });
      return;
    }
    try {
      setDownloadState({ status: "loading" });
      preview.beginRender();
      const svg = await fetchSvgForBounds({
        bounds,
        zoom: mapZoom,
        strokeScale,
      });
      preview.markReady(svg);
      setDownloadState({ status: "success", size: "preview" });
    } catch (error) {
      console.error("Generate failed", error);
      const message =
        error instanceof Error ? error.message : messages.map.errors.exportGeneric;
      preview.failRender(message);
      setDownloadState({ status: "error", message });
    }
  }, [areaIsLarge, bounds, mapZoom, messages.map.areaSection.zoomTip, messages.map.errors, preview, strokeScale]);

  const handleDownload = useCallback(async () => {
    if (!preview.svg) {
      return;
    }
    setDownloadState({ status: "loading" });
    let tempFileUri: string | null = null;
    try {
      if (Platform.OS === "web") {
        Alert.alert(messages.map.downloadHeading, messages.map.downloadUnavailable);
        setDownloadState({ status: "idle" });
        return;
      }

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        Alert.alert(messages.map.downloadHeading, messages.map.downloadUnavailable);
        setDownloadState({ status: "idle" });
        return;
      }

      const baseDirectory = cacheDirectory ?? documentDirectory;

      if (!baseDirectory) {
        throw new Error("File storage unavailable");
      }

      tempFileUri = `${baseDirectory}map-export-${Date.now()}.svg`;
      await writeAsStringAsync(tempFileUri, preview.svg);

      const info = await getInfoAsync(tempFileUri);
      if (!info.exists) {
        throw new Error("Failed to write SVG to storage");
      }

      await Sharing.shareAsync(tempFileUri, {
        mimeType: "image/svg+xml",
        UTI: "public.svg-image",
        dialogTitle: messages.map.downloadButton,
      });

      setDownloadState({ status: "success", size: "share" });
    } catch (error) {
      console.error("Download failed", error);
      setDownloadState({ status: "error", message: messages.map.errors.exportFailed });
      Alert.alert(messages.map.downloadHeading, messages.map.errors.exportFailed);
    } finally {
      if (tempFileUri) {
        try {
          await deleteAsync(tempFileUri, { idempotent: true });
        } catch (cleanupError) {
          console.warn("Cleanup failed for exported SVG", cleanupError);
        }
      }
    }
  }, [
    messages.map.downloadHeading,
    messages.map.downloadUnavailable,
    messages.map.errors.exportFailed,
    preview.svg,
  ]);

  const formattedBounds = formatBounds(bounds) ?? messages.map.boundsPrompt;
  const formattedArea = formatAreaDegrees(area);
  const generateDisabled =
    areaIsLarge || preview.status === "rendering" || downloadState.status === "loading";
  const downloadDisabled = !preview.svg || preview.status !== "ready" || preview.dirty;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.strapline, { color: palette.mutedText }]}>{messages.page.strapline}</Text>
            <Text style={[styles.title, { color: palette.text }]}>{messages.page.headline}</Text>
            <Text style={[styles.subtitle, { color: palette.mutedText }]}>{messages.page.description}</Text>
          </View>
          <HeaderActions />
        </View>

        <View>
          <View style={styles.mapContainer}>
            {isWeb || !NativeMapView ? (
              <View style={[StyleSheet.absoluteFill, styles.webMapFallback]}>
                <Text style={[styles.webMapTitle, { color: palette.text }]}>{messages.map.loadingMap}</Text>
                <Text style={[styles.webMapHint, { color: palette.mutedText }]}>
                  {"Open this project on iOS or Android to explore the interactive map."}
                </Text>
              </View>
            ) : (
              <NativeMapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                initialRegion={INITIAL_REGION}
                onRegionChangeComplete={handleRegionChange}
              />
            )}
            <View style={styles.searchOverlay}>
              <SearchBar
                value={searchQuery}
                onChange={(value) => {
                  setSearchQuery(value);
                  if (searchError) setSearchError(null);
                }}
                onSubmit={handleSearch}
                placeholder={messages.map.searchPlaceholder}
                loading={searchLoading}
              />
            </View>
          </View>
          {searchError && <Text style={[styles.searchError, { color: palette.danger }]}>{searchError}</Text>}
        </View>

        <PreviewCard controller={preview} zoom={mapZoom} text={messages.map} />

        <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{messages.map.areaSection.title}</Text>
          <Text style={[styles.cardMono, { color: palette.text }]}>{formattedBounds}</Text>
          <Text style={[styles.cardBody, { color: palette.mutedText }]}>
            {messages.map.areaSection.approximate} <Text style={{ color: palette.text }}>{formattedArea}</Text>
          </Text>
          {areaIsLarge && (
            <Text style={[styles.cardHint, { color: palette.danger }]}>{messages.map.areaSection.zoomTip}</Text>
          )}
        </View>

        <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{messages.map.strokeHeading}</Text>
          <Text style={[styles.cardBody, { color: palette.mutedText }]}>{messages.map.strokeDescription}</Text>
          <StrokeSlider
            label={messages.map.outlinesLabel}
            value={strokeScale.outlines}
            onChange={(value) => {
              setStrokeScale({ outlines: value });
              preview.invalidate();
              setDownloadState({ status: "idle" });
            }}
          />
        </View>

        <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface, gap: 12 }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{messages.map.generateHeading}</Text>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: palette.accent }]}
            onPress={handleGenerate}
            disabled={generateDisabled}
          >
            <Text style={[styles.primaryButtonText, { color: palette.accentText }]}>
              {preview.status === "rendering" ? messages.map.generateButtonLoading : messages.map.generateButton}
            </Text>
          </Pressable>
          {downloadState.status === "error" && (
            <Text style={[styles.cardHint, { color: palette.danger }]}>{downloadState.message}</Text>
          )}
        </View>

        <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface, gap: 12 }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{messages.map.downloadHeading}</Text>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: downloadDisabled ? palette.border : palette.success }]}
            onPress={handleDownload}
            disabled={downloadDisabled}
          >
            <Text style={[styles.primaryButtonText, { color: palette.accentText }]}>{messages.map.downloadButton}</Text>
          </Pressable>
          <Text style={[styles.cardBody, { color: palette.mutedText }]}>{messages.map.downloadHint}</Text>
          {preview.dirty && preview.status === "ready" && (
            <Text style={[styles.cardHint, { color: palette.danger }]}>{messages.map.downloadDirtyWarning}</Text>
          )}
        </View>

        <Text style={[styles.footerNote, { color: palette.mutedText }]}>{messages.map.footerNote}</Text>
        <Text style={[styles.footerPowered, { color: palette.mutedText }]}>{messages.map.poweredBy}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    alignItems: "flex-start",
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  strapline: {
    fontSize: 12,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
  mapContainer: {
    height: 360,
    borderRadius: 18,
    overflow: "hidden",
  },
  webMapFallback: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    gap: 8,
  },
  webMapTitle: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  webMapHint: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  searchOverlay: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
  },
  searchError: {
    marginTop: 8,
    fontSize: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardMono: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  cardHint: {
    fontSize: 12,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  footerNote: {
    fontSize: 12,
    lineHeight: 18,
  },
  footerPowered: {
    fontSize: 12,
    lineHeight: 18,
  },
});
