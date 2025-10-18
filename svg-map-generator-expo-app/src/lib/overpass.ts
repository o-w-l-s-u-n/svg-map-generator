import osmtogeojson from "osmtogeojson";

import { geoJsonToSvg } from "./geojson-to-svg";
import type { Bounds, StrokeControl } from "../types";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "map-vector-studio-mobile/0.1 (mobile@example.com)";

function buildBoundsQuery(bounds: Bounds) {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  return `
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
}

export async function fetchSvgForBounds({
  bounds,
  zoom,
  strokeScale,
}: {
  bounds: Bounds;
  zoom: number;
  strokeScale: StrokeControl;
}) {
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "User-Agent": USER_AGENT,
    },
    body: buildBoundsQuery(bounds),
  });

  if (!response.ok) {
    const fallback = response.statusText || "Overpass API error";
    throw new Error(fallback);
  }

  const raw = await response.json();
  const geojson = osmtogeojson(raw);

  return geoJsonToSvg(geojson, bounds, {
    zoom,
    strokeScale: {
      outlines: strokeScale.outlines ?? 1,
      roads: strokeScale.roads ?? 1,
      water: strokeScale.water ?? 1,
      buildings: strokeScale.buildings ?? 1,
    },
  });
}
