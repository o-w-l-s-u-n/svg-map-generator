import { MapInterface } from "@/components/map-interface";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 sm:px-10">
      <div className="flex w-full max-w-6xl flex-col items-center gap-10">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">
            Vector export studio
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold text-foreground sm:text-5xl">
            Choose any OpenStreetMap window and download it as crisp SVG.
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            Pan, zoom, and finesse the map. When it looks right, generate a shareable SVG that keeps
            every line sharp in your design tools.
          </p>
        </div>
        <MapInterface />
      </div>
    </div>
  );
}
