"use client";

import { useCallback, useState } from "react";

type PreviewStatus = "idle" | "rendering" | "ready" | "error";

export type PreviewController = {
  status: PreviewStatus;
  error: string | null;
  png: string | null;
  dirty: boolean;
  invalidate: () => void;
  beginRender: () => void;
  failRender: (message: string | null) => void;
  markReady: (png: string) => void;
  resetVisuals: () => void;
};

export function useMapPreview(): PreviewController {
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [png, setPng] = useState<string | null>(null);
  const [dirty, setDirty] = useState(true);

  const resetVisuals = useCallback(() => {
    setStatus("idle");
    setError(null);
    setPng(null);
  }, []);

  const invalidate = useCallback(() => {
    setDirty(true);
    resetVisuals();
  }, [resetVisuals]);

  const beginRender = useCallback(() => {
    setDirty(true);
    setStatus("rendering");
    setError(null);
    setPng(null);
  }, []);

  const failRender = useCallback((message: string | null) => {
    setStatus("error");
    setError(message);
    setPng(null);
    setDirty(true);
  }, []);

  const markReady = useCallback((nextPng: string) => {
    setPng(nextPng);
    setStatus("ready");
    setError(null);
    setDirty(false);
  }, []);

  return {
    status,
    error,
    png,
    dirty,
    invalidate,
    beginRender,
    failRender,
    markReady,
    resetVisuals,
  };
}
