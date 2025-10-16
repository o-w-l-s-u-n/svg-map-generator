import type {
  Feature,
  FeatureCollection,
  Geometry,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
} from "geojson";

type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

interface ConversionOptions {
  width?: number;
  zoom?: number;
  strokeScale?: {
    roads: number;
    outlines: number;
    water: number;
    buildings: number;
  };
}

const DEFAULT_WIDTH = 1024;
const BASE_ZOOM = 13;

type ProjectedPoint = [number, number];

function projectLngLat(lng: number, lat: number): ProjectedPoint {
  const lambda = (lng * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const x = lambda;
  const y = Math.log(Math.tan(Math.PI / 4 + phi / 2));
  return [x, y];
}

function prepareProjection(bounds: Bounds, targetWidth: number) {
  const bottomLeft = projectLngLat(bounds.west, bounds.south);
  const topRight = projectLngLat(bounds.east, bounds.north);

  const minX = bottomLeft[0];
  const minY = bottomLeft[1];
  const maxX = topRight[0];
  const maxY = topRight[1];

  const projectedWidth = Math.max(maxX - minX, Number.EPSILON);
  const scale = targetWidth / projectedWidth;
  const height = Math.max((maxY - minY) * scale, Number.EPSILON);

  return {
    width: targetWidth,
    height,
    scale,
    translateX: -minX,
    translateY: -minY,
  };
}

function toSvgPoint(
  lng: number,
  lat: number,
  projection: ReturnType<typeof prepareProjection>,
): ProjectedPoint {
  const [x, y] = projectLngLat(lng, lat);
  const px = (x + projection.translateX) * projection.scale;
  const py = projection.height - (y + projection.translateY) * projection.scale;
  return [Number(px.toFixed(2)), Number(py.toFixed(2))];
}

function lineToPath(coords: LineString["coordinates"], projection: ReturnType<typeof prepareProjection>) {
  if (!coords.length) {
    return "";
  }
  const [firstLng, firstLat] = coords[0];
  const [startX, startY] = toSvgPoint(firstLng, firstLat, projection);
  const segments: string[] = [`M${startX} ${startY}`];

  for (let i = 1; i < coords.length; i += 1) {
    const [lng, lat] = coords[i];
    const [x, y] = toSvgPoint(lng, lat, projection);
    segments.push(`L${x} ${y}`);
  }
  return segments.join(" ");
}

function polygonToPath(
  coords: Polygon["coordinates"],
  projection: ReturnType<typeof prepareProjection>,
) {
  const rings = coords
    .map((ring) => {
      const path = lineToPath(ring, projection);
      return path ? `${path} Z` : "";
    })
    .filter(Boolean);
  return rings.join(" ");
}

type ClassifiedGeometry = {
  linear: string;
  area: string;
};

function geometryToSvg(
  geometry: Geometry,
  projection: ReturnType<typeof prepareProjection>,
): ClassifiedGeometry {
  switch (geometry.type) {
    case "LineString": {
      const path = lineToPath((geometry as LineString).coordinates, projection);
      return { linear: path, area: "" };
    }
    case "MultiLineString": {
      const parts = (geometry as MultiLineString).coordinates
        .map((segment) => lineToPath(segment, projection))
        .filter(Boolean);
      return { linear: parts.join(" "), area: "" };
    }
    case "Polygon": {
      const area = polygonToPath((geometry as Polygon).coordinates, projection);
      return { linear: "", area };
    }
    case "MultiPolygon": {
      const shapes = (geometry as MultiPolygon).coordinates
        .map((shape) => polygonToPath(shape, projection))
        .filter(Boolean);
      return { linear: "", area: shapes.join(" ") };
    }
    default:
      return { linear: "", area: "" };
  }
}

function dedupeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function determineKind(feature: Feature) {
  const tags =
    (feature.properties as { tags?: Record<string, string> } | undefined)?.tags ?? {};

  if (typeof tags.highway === "string") {
    return "road";
  }

  if (typeof tags.building === "string") {
    return "building";
  }

  if (typeof tags.waterway === "string" || tags.natural === "water") {
    return "water";
  }

  return "other";
}

export function geoJsonToSvg(
  featureCollection: FeatureCollection,
  bounds: Bounds,
  options: ConversionOptions = {},
) {
  const width = options.width ?? DEFAULT_WIDTH;
  const zoom = options.zoom ?? BASE_ZOOM;
  const strokeScale = {
    roads: options.strokeScale?.roads ?? 1,
    outlines: options.strokeScale?.outlines ?? 1,
    water: options.strokeScale?.water ?? 1,
    buildings: options.strokeScale?.buildings ?? 1,
  };

  const projection = prepareProjection(bounds, width);

  const roadSegments: string[] = [];
  const waterSegments: string[] = [];
  const buildingSegments: string[] = [];
  const outlineSegments: string[] = [];

  featureCollection.features.forEach((feature: Feature) => {
    const { geometry } = feature;
    if (!geometry) {
      return;
    }

    const { linear, area } = geometryToSvg(geometry, projection);
    const kind = determineKind(feature);

    if (area) {
      const d = dedupeWhitespace(area);
      if (!d) {
        return;
      }
      const element = `<path d="${d}" />`;
      if (kind === "building") {
        buildingSegments.push(element);
      } else if (kind === "water") {
        waterSegments.push(element);
      } else {
        outlineSegments.push(element);
      }
    } else if (linear) {
      const d = dedupeWhitespace(linear);
      if (!d) {
        return;
      }
      const element = `<path d="${d}" />`;
      if (kind === "road") {
        roadSegments.push(element);
      } else if (kind === "water") {
        waterSegments.push(element);
      } else {
        outlineSegments.push(element);
      }
    }
  });

  const zoomRatio = Math.max(zoom, 1) / BASE_ZOOM;

  const scaleWidth = (base: number, min: number, max: number, multiplier: number) => {
    const scaled = base * Math.pow(zoomRatio, 1.4) * multiplier;
    return Math.min(Math.max(scaled, min), max);
  };

  const roadWidth = scaleWidth(1.6, 0.002, 3.0, strokeScale.roads);
  const outlineWidth = scaleWidth(0.8, 0.0015, 1.4, strokeScale.outlines);
  const waterStrokeWidth = scaleWidth(0.9, 0.01, 2.1, strokeScale.water);

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${projection.width.toFixed(0)}" height="${projection.height.toFixed(0)}" viewBox="0 0 ${projection.width.toFixed(2)} ${projection.height.toFixed(2)}">`,
    "<defs>",
    "<style>",
    `.layer-water{fill:#38bdf829;stroke:#38bdf8;stroke-width:${waterStrokeWidth.toFixed(2)};stroke-linejoin:round;}`,
    `.layer-buildings{fill:rgba(255,255,255,0);stroke:#1f2933;stroke-width:${(outlineWidth * 0.4 * strokeScale.buildings).toFixed(2)};stroke-linejoin:round;}`,
    `.layer-roads{fill:rgba(255,255,255,0);stroke:#1e1b4b;stroke-width:${roadWidth.toFixed(2)};stroke-linecap:round;stroke-linejoin:round;}`,
    `.layer-outlines{fill:none;stroke:#64748b;stroke-width:${outlineWidth.toFixed(2)};stroke-linecap:round;stroke-linejoin:round;}`,
    "</style>",
    "</defs>",
    "<g class=\"layer-water\">",
    waterSegments.join(""),
    "</g>",
    "<g class=\"layer-buildings\">",
    buildingSegments.join(""),
    "</g>",
    "<g class=\"layer-roads\">",
    roadSegments.join(""),
    "</g>",
    "<g class=\"layer-outlines\">",
    outlineSegments.join(""),
    "</g>",
    "</svg>",
  ].join("");

  return svg;
}
