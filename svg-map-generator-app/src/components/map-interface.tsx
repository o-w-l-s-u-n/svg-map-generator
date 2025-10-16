"use client";

import "leaflet/dist/leaflet.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import dynamic from "next/dynamic";
import type { LatLngBounds } from "leaflet";
import { Loader2, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

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
  { ssr: false }
) as typeof import("react-leaflet").MapContainer;

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
) as typeof import("react-leaflet").TileLayer;

function MapController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const { useMap } = require("react-leaflet") as typeof import("react-leaflet");
  const map = useMap();
  useEffect(() => {
    const current = map.getCenter();
    const latDiff = Math.abs(current.lat - center[0]);
    const lngDiff = Math.abs(current.lng - center[1]);
    const zoomDiff = Math.abs(map.getZoom() - zoom);
    if (latDiff > 1e-6 || lngDiff > 1e-6 || zoomDiff > 0.01) {
      map.setView(center, zoom, { animate: true });
    }
  }, [map, center, zoom]);
  return null;
}

function LatLngTracker({
  onChange,
  onZoom,
}: {
  onChange: (bounds: Bounds) => void;
  onZoom?: (zoom: number) => void;
}) {
  const { useMapEvents } =
    require("react-leaflet") as typeof import("react-leaflet");
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
    [onChange]
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

  return `N:${bounds.north.toFixed(5)}  S:${bounds.south.toFixed(
    5
  )}  E:${bounds.east.toFixed(5)}  W:${bounds.west.toFixed(5)}`;
}

function formatAreaDegrees(area: number) {
  if (area < 0.0001) {
    return "<0.0001°²";
  }
  return `${area.toFixed(4)}°²`;
}

