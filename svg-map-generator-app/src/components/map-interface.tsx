"use client";

import "leaflet/dist/leaflet.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngBounds } from "leaflet";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type DownloadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; size: string };

const INITIAL_CENTER: [number, number] = [40.7128, -74.006];
const INITIAL_ZOOM = 13;
const MAX_EXPORT_AREA_DEGREES = 0.5; // Keep Overpass requests manageable

function boundsArea(bounds: Bounds) {
  return Math.abs((bounds.north - bounds.south) * (bounds.east - bounds.west));
}

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
) as typeof import("react-leaflet").MapContainer;

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
) as typeof import("react-leaflet").TileLayer;

function LatLngTracker({
  onChange,
  onZoom,
}: {
  onChange: (bounds: Bounds) => void;
  onZoom?: (zoom: number) => void;
}) {
  const { useMapEvents } = require("react-leaflet") as typeof import("react-leaflet");
  const notify = useCallback(
    (mapBounds: LatLngBounds) => {
      const northEast = mapBounds.getNorthEast();
      const southWest = mapBounds.getSouthWest();
      onChange({
        north: northEast.lat,
        east: northEast.lng,
        south: southWest.lat,
        west: southWest.lng,
      });
    },
    [onChange],
  );

  const map = useMapEvents({
    moveend: (event) => notify(event.target.getBounds()),
    zoomend: (event) => notify(event.target.getBounds()),
  });

  useEffect(() => {
    notify(map.getBounds());
    if (!onZoom) {
      return;
    }
    onZoom(map.getZoom());
    const handleZoom = () => onZoom(map.getZoom());
    map.on("zoomend", handleZoom);
    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map, notify, onZoom]);

  return null;
}

function formatBounds(bounds: Bounds | null) {
  if (!bounds) {
    return "Adjust the map to choose a region.";
  }

  return `N:${bounds.north.toFixed(5)}  S:${bounds.south.toFixed(5)}  E:${bounds.east.toFixed(
    5,
  )}  W:${bounds.west.toFixed(5)}`;
}

function formatAreaDegrees(area: number) {
  if (area < 0.0001) {
    return "<0.0001°²";
  }
  return `${area.toFixed(4)}°²`;
}

type StrokeControl = {
  roads: number;
  outlines: number;
  water: number;
  buildings: number;
};

