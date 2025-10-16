import { NextResponse } from "next/server";

type SearchResult = {
  boundingbox?: [string, string, string, string];
  lat?: string;
  lon?: string;
  display_name?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Missing search query." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        q: query,
        format: "jsonv2",
        addressdetails: "0",
        polygon_geojson: "0",
        limit: "1",
      }).toString()}`,
      {
        headers: {
          "User-Agent": "map-vector-forge-studio/1.0 (no-reply@example.com)",
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Search error: ${response.statusText}` },
        { status: 502 },
      );
    }

    const results = (await response.json()) as SearchResult[];
    const topHit = results?.[0];

    if (!topHit) {
      return NextResponse.json(
        { error: "No matching locations found for the provided query." },
        { status: 404 },
      );
    }

    let bounds;
    if (topHit.boundingbox && topHit.boundingbox.length === 4) {
      const [south, north, west, east] = topHit.boundingbox.map((value) =>
        Number.parseFloat(value),
      );
      if (
        [south, north, west, east].every(
          (value) => typeof value === "number" && Number.isFinite(value),
        )
      ) {
        bounds = { south, north, west, east };
      }
    }

    const lat = topHit.lat ? Number.parseFloat(topHit.lat) : undefined;
    const lon = topHit.lon ? Number.parseFloat(topHit.lon) : undefined;
    const center =
      typeof lat === "number" && Number.isFinite(lat) && typeof lon === "number" && Number.isFinite(lon)
        ? ([lat, lon] as [number, number])
        : undefined;

    let zoom: number | undefined;
    if (bounds) {
      const south = Math.min(bounds.south, bounds.north);
      const north = Math.max(bounds.south, bounds.north);
      const west = Math.min(bounds.west, bounds.east);
      const east = Math.max(bounds.west, bounds.east);
      const latDiff = Math.abs(north - south);
      const lngDiff = Math.abs(east - west);
      zoom = Math.max(
        5,
        Math.min(19, Math.floor(12 - Math.log(Math.max(latDiff, lngDiff) + 1e-6) * 1.4)),
      );
    }

    return NextResponse.json({
      bounds,
      center,
      zoom,
      displayName: topHit.display_name,
    });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected error while searching for location.",
      },
      { status: 500 },
    );
  }
}
