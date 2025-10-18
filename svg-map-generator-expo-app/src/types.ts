export type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type StrokeControl = {
  outlines: number;
  roads?: number;
  water?: number;
  buildings?: number;
};

export type DownloadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; size: string };

export type PreviewStatus = "idle" | "rendering" | "ready" | "error";