type StrokeControl = {
  outlines: number;
};

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
  const [previewDirty, setPreviewDirty] = useState(true);
  const suppressBoundsUpdate = useRef(0);
  const handleOutlineChange = useCallback((value: number) => {
    setStrokeScale({ outlines: value });
    setPreviewDirty(true);
    setPreviewRenderStatus("idle");
    setPreviewRenderError(null);
    setPreviewPng(null);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [previewPng, setPreviewPng] = useState<string | null>(null);
  const [previewRenderStatus, setPreviewRenderStatus] = useState<
    "idle" | "rendering" | "ready" | "error"
  >("idle");
  const [previewRenderError, setPreviewRenderError] = useState<string | null>(
    null
  );

  const area = useMemo(() => (bounds ? boundsArea(bounds) : 0), [bounds]);
  const areaIsLarge = area > MAX_EXPORT_AREA_DEGREES;

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    setPreviewDirty(true);
    setPreviewRenderStatus("idle");
    setPreviewRenderError(null);
    setPreviewPng(null);
  }, []);

  const handleZoomUpdate = useCallback((zoomLevel: number) => {
    setMapZoom(zoomLevel);
    if (suppressBoundsUpdate.current > 0) {
      suppressBoundsUpdate.current -= 1;
      return;
    }
    setPreviewDirty(true);
    setPreviewRenderStatus("idle");
    setPreviewRenderError(null);
    setPreviewPng(null);
  }, []);

  const handleSearch = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const query = searchQuery.trim();
      if (!query) {
        setSearchError("Enter a place or address to search.");
        return;
      }
      try {
        setSearchLoading(true);
        setSearchError(null);
        setPreviewDirty(true);
        setPreviewRenderStatus("idle");
        setPreviewRenderError(null);
        setPreviewPng(null);
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Unable to find that location.");
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
          setPreviewDirty(true);
          setPreviewRenderStatus("idle");
          setPreviewRenderError(null);
          setPreviewPng(null);
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
          setPreviewDirty(true);
          setPreviewRenderStatus("idle");
          setPreviewRenderError(null);
          setPreviewPng(null);
        }
      } catch (error) {
        console.error(error);
        setSearchError(
          error instanceof Error
            ? error.message
            : "Unexpected error performing search."
        );
      } finally {
        setSearchLoading(false);
      }
    },
    [searchQuery]
  );

  const handleGenerate = useCallback(async () => {
    if (!bounds) {
      setState({
        status: "error",
        message: "Move the map to select a region first.",
      });
      return;
    }

    try {
      setState({ status: "loading" });
      setPreviewDirty(true);
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

      const { svg, bounds: updatedBounds } = (await response.json()) as {
        svg: string;
        bounds?: Bounds;
      };

      setPreview(svg);
      setPreviewDirty(false);
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
        error instanceof Error ? error.message : "Unable to generate preview."
      );
      setPreviewDirty(true);
    }
  }, [bounds, mapZoom, strokeScale]);

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
          Pan and zoom to the area you want, then download an SVG vector
          snapshot of the data.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="relative h-[420px] w-full overflow-hidden rounded-lg border-none">
            {isClient && (
              <div className="pointer-events-none absolute right-4 top-4 z-[500] w-full max-w-[320px]">
                <form
                  className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 shadow-lg backdrop-blur"
                  onSubmit={handleSearch}
                >
                  <input
                    className="flex-1 rounded-md border border-transparent bg-transparent text-sm text-foreground focus:outline-none"
                    placeholder="Search cities, addresses, landmarks…"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      if (searchError) {
                        setSearchError(null);
                      }
                    }}
                    disabled={searchLoading}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="h-9 w-9 rounded-full !p-0"
                    disabled={searchLoading || !searchQuery.trim()}
                    aria-label="Search the map"
                  >
                    {searchLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="sr-only">Search</span>
                  </Button>
                </form>
              </div>
            )}
            {isClient ? (
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: "100%", width: "100%" }}
                minZoom={5}
                maxZoom={19}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController center={mapCenter} zoom={mapZoom} />
                <LatLngTracker
                  onChange={handleBoundsUpdate}
                  onZoom={handleZoomUpdate}
                />
              </MapContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Loading map…
              </div>
            )}
          </div>
          {searchError && (
            <p className="text-xs text-rose-500">{searchError}</p>
          )}

          <div className="space-y-3 rounded-lg border border-border bg-card/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Preview</p>
              {previewRenderStatus === "ready" && (
                <span className="text-xs text-muted-foreground">
                  {mapZoom.toFixed(2)}× zoom
                </span>
              )}
            </div>
            <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-md border border-border">
              {previewRenderStatus === "rendering" && (
                <p className="text-xs text-muted-foreground">
                  Rendering PNG preview…
                </p>
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
                  className="max-h-[360px] w-full rounded-md object-cover"
                />
              )}
              {previewRenderStatus === "idle" && (
                <p className="text-xs text-muted-foreground">
                  Generate a preview to see a raster approximation of the SVG.
                </p>
              )}
              {previewDirty && previewRenderStatus === "ready" && (
                <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[11px] text-white">
                  Preview out of date — run "Generate preview" again.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm leading-5 text-muted-foreground">
            <p className="font-medium text-foreground">Current bounds</p>
            <p className="font-mono text-xs text-foreground/80">
              {formatBounds(bounds)}
            </p>
            {bounds && (
              <p>
                Approximate area:{" "}
                <span className="font-medium text-foreground">
                  {formatAreaDegrees(area)}
                </span>
              </p>
            )}
            {areaIsLarge && (
              <p className="text-xs text-amber-500">
                Tip: Zoom in further to avoid slow Overpass responses and
                enormous SVG files.
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-background/60 p-4 text-sm leading-5 text-muted-foreground">
            <div>
              <p className="text-sm font-medium text-foreground">
                1. Adjust outline thickness
              </p>
              <p className="text-xs text-muted-foreground">
                Use the slider to fine-tune the border weight applied to
                exported map features.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Outlines</span>
                <span className="font-mono text-foreground">
                  {strokeScale.outlines.toFixed(2)}×
                </span>
              </div>
              <Slider
                aria-label="Outlines stroke scale"
                min={0.1}
                max={3}
                step={0.05}
                value={[strokeScale.outlines]}
                onValueChange={(values) => {
                  const [next] = values;
                  if (typeof next === "number" && Number.isFinite(next)) {
                    handleOutlineChange(next);
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-background/60 p-4 text-sm leading-5 text-muted-foreground">
            <p className="text-sm font-medium text-foreground">
              2. Generate a fresh preview
            </p>
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
            <p className="text-sm font-medium text-foreground">
              3. Download the SVG
            </p>
            <Button
              className="w-full !bg-green-500 disabled:!bg-primary"
              disabled={
                !preview || previewRenderStatus !== "ready" || previewDirty
              }
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
              The download always uses the full-resolution SVG returned by the
              server.
            </p>
            {previewDirty && previewRenderStatus === "ready" && (
              <p className="text-xs text-amber-500">
                The preview changed. Generate a new preview before downloading.
              </p>
            )}
          </div>

          {/* <p className="text-xs text-muted-foreground">
            Powered by the public Overpass API. For production use, consider
            hosting your own Overpass instance or caching requests to stay
            within usage policies.
          </p> */}
        </div>
      </CardContent>
      {/* <CardFooter className="justify-end text-xs text-muted-foreground">
        SVG exports include roads, buildings, and points of interest present in
        the selected map window.
      </CardFooter> */}
    </Card>
  );
}
