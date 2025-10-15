import type {
  Feature,
  FeatureCollection,
  Geometry,
  LineString,
  MultiLineString,
  MultiPolygon,
  Point,
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
  pointRadius?: number;
}

const DEFAULT_WIDTH = 1024;
const DEFAULT_POINT_RADIUS = 3;

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

function geometryToSvg(
  geometry: Geometry,
  projection: ReturnType<typeof prepareProjection>,
  pointRadius: number,
) {
  switch (geometry.type) {
    case "LineString":
      return {
        paths: lineToPath((geometry as LineString).coordinates, projection),
        polygons: "",
        points: "",
      };
    case "MultiLineString": {
      const parts = (geometry as MultiLineString).coordinates
        .map((segment) => lineToPath(segment, projection))
        .filter(Boolean);
      return { paths: parts.join(" "), polygons: "", points: "" };
    }
    case "Polygon":
      return {
        paths: "",
        polygons: polygonToPath((geometry as Polygon).coordinates, projection),
        points: "",
      };
    case "MultiPolygon": {
      const shapes = (geometry as MultiPolygon).coordinates
        .map((shape) => polygonToPath(shape, projection))
        .filter(Boolean);
      return { paths: "", polygons: shapes.join(" "), points: "" };
    }
    case "Point": {
      const [lng, lat] = (geometry as Point).coordinates;
      const [cx, cy] = toSvgPoint(lng, lat, projection);
      return {
        paths: "",
        polygons: "",
        points: `<circle cx="${cx}" cy="${cy}" r="${pointRadius}" />`,
      };
    }
    case "MultiPoint": {
      const nodes = geometry.coordinates
        .map(([lng, lat]) => {
          const [cx, cy] = toSvgPoint(lng, lat, projection);
          return `<circle cx="${cx}" cy="${cy}" r="${pointRadius}" />`;
        })
        .join("");
      return { paths: "", polygons: "", points: nodes };
    }
    default:
      return { paths: "", polygons: "", points: "" };
  }
}

function dedupeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export function geoJsonToSvg(
  featureCollection: FeatureCollection,
  bounds: Bounds,
  options: ConversionOptions = {},
) {
  const width = options.width ?? DEFAULT_WIDTH;
  const pointRadius = options.pointRadius ?? DEFAULT_POINT_RADIUS;

  const projection = prepareProjection(bounds, width);

  const pathSegments: string[] = [];
  const polygonSegments: string[] = [];
  const pointSegments: string[] = [];

  featureCollection.features.forEach((feature: Feature) => {
    const { geometry } = feature;
    if (!geometry) {
      return;
    }

    const { paths, polygons, points } = geometryToSvg(
      geometry,
      projection,
      pointRadius,
    );

    if (paths) {
      pathSegments.push(`<path d="${dedupeWhitespace(paths)}" />`);
    }

    if (polygons) {
      polygonSegments.push(`<path d="${dedupeWhitespace(polygons)}" />`);
    }

    if (points) {
      pointSegments.push(points);
    }
  });

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${projection.width.toFixed(0)}" height="${projection.height.toFixed(0)}" viewBox="0 0 ${projection.width.toFixed(2)} ${projection.height.toFixed(2)}">`,
    "<defs>",
    "<style>",
    ".geom-lines{fill:none;stroke:#555;stroke-width:1;stroke-linecap:round;stroke-linejoin:round;}",
    ".geom-polygons{fill:#9ec5fe33;stroke:#2b59c3;stroke-width:0.6;stroke-linejoin:round;}",
    ".geom-points{fill:#d9534f;stroke:#ffffff;stroke-width:0.6;}",
    "</style>",
    "</defs>",
    "<g class=\"geom-polygons\">",
    polygonSegments.join(""),
    "</g>",
    "<g class=\"geom-lines\">",
    pathSegments.join(""),
    "</g>",
    "<g class=\"geom-points\">",
    pointSegments.join(""),
    "</g>",
    "</svg>",
  ].join("");

  return svg;
}
