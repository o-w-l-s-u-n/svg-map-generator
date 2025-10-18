import type { Bounds } from "../types";

type SearchResult = {
  boundingbox?: [string, string, string, string];
  lat?: string;
  lon?: string;
  display_name?: string;
};

export type SearchResponse = {
  bounds?: Bounds;
  center?: [number, number];
  zoom?: number;
  displayName?: string;
};

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "map-vector-studio-mobile/0.1 (mobile@example.com)";

function computeZoom(bounds: Bounds) {
  const south = Math.min(bounds.south, bounds.north);
  const north = Math.max(bounds.south, bounds.north);
  const west = Math.min(bounds.west, bounds.east);
  const east = Math.max(bounds.west, bounds.east);
  const latDiff = Math.abs(north - south);
  const lngDiff = Math.abs(east - west);
  return Math.max(5, Math.min(19, Math.floor(12 - Math.log(Math.max(latDiff, lngDiff) + 1e-6) * 1.4)));
}

export async function searchPlaces(query: string): Promise<SearchResponse> {
  const url = `${NOMINATIM_ENDPOINT}?${new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "0",
    polygon_geojson: "0",
    limit: "1",
  }).toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(response.statusText || "Search failed");
  }

  const results = (await response.json()) as SearchResult[];
  const topHit = results?.[0];
  if (!topHit) {
    return {};
  }

  let bounds: Bounds | undefined;
  if (topHit.boundingbox && topHit.boundingbox.length === 4) {
    const [south, north, west, east] = topHit.boundingbox.map((value) => Number.parseFloat(value));
    if ([south, north, west, east].every((value) => Number.isFinite(value))) {
      bounds = { south, north, west, east };
    }
  }

  let center: [number, number] | undefined;
  if (topHit.lat && topHit.lon) {
    const lat = Number.parseFloat(topHit.lat);
    const lon = Number.parseFloat(topHit.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      center = [lat, lon];
    }
  }

  const zoom = bounds ? computeZoom(bounds) : undefined;

  return {
    bounds,
    center,
    zoom,
    displayName: topHit.display_name,
  };
}
