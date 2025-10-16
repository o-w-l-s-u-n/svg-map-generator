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

function buildQuery(bounds: BoundsPayload) {
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

export async function POST(request: Request) {
  try {
    const { bounds, zoom, strokeScale } = (await request.json()) as {
      bounds?: BoundsPayload;
      zoom?: number;
      strokeScale?: StrokeScalePayload;
    };

    if (
      !bounds ||
      typeof bounds.north !== "number" ||
      typeof bounds.south !== "number" ||
      typeof bounds.east !== "number" ||
      typeof bounds.west !== "number"
    ) {
      return NextResponse.json({ error: "Invalid bounds payload." }, { status: 400 });
    }

    const query = buildQuery(bounds);
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
    const svg = geoJsonToSvg(geojson, bounds, {
      zoom,
      strokeScale: {
        roads: strokeScale?.roads ?? 1,
        outlines: strokeScale?.outlines ?? 1,
        water: strokeScale?.water ?? 1,
        buildings: strokeScale?.buildings ?? 1,
      },
    });

    return NextResponse.json({ svg });
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
