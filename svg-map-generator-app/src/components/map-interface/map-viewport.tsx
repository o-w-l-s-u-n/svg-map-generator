"use client";

import type { FormEvent } from "react";
import dynamic from "next/dynamic";
import type { LatLngBounds } from "leaflet";
import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect } from "react";

import type { Messages } from "@/lib/i18n";
import type { Bounds } from "./types";

type MapViewportProps = {
  isClient: boolean;
  mapCenter: [number, number];
  mapZoom: number;
  searchQuery: string;
  searchLoading: boolean;
  onSearch: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onQueryChange: (value: string) => void;
  clearSearchError: () => void;
  onBoundsChange: (bounds: Bounds) => void;
  onZoomChange: (zoom: number) => void;
  text: Messages["map"];
};

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

export function MapViewport({
  isClient,
  mapCenter,
  mapZoom,
  searchQuery,
  searchLoading,
  onSearch,
  onQueryChange,
  clearSearchError,
  onBoundsChange,
  onZoomChange,
  text,
}: MapViewportProps) {
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-lg border-none">
      {isClient && (
        <div className="pointer-events-none absolute right-4 top-4 z-[500] w-full max-w-[320px]">
          <form
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 shadow-lg backdrop-blur"
            onSubmit={onSearch}
          >
            <input
              className="flex-1 rounded-md border border-transparent bg-transparent text-sm text-foreground focus:outline-none"
              placeholder={text.searchPlaceholder}
              value={searchQuery}
              onChange={(event) => {
                onQueryChange(event.target.value);
                clearSearchError();
              }}
              disabled={searchLoading}
            />
            <button
              type="submit"
              className="h-9 w-9 rounded-full border border-border bg-transparent text-foreground transition hover:bg-accent/60 disabled:pointer-events-none disabled:opacity-60"
              disabled={searchLoading || !searchQuery.trim()}
              aria-label={text.searchButtonLabel}
            >
              {searchLoading ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                <Search className="mx-auto h-4 w-4" />
              )}
              <span className="sr-only">{text.searchButtonSr}</span>
            </button>
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
          <LatLngTracker onChange={onBoundsChange} onZoom={onZoomChange} />
        </MapContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          {text.loadingMap}
        </div>
      )}
    </div>
  );
}
