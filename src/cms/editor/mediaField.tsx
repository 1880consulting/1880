"use client";

import { createContext, useContext } from "react";
import type { MediaInfo } from "../media/types";
import type { Path } from "./doc";

/** Lets image fields deep in a block's form see the editor's images and open its picker. */
export const MediaFieldContext = createContext<{
  media: Record<string, MediaInfo>;
  choose: (path: Path) => void;
} | null>(null);

export function useMediaField() {
  const ctx = useContext(MediaFieldContext);
  if (!ctx) throw new Error("Image fields must be inside the page editor.");
  return ctx;
}
