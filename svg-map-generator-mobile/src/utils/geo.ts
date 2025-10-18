import type { Region } from "react-native-maps";

import type { Bounds } from "../types";

export function regionToBounds(region: Region): Bounds {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  return {
    north: region.latitude + halfLat,
    south: region.latitude - halfLat,
    east: region.longitude + halfLng,
    west: region.longitude - halfLng,
  };
}

export function boundsArea(bounds: Bounds) {
  return Math.abs((bounds.north - bounds.south) * (bounds.east - bounds.west));
}

export function formatBounds(bounds: Bounds | null | undefined) {
  if (!bounds) {
    return null;
  }
  return `N:${bounds.north.toFixed(5)}  S:${bounds.south.toFixed(5)}  E:${bounds.east.toFixed(5)}  W:${bounds.west.toFixed(5)}`;
}

export function formatAreaDegrees(area: number) {
  if (area < 0.0001) {
    return "<0.0001°²";
  }
  return `${area.toFixed(4)}°²`;
}

export function clampBounds(bounds: Bounds): Bounds {
  return {
    north: Math.min(90, Math.max(-90, bounds.north)),
    south: Math.min(90, Math.max(-90, bounds.south)),
    east: ((bounds.east + 540) % 360) - 180,
    west: ((bounds.west + 540) % 360) - 180,
  };
}

export function zoomFromRegion(region: Region) {
  const latitudeDelta = Math.min(Math.max(region.latitudeDelta, 1e-6), 360);
  return Math.round(Math.log(360 / latitudeDelta) / Math.LN2);
}
