# Map Vector Studio Mobile

An Expo (React Native) version of Map Vector Studio. It mirrors the web app's map search, preview, and SVG export workflow, optimized for phones and tablets.

## Features
- Interactive `react-native-maps` viewport with draggable, zoomable region selection.
- Nominatim-powered place search identical to the web experience.
- SVG generation powered by the public Overpass API and the shared `geojson-to-svg` converter.
- Preview card renders the SVG inline using `react-native-svg` so you can validate the export before saving.
- Theme toggle (light/dark) and English/Russian locale switch persisted in AsyncStorage.
- One-tap export opens the native share sheet so you can “Save to Files” or send the SVG to another app.

## Getting Started

```bash
cd svg-map-generator-mobile
npm install
npm run start
```

- Press `i` or `a` in the Expo CLI to launch iOS Simulator or Android emulator.
- The app targets Expo SDK 54 / React Native 0.81.4. Ensure you have an up-to-date Expo CLI (`npm install -g expo`).

## Environment notes
- The project calls Nominatim and Overpass directly from the device. Heavy usage should respect their fair-use policies or route via a proxy.
- Export uses the system share sheet. Pick “Save to Files” (or any other destination) to keep a copy. The web build continues to fall back to downloading the raw SVG.
- SVG export uses the same `geojson-to-svg` pipeline as the web app, so tweaks can be applied in one place and reused.

## Scripts
- `npm run start` – launch the Expo dev server.
- `npm run android` / `npm run ios` – build and run on a connected device or simulator (requires prebuild + native tooling).
- `npm run web` – run the Expo web build for quick checks in a browser.

## Next steps
- Add offline caching for earlier Overpass requests to reduce repeat network calls.
- Integrate authentication or a custom backend if you need higher Overpass throughput.
