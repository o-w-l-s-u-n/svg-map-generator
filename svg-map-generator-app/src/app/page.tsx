import { MapInterface } from "@/components/map-interface";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col ">
      <header className="w-full">
        <div className="mx-auto flex max-w-6xl items-center justify-end px-6 py-6 sm:px-10">
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-12 sm:px-10">
        <div className="flex w-full max-w-6xl flex-col items-center gap-10">
          <div className="text-center">
            <p className="text-2xl uppercase tracking-[0.4em] text-muted-foreground">
              Map Vector Studio
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold text-foreground sm:text-5xl">
              Choose any OpenStreetMap window and download it as crisp SVG.
            </h1>
            <p className="mt-4 mx-auto max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Pan, zoom, and finesse the map. When it looks right, generate a
              shareable SVG that keeps every line sharp in your design tools.
            </p>
          </div>
          <MapInterface />
        </div>
      </main>
    </div>
  );
}
