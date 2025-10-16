"use client";

import "leaflet/dist/leaflet.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngBounds } from "leaflet";
import osmtogeojson from "osmtogeojson";
import type { FeatureCollection } from "geojson";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { geoJsonToSvg } from "@/lib/geojson-to-svg";

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

function boundsToBBox(bounds: Bounds) {
  return `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
}

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

async function fetchOsmAsGeoJson(bounds: Bounds) {
  const bbox = boundsToBBox(bounds);
  const query = `
[out:json][timeout:25];
(
  way["highway"](${bbox});
  relation["highway"](${bbox});
  way["building"](${bbox});
  relation["building"](${bbox});
  way["waterway"](${bbox});
  relation["waterway"](${bbox});
  way["natural"="water"](${bbox});
  relation["natural"="water"](${bbox});
);
out body;
>;
out skel qt;
`.trim();

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    body: query,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.statusText}`);
  }

  const data = await response.json();
  return osmtogeojson(data) as FeatureCollection;
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

  const area = useMemo(() => (bounds ? boundsArea(bounds) : 0), [bounds]);
  const areaIsLarge = area > MAX_EXPORT_AREA_DEGREES;

  const handleGenerate = useCallback(async () => {
    if (!bounds) {
      setState({ status: "error", message: "Move the map to select a region first." });
      return;
    }

    try {
      const geojson = await fetchOsmAsGeoJson(bounds);
      const svg = geoJsonToSvg(geojson, bounds, {
        zoom: mapZoom,
        strokeScale,
      });
      setPreview(svg);
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
    }
  }, [bounds, mapZoom, strokeScale]);

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle>OpenStreetMap SVG Export</CardTitle>
        <CardDescription>
          Pan and zoom to the area you want, then download an SVG vector snapshot of the data.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <div className="h-[420px] w-full overflow-hidden rounded-lg border">
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
          </div>
        </div>

        <div className="w-full max-w-[360px] space-y-4">
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
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">Stroke thickness</p>
              <span className="text-xs text-muted-foreground">Adjust before exporting</span>
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
            <p className="text-xs text-muted-foreground">
              Smaller values produce finer lines; larger values create bolder strokes in the exported SVG.
            </p>
          </div>

          <Button
            className="w-full"
            disabled={!bounds || areaIsLarge}
            onClick={handleGenerate}
          >
            Generate preview
          </Button>

          <div className="space-y-2 rounded-lg border border-border bg-background/60 p-4 text-sm leading-5 text-muted-foreground">
            <p className="font-medium text-foreground">Generate & download</p>
            <Button
              className="w-full"
              disabled={!preview}
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
              Adjust sliders to update the preview before downloading.
            </p>
            {state.status === "error" && (
              <p className="text-rose-600 text-xs">{state.message}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Powered by the public Overpass API. For production use, consider hosting your own
            Overpass instance or caching requests to stay within usage policies.
          </p>
        </div>
      </CardContent>
      {preview && (
        <div className="border-t border-border bg-card/70">
          <div className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Latest preview</p>
              <span className="text-xs text-muted-foreground">
                {state.status === "success" ? state.size : ""}
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-background/70">
              <div
                className="max-h-[420px] overflow-auto bg-slate-900/95 p-4"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            </div>
          </div>
        </div>
      )}
      <CardFooter className="justify-end text-xs text-muted-foreground">
        SVG exports include roads, buildings, and points of interest present in the selected map
        window.
      </CardFooter>
    </Card>
  );
}
