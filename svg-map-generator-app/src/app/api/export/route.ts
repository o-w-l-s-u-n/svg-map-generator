import { NextResponse } from "next/server";

import { geoJsonToSvg } from "@/lib/geojson-to-svg";
import osmtogeojson from "osmtogeojson";

type BoundsPayload = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type StrokeScalePayload = {
  roads?: number;
  outlines?: number;
  water?: number;
  buildings?: number;
};

function buildBoundsQuery(bounds: BoundsPayload) {
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

function buildSearchQuery(query: string) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "0",
    polygon_geojson: "0",
    limit: "1",
  });
  return params.toString();
}

export async function POST(request: Request) {
  try {
    const { bounds, zoom, strokeScale, search } = (await request.json()) as {
      bounds?: BoundsPayload;
      zoom?: number;
      strokeScale?: StrokeScalePayload;
      search?: { query?: string };
    };

    let effectiveBounds = bounds;
    let searchInfo: { displayName?: string; bounds?: BoundsPayload } | undefined;

    if (search?.query) {
      const searchResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?${buildSearchQuery(search.query)}`,
        {
          headers: {
            "User-Agent": "map-vector-forge-studio/1.0 (no-reply@example.com)",
          },
        },
      );

      if (!searchResponse.ok) {
        return NextResponse.json(
          { error: `Search error: ${searchResponse.statusText}` },
          { status: 502 },
        );
      }
      const searchResults = (await searchResponse.json()) as Array<{
        boundingbox?: [string, string, string, string];
        lat?: string;
        lon?: string;
        display_name?: string;
      }>;

      const topHit = searchResults?.[0];
      if (!topHit) {
        return NextResponse.json(
          { error: "No matching locations were found for the provided query." },
          { status: 404 },
        );
      }

      if (topHit.boundingbox && topHit.boundingbox.length === 4) {
        const [south, north, west, east] = topHit.boundingbox.map((value) =>
          Number.parseFloat(value),
        );
        if (
          [south, north, west, east].every(
            (value) => typeof value === "number" && Number.isFinite(value),
          )
        ) {
          effectiveBounds = { south, north, west, east };
          searchInfo = {
            displayName: topHit.display_name,
            bounds: effectiveBounds,
          };
        }
      }

      if (!effectiveBounds && topHit.lat && topHit.lon) {
        const lat = Number.parseFloat(topHit.lat);
        const lon = Number.parseFloat(topHit.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          const delta = 0.01;
          effectiveBounds = {
            south: lat - delta,
            north: lat + delta,
            west: lon - delta,
            east: lon + delta,
          };
          searchInfo = {
            displayName: topHit.display_name,
            bounds: effectiveBounds,
          };
        }
      }
    }

    if (
      !effectiveBounds ||
      typeof effectiveBounds.north !== "number" ||
      typeof effectiveBounds.south !== "number" ||
      typeof effectiveBounds.east !== "number" ||
      typeof effectiveBounds.west !== "number"
    ) {
      return NextResponse.json({ error: "Invalid bounds payload." }, { status: 400 });
    }

    const query = buildBoundsQuery(effectiveBounds);
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: query,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Overpass API error: ${response.statusText}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    const geojson = osmtogeojson(data);
    const svg = geoJsonToSvg(geojson, effectiveBounds, {
      zoom,
      strokeScale: {
        roads: strokeScale?.roads ?? 1,
        outlines: strokeScale?.outlines ?? 1,
        water: strokeScale?.water ?? 1,
        buildings: strokeScale?.buildings ?? 1,
      },
    });

    return NextResponse.json({ svg, bounds: effectiveBounds, searchInfo });
  } catch (error) {
    console.error("Failed to generate SVG:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while generating SVG.",
      },
      { status: 500 },
    );
  }
}
