"use client";

import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { Messages } from "@/lib/i18n";
import type { DownloadState, StrokeControl } from "./types";

type ControlsColumnProps = {
  text: Messages["map"];
  formattedBounds: string;
  formattedArea: string | null;
  areaIsLarge: boolean;
  strokeScale: StrokeControl;
  onOutlineChange: (value: number) => void;
  previewStatus: "idle" | "rendering" | "ready" | "error";
  previewDirty: boolean;
  downloadDisabled: boolean;
  onDownload: () => void;
  generateDisabled: boolean;
  onGenerate: () => void;
  state: DownloadState;
};

export function ControlsColumn({
  text,
  formattedBounds,
  formattedArea,
  areaIsLarge,
  strokeScale,
  onOutlineChange,
  previewStatus,
  previewDirty,
  downloadDisabled,
  onDownload,
  generateDisabled,
  onGenerate,
  state,
}: ControlsColumnProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm leading-5 text-muted-foreground">
        <p className="font-medium text-foreground">{text.areaSection.title}</p>
        <p className="font-mono text-xs text-foreground/80">{formattedBounds}</p>
        {formattedArea && (
          <p>
            {text.areaSection.approximate}{" "}
            <span className="font-medium text-foreground">{formattedArea}</span>
          </p>
        )}
        {areaIsLarge && (
          <p className="text-xs text-amber-500">{text.areaSection.zoomTip}</p>
        )}
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-background/60 p-4 text-sm leading-5 text-muted-foreground">
        <div>
          <p className="text-sm font-medium text-foreground">
            {text.strokeHeading}
          </p>
          <p className="text-xs text-muted-foreground">
            {text.strokeDescription}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{text.outlinesLabel}</span>
            <span className="font-mono text-foreground">
              {strokeScale.outlines.toFixed(2)}×
            </span>
          </div>
          <Slider
            aria-label={text.outlinesLabel}
            min={0.1}
            max={3}
            step={0.05}
            value={[strokeScale.outlines]}
            onValueChange={(values) => {
              const [next] = values;
              if (typeof next === "number" && Number.isFinite(next)) {
                onOutlineChange(next);
              }
            }}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-background/60 p-4 text-sm leading-5 text-muted-foreground">
        <p className="text-sm font-medium text-foreground">
          {text.generateHeading}
        </p>
        <Button
          className="w-full"
          disabled={generateDisabled}
          onClick={onGenerate}
        >
          {state.status === "loading" ? text.generateButtonLoading : text.generateButton}
        </Button>
        {state.status === "error" && (
          <p className="text-xs text-rose-600">{state.message}</p>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-background/60 p-4 text-sm leading-5 text-muted-foreground">
        <p className="text-sm font-medium text-foreground">
          {text.downloadHeading}
        </p>
        <Button
          className="w-full !bg-green-500 disabled:!bg-primary"
          disabled={downloadDisabled}
          onClick={onDownload}
        >
          {text.downloadButton}
        </Button>
        <p className="text-xs text-muted-foreground">{text.downloadHint}</p>
        {previewDirty && previewStatus === "ready" && (
          <p className="text-xs text-amber-500">{text.downloadDirtyWarning}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{text.poweredBy}</p>
    </div>
  );
}
