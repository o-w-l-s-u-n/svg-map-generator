export type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type StrokeControl = {
  outlines: number;
};

export type ThemeMode = "light" | "dark";

export type DownloadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; size: string };
