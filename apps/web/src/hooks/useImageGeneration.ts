import { useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@repo/convex-backend/convex/_generated/api";
import type { Id } from "@repo/convex-backend/convex/_generated/dataModel";
import type { EditType, ImageWithUrl } from "../types";

interface UseImageGenerationReturn {
  // State
  isGenerating: boolean;
  activePrompt: string;
  isBatchMode: boolean;
  pendingPrompts: string[];
  manualPrompt: string;

  // Actions
  generateImage: (
    prompt: string,
    editType: EditType,
    nextZoomPercent?: number,
    nextBrightnessPercent?: number
  ) => Promise<void>;
  enqueuePrompt: (prompt: string) => void;
  handleBatchGenerate: () => Promise<void>;
  setIsBatchMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  setManualPrompt: (value: string) => void;
}

export function useImageGeneration(
  currentChainId: Id<"imageChains"> | null,
  images: ImageWithUrl[] | undefined,
  selectedImageId: Id<"images"> | null,
  getSelectedImage: () => ImageWithUrl | null
): UseImageGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string>("");
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [pendingPrompts, setPendingPrompts] = useState<string[]>([]);
  const [manualPrompt, setManualPrompt] = useState("");

  const generateNextStep = useAction(api.generateImage.generateNextStep);

  const generateImage = useCallback(
    async (
      prompt: string,
      editType: EditType,
      nextZoomPercent?: number,
      nextBrightnessPercent?: number
    ) => {
      if (!currentChainId || !images || images.length === 0) return;

      setActivePrompt(prompt);
      setIsGenerating(true);
      try {
        const sourceImage = getSelectedImage();
        if (!sourceImage) return;

        const zoomPercent = nextZoomPercent ?? sourceImage.zoomPercent ?? 100;
        const brightnessPercent =
          nextBrightnessPercent ?? sourceImage.brightnessPercent ?? 100;

        await generateNextStep({
          chainId: currentChainId,
          sourceImageId: sourceImage._id,
          prompt,
          editType,
          zoomPercent,
          brightnessPercent,
        });
        // Clear selected image to auto-select latest
        // Note: parent component should handle this
      } catch (error) {
        console.error("Error generating image:", error);
        alert("Failed to generate image: " + (error as Error).message);
      } finally {
        setIsGenerating(false);
        setActivePrompt("");
      }
    },
    [currentChainId, images, getSelectedImage, generateNextStep]
  );

  const enqueuePrompt = useCallback((prompt: string) => {
    if (!prompt.trim()) return;
    setPendingPrompts((prev) => [...prev, prompt.trim()]);
  }, []);

  const handleBatchGenerate = useCallback(async () => {
    if (!pendingPrompts.length) return;
    const combinedPrompt = pendingPrompts.join(" ");
    const sourceImage = getSelectedImage();
    const zoomPercent = sourceImage?.zoomPercent ?? 100;
    const brightnessPercent = sourceImage?.brightnessPercent ?? 100;

    await generateImage(combinedPrompt, "manual", zoomPercent, brightnessPercent);
    setPendingPrompts([]);
  }, [pendingPrompts, getSelectedImage, generateImage]);

  return {
    isGenerating,
    activePrompt,
    isBatchMode,
    pendingPrompts,
    manualPrompt,
    generateImage,
    enqueuePrompt,
    handleBatchGenerate,
    setIsBatchMode,
    setManualPrompt,
  };
}
