declare module "osmtogeojson" {
  import type { FeatureCollection } from "geojson";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default function osmtogeojson(osmData: any): FeatureCollection;
}
