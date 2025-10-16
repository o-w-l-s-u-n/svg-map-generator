"use client";

import type { Messages } from "@/lib/i18n";
import type { PreviewController } from "@/components/use-map-preview";

type PreviewPaneProps = {
  controller: PreviewController;
  mapZoom: number;
  text: Messages["map"];
};

export function PreviewPane({ controller, mapZoom, text }: PreviewPaneProps) {
  const { status, error, png, dirty } = controller;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/70 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          {text.previewHeading}
        </p>
        {status === "ready" && (
          <span className="text-xs text-muted-foreground">
            {text.previewZoom.replace("{value}", mapZoom.toFixed(2))}
          </span>
        )}
      </div>
      <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-md border border-border">
        {status === "rendering" && (
          <p className="text-xs text-muted-foreground">
            {text.previewStatus.rendering}
          </p>
        )}
        {status === "error" && (
          <p className="text-xs text-rose-500">
            {error ?? text.previewStatus.error}
          </p>
        )}
        {status === "ready" && png && (
          <img
            src={png}
            alt={text.previewAlt}
            className="max-h-[360px] w-full rounded-md object-cover"
          />
        )}
        {status === "idle" && (
          <p className="text-xs text-muted-foreground">
            {text.previewStatus.idle}
          </p>
        )}
        {dirty && status === "ready" && (
          <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[11px] text-white">
            {text.previewOutdatedBadge}
          </div>
        )}
      </div>
    </div>
  );
}