export function MapInterface() {
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [state, setState] = useState<DownloadState>({ status: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [mapZoom, setMapZoom] = useState(INITIAL_ZOOM);
  const [strokeScale, setStrokeScale] = useState<StrokeControl>({
    roads: 1,
    outlines: 1,
    water: 1,
    buildings: 1,
  });
  const handleStrokeChange = useCallback((key: keyof StrokeControl, value: number) => {
    setStrokeScale((current) => ({
      ...current,
      [key]: value,
    }));
  }, []);
  const lastParamsRef = useRef<{ zoom: number; stroke: StrokeControl } | null>(null);
  const [previewPng, setPreviewPng] = useState<string | null>(null);
  const [previewRenderStatus, setPreviewRenderStatus] = useState<
    "idle" | "rendering" | "ready" | "error"
  >("idle");
  const [previewRenderError, setPreviewRenderError] = useState<string | null>(null);

  const area = useMemo(() => (bounds ? boundsArea(bounds) : 0), [bounds]);
  const areaIsLarge = area > MAX_EXPORT_AREA_DEGREES;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!bounds) {
      setState({ status: "error", message: "Move the map to select a region first." });
      return;
    }

    try {
      setState({ status: "loading" });
      setPreviewRenderStatus("rendering");
      setPreviewRenderError(null);

      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bounds,
          zoom: mapZoom,
          strokeScale,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to generate SVG preview.");
      }

      const { svg } = (await response.json()) as { svg: string };
      setPreview(svg);
      lastParamsRef.current = {
        zoom: mapZoom,
        stroke: { ...strokeScale },
      };
      setState({ status: "success", size: "preview" });
    } catch (error) {
      console.error(error);
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while exporting the map.",
      });
      setPreviewRenderStatus("error");
      setPreviewPng(null);
      setPreviewRenderError(
        error instanceof Error ? error.message : "Unable to generate preview.",
      );
      lastParamsRef.current = {
        zoom: mapZoom,
        stroke: { ...strokeScale },
      };
    }
  }, [bounds, mapZoom, strokeScale]);

  useEffect(() => {
    if (!preview || state.status === "loading") {
      return;
    }
    const last = lastParamsRef.current;
    const currentSignature = JSON.stringify(strokeScale);
    const lastSignature = last ? JSON.stringify(last.stroke) : null;
    if (!last || last.zoom !== mapZoom || lastSignature !== currentSignature) {
      handleGenerate();
    }
  }, [strokeScale, mapZoom, preview, handleGenerate, state.status]);

  useEffect(() => {
    if (!preview) {
      setPreviewPng(null);
      setPreviewRenderStatus("idle");
      setPreviewRenderError(null);
      return;
    }

    let cancelled = false;
    const blob = new Blob([preview], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    setPreviewRenderStatus("rendering");
    setPreviewRenderError(null);
    setPreviewPng(null);

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
        targetHeight = Math.max(1, Math.round((maxWidth / naturalWidth) * naturalHeight));
      }
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        setPreviewRenderStatus("error");
        setPreviewRenderError("Unable to render preview canvas.");
        URL.revokeObjectURL(url);
        return;
      }
      context.drawImage(img, 0, 0, targetWidth, targetHeight);
      const pngData = canvas.toDataURL("image/png");
      if (!cancelled) {
        setPreviewPng(pngData);
        setPreviewRenderStatus("ready");
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      if (!cancelled) {
        setPreviewRenderStatus("error");
        setPreviewRenderError("Unable to convert SVG preview to PNG.");
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [preview]);

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle>OpenStreetMap SVG Export</CardTitle>
        <CardDescription>
          Pan and zoom to the area you want, then download an SVG vector snapshot of the data.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="h-[420px] w-full overflow-hidden rounded-lg border">
            {isClient ? (
              <MapContainer
                center={INITIAL_CENTER}
                zoom={INITIAL_ZOOM}
                style={{ height: "100%", width: "100%" }}
                minZoom={5}
                maxZoom={19}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LatLngTracker
                  onChange={(next) => setBounds(next)}
                  onZoom={(zoomLevel) => setMapZoom(zoomLevel)}
                />
              </MapContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Loading map…
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-card/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Preview</p>
              {previewRenderStatus === "ready" && (
                <span className="text-xs text-muted-foreground">
                  {mapZoom.toFixed(2)}× zoom
                </span>
              )}
            </div>
            <div className="flex min-h-[240px] items-center justify-center overflow-hidden rounded-md border border-border bg-slate-900/95 p-4">
              {previewRenderStatus === "rendering" && (
                <p className="text-xs text-muted-foreground">Rendering PNG preview…</p>
              )}
              {previewRenderStatus === "error" && (
                <p className="text-xs text-rose-500">
                  {previewRenderError ?? "Unable to render preview."}
                </p>
              )}
              {previewRenderStatus === "ready" && previewPng && (
                <img
                  src={previewPng}
                  alt="Map preview"
                  className="max-h-[360px] w-full rounded-md object-contain shadow-sm"
                />
              )}
              {previewRenderStatus === "idle" && (
                <p className="text-xs text-muted-foreground">
                  Generate a preview to see a raster approximation of the SVG.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm leading-5 text-muted-foreground">
            <p className="font-medium text-foreground">Current bounds</p>
            <p className="font-mono text-xs text-foreground/80">{formatBounds(bounds)}</p>
            {bounds && (
              <p>
                Approximate area:{" "}
                <span className="font-medium text-foreground">{formatAreaDegrees(area)}</span>
              </p>
            )}
            {areaIsLarge && (
              <p className="text-xs text-amber-500">
                Tip: Zoom in further to avoid slow Overpass responses and enormous SVG files.
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-background/60 p-4 text-sm leading-5 text-muted-foreground">
            <div>
              <p className="text-sm font-medium text-foreground">1. Tune stroke thickness</p>
              <p className="text-xs text-muted-foreground">
                Smaller values produce finer lines; larger values create bolder strokes in the exported SVG.
              </p>
            </div>
            {([
              ["roads", "Roads"],
              ["outlines", "Outlines"],
              ["water", "Water"],
              ["buildings", "Buildings"],
            ] as Array<[keyof StrokeControl, string]>).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{label}</span>
                  <span className="font-mono text-foreground">{strokeScale[key].toFixed(2)}×</span>
                </div>
                <input
                  aria-label={`${label} stroke scale`}
                  className="h-1 w-full cursor-pointer appearance-none rounded bg-border"
                  type="range"
                  min={0.1}
                  max={3}
                  step={0.05}
                  value={strokeScale[key]}
                  onChange={(event) => handleStrokeChange(key, Number.parseFloat(event.target.value))}
                />
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-background/60 p-4 text-sm leading-5 text-muted-foreground">
            <p className="text-sm font-medium text-foreground">2. Generate a fresh preview</p>
            <Button
              className="w-full"
              disabled={!bounds || areaIsLarge || state.status === "loading"}
              onClick={handleGenerate}
            >
              {state.status === "loading" ? "Generating…" : "Generate preview"}
            </Button>
            {state.status === "error" && (
              <p className="text-xs text-rose-600">{state.message}</p>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-background/60 p-4 text-sm leading-5 text-muted-foreground">
            <p className="text-sm font-medium text-foreground">3. Download the SVG</p>
            <Button
              className="w-full"
              disabled={!preview || previewRenderStatus !== "ready"}
              onClick={() => {
                if (!preview) return;
                const blob = new Blob([preview], { type: "image/svg+xml" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "map-export.svg";
                link.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Download SVG
            </Button>
            <p className="text-xs text-muted-foreground">
              The download always uses the full-resolution SVG returned by the server.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Powered by the public Overpass API. For production use, consider hosting your own
            Overpass instance or caching requests to stay within usage policies.
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-end text-xs text-muted-foreground">
        SVG exports include roads, buildings, and points of interest present in the selected map
        window.
      </CardFooter>
    </Card>
  );
}
