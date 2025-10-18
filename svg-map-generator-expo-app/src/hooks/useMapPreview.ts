import { useCallback, useState } from "react";

import type { PreviewStatus } from "../types";

export type PreviewController = {
  status: PreviewStatus;
  error: string | null;
  svg: string | null;
  dirty: boolean;
  invalidate: () => void;
  beginRender: () => void;
  failRender: (message: string | null) => void;
  markReady: (svg: string) => void;
};

export function useMapPreview(): PreviewController {
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(true);

  const invalidate = useCallback(() => {
    setDirty(true);
    setStatus("idle");
    setError(null);
  }, []);

  const beginRender = useCallback(() => {
    setDirty(true);
    setStatus("rendering");
    setError(null);
  }, []);

  const failRender = useCallback((message: string | null) => {
    setStatus("error");
    setError(message);
    setDirty(true);
  }, []);

  const markReady = useCallback((nextSvg: string) => {
    setSvg(nextSvg);
    setStatus("ready");
    setError(null);
    setDirty(false);
  }, []);

  return {
    status,
    error,
    svg,
    dirty,
    invalidate,
    beginRender,
    failRender,
    markReady,
  };
}
