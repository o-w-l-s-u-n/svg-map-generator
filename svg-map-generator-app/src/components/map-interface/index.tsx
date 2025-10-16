"use client";

import "leaflet/dist/leaflet.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/components/language-provider";
import { useMapPreview } from "@/components/use-map-preview";

import { Bounds, DownloadState, StrokeControl, ThemeMode } from "./types";
import { MapViewport } from "./map-viewport";
import { PreviewPane } from "./preview-pane";
import { ControlsColumn } from "./controls-column";

const INITIAL_CENTER: [number, number] = [40.7128, -74.006];
const INITIAL_ZOOM = 13;
const MAX_EXPORT_AREA_DEGREES = 0.5;

function boundsArea(bounds: Bounds) {
  return Math.abs((bounds.north - bounds.south) * (bounds.east - bounds.west));
}

function formatBounds(bounds: Bounds | null, fallback: string) {
  if (!bounds) {
    return fallback;
  }

  return `N:${bounds.north.toFixed(5)}  S:${bounds.south.toFixed(5)}  E:${bounds.east.toFixed(5)}  W:${bounds.west.toFixed(5)}`;
}

function formatAreaDegrees(area: number) {
  if (area < 0.0001) {
    return "<0.0001°²";
  }
  return `${area.toFixed(4)}°²`;
}

