import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ImageViewerMode = "current" | "sideBySide" | "alternate";

type ImageViewerState = {
  mode: ImageViewerMode;
  setMode: (mode: ImageViewerMode) => void;
};

export const useImageViewerStore = create<ImageViewerState>()(
  persist(
    (set) => ({
      mode: "current",
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "ai-image-edit.imageViewer",
      version: 1,
      partialize: (state) => ({ mode: state.mode }),
    },
  ),
);