export function MapInterface() {
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [state, setState] = useState<DownloadState>({ status: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [mapZoom, setMapZoom] = useState(INITIAL_ZOOM);
  const [mapCenter, setMapCenter] = useState<[number, number]>(INITIAL_CENTER);
  const [strokeScale, setStrokeScale] = useState<StrokeControl>({
    outlines: 1,
  });
  const [theme, setTheme] = useState<ThemeMode>("light");
  const previewController = useMapPreview();
  const {
    status: previewStatus,
    dirty: previewDirty,
    invalidate: invalidatePreview,
    beginRender: beginPreviewRender,
    failRender: failPreviewRender,
    markReady: markPreviewReady,
    resetVisuals: resetPreviewVisuals,
  } = previewController;
  const suppressBoundsUpdate = useRef(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { messages } = useLanguage();
  const text = messages.map;

  const area = useMemo(() => (bounds ? boundsArea(bounds) : 0), [bounds]);
  const areaIsLarge = area > MAX_EXPORT_AREA_DEGREES;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      return;
    }
    const root = document.documentElement;
    const resolveTheme = (): ThemeMode =>
      root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    let currentTheme = resolveTheme();
    setTheme(currentTheme);

    const handleThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<ThemeMode>).detail;
      const next =
        detail === "dark" || detail === "light" ? detail : resolveTheme();
      if (next === currentTheme) {
        return;
      }
      currentTheme = next;
      setTheme(next);
      setState({ status: "idle" });
      setPreview(null);
      invalidatePreview();
    };

    window.addEventListener("mvf-theme-change", handleThemeChange);
    return () =>
      window.removeEventListener("mvf-theme-change", handleThemeChange);
  }, [invalidatePreview, isClient]);

  const handleBoundsUpdate = useCallback((next: Bounds) => {
    setBounds(next);
    const center: [number, number] = [
      (next.south + next.north) / 2,
      (next.west + next.east) / 2,
    ];
    setMapCenter(center);
    if (suppressBoundsUpdate.current > 0) {
      suppressBoundsUpdate.current -= 1;
      return;
    }
    invalidatePreview();
  }, [invalidatePreview]);

  const handleZoomUpdate = useCallback((zoomLevel: number) => {
    setMapZoom(zoomLevel);
    if (suppressBoundsUpdate.current > 0) {
      suppressBoundsUpdate.current -= 1;
      return;
    }
    invalidatePreview();
  }, [invalidatePreview]);

  const handleOutlineChange = useCallback(
    (value: number) => {
      setStrokeScale({ outlines: value });
      invalidatePreview();
    },
    [invalidatePreview]
  );

  const handleSearch = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const query = searchQuery.trim();
      if (!query) {
        setSearchError(text.searchErrors.empty);
        return;
      }
      try {
        setSearchLoading(true);
        setSearchError(null);
        invalidatePreview();
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? text.searchErrors.notFound);
        }
        const {
          bounds: foundBounds,
          center,
          zoom,
          displayName,
        } = (await response.json()) as {
          bounds?: Bounds;
          center?: [number, number];
          zoom?: number;
          displayName?: string;
        };
        if (displayName) {
          setSearchQuery(displayName);
        }
        if (foundBounds) {
          suppressBoundsUpdate.current = 4;
          setBounds(foundBounds);
          invalidatePreview();
          const south = Math.min(foundBounds.south, foundBounds.north);
          const north = Math.max(foundBounds.south, foundBounds.north);
          const west = Math.min(foundBounds.west, foundBounds.east);
          const east = Math.max(foundBounds.west, foundBounds.east);
          const computedCenter: [number, number] = [
            (south + north) / 2,
            (west + east) / 2,
          ];
          setMapCenter(center ?? computedCenter);
          if (typeof zoom === "number" && Number.isFinite(zoom)) {
            setMapZoom(zoom);
          } else {
            const latDiff = Math.abs(north - south);
            const lngDiff = Math.abs(east - west);
            const approximateZoom = Math.max(
              5,
              Math.min(
                19,
                Math.floor(
                  12 - Math.log(Math.max(latDiff, lngDiff) + 1e-6) * 1.4
                )
              )
            );
            setMapZoom(approximateZoom);
          }
        } else if (center) {
          suppressBoundsUpdate.current = 2;
          setMapCenter(center);
          invalidatePreview();
        }
      } catch (error) {
        console.error(error);
        const message =
          error instanceof Error && error.message
            ? error.message
            : text.searchErrors.unexpected;
        setSearchError(message);
      } finally {
        setSearchLoading(false);
      }
    },
    [invalidatePreview, searchQuery, text]
  );

  const handleGenerate = useCallback(async () => {
    if (!bounds) {
      setState({
        status: "error",
        message: text.errors.noBounds,
      });
      return;
    }

    try {
      setState({ status: "loading" });
      beginPreviewRender();

      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bounds,
          zoom: mapZoom,
          strokeScale,
          theme,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? text.errors.exportFailed);
      }

      const { svg } = (await response.json()) as {
        svg: string;
        bounds?: Bounds;
      };

      setPreview(svg);
      setState({ status: "success", size: "preview" });
    } catch (error) {
      console.error(error);
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : text.errors.exportGeneric,
      });
      failPreviewRender(
        error instanceof Error ? error.message : text.errors.previewFailed
      );
    }
  }, [beginPreviewRender, bounds, failPreviewRender, mapZoom, strokeScale, text, theme]);

  const handleDownload = useCallback(() => {
    if (!preview) return;
    const blob = new Blob([preview], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "map-export.svg";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [preview]);

  useEffect(() => {
    if (!preview) {
      resetPreviewVisuals();
      return;
    }

    let cancelled = false;
    const blob = new Blob([preview], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    beginPreviewRender();

    const img = new Image();
    img.onload = () => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      const naturalWidth = img.naturalWidth || img.width || 1024;
      const naturalHeight = img.naturalHeight || img.height || 768;
      const maxWidth = 720;
      let targetWidth = naturalWidth;
      let targetHeight = naturalHeight;
      if (targetWidth > maxWidth) {
        targetWidth = maxWidth;
        targetHeight = Math.max(
          1,
          Math.round((maxWidth / naturalWidth) * naturalHeight)
        );
      }
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        failPreviewRender(text.previewCanvasError);
        URL.revokeObjectURL(url);
        return;
      }
      context.drawImage(img, 0, 0, targetWidth, targetHeight);
      const pngData = canvas.toDataURL("image/png");
      if (!cancelled) {
        markPreviewReady(pngData);
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      if (!cancelled) {
        failPreviewRender(text.previewConvertError);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [beginPreviewRender, failPreviewRender, markPreviewReady, preview, resetPreviewVisuals, text]);

  const formattedBounds = formatBounds(bounds, text.boundsPrompt);
  const formattedArea = bounds ? formatAreaDegrees(area) : null;

  const generateDisabled = !bounds || areaIsLarge || state.status === "loading";
  const downloadDisabled = !preview || previewStatus !== "ready" || previewDirty;

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle>{text.title}</CardTitle>
        <CardDescription>{text.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <MapViewport
            isClient={isClient}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            searchQuery={searchQuery}
            searchLoading={searchLoading}
            onSearch={handleSearch}
            onQueryChange={setSearchQuery}
            clearSearchError={() => {
              if (searchError) {
                setSearchError(null);
              }
            }}
            onBoundsChange={handleBoundsUpdate}
            onZoomChange={handleZoomUpdate}
            text={text}
          />
          {searchError && (
            <p className="text-xs text-rose-500">{searchError}</p>
          )}
          <PreviewPane controller={previewController} mapZoom={mapZoom} text={text} />
        </div>

        <ControlsColumn
          text={text}
          formattedBounds={formattedBounds}
          formattedArea={formattedArea}
          areaIsLarge={areaIsLarge}
          strokeScale={strokeScale}
          onOutlineChange={handleOutlineChange}
          previewStatus={previewStatus}
          previewDirty={previewDirty}
          downloadDisabled={downloadDisabled}
          onDownload={handleDownload}
          generateDisabled={generateDisabled}
          onGenerate={handleGenerate}
          state={state}
        />
      </CardContent>
      <CardFooter className="justify-end text-xs text-muted-foreground">
        {text.footerNote}
      </CardFooter>
    </Card>
  );
}
