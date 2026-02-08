import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex-backend/convex/_generated/api";
import type { Id } from "@repo/convex-backend/convex/_generated/dataModel";
import type { ImageWithUrl, ChainWithUrl } from "../types";

interface UseImageChainReturn {
  // State
  currentChainId: Id<"imageChains"> | null;
  showUpload: boolean;
  isUploading: boolean;

  // Data
  chain: ChainWithUrl | null | undefined;
  images: ImageWithUrl[] | undefined;
  allChains: ChainWithUrl[] | undefined;

  // Actions
  handleFileSelect: (file: File) => Promise<void>;
  handleDrop: (e: React.DragEvent) => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNewImage: () => void;
  handleSelectChain: (chainId: Id<"imageChains">) => void;
  handleDeleteLastStep: () => Promise<void>;
  handleDeleteLeafImage: (imageId: Id<"images">) => Promise<void>;
  handleDeleteChain: () => Promise<void>;

  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  // Computed
  controlsDisabled: boolean;
  uploadDisabled: boolean;
}

export function useImageChain(
  isGenerating: boolean,
  selectedImageId: Id<"images"> | null,
  setSelectedImageId: (id: Id<"images"> | null) => void
): UseImageChainReturn {
  const [currentChainId, setCurrentChainId] =
    useState<Id<"imageChains"> | null>(null);
  const [showUpload, setShowUpload] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const chain = useQuery(
    api.images.getChain,
    currentChainId ? { chainId: currentChainId } : "skip"
  ) as ChainWithUrl | null | undefined;

  const images = useQuery(
    api.images.list,
    currentChainId ? { chainId: currentChainId } : "skip"
  ) as ImageWithUrl[] | undefined;

  const allChains = useQuery(api.images.listChains) as
    | ChainWithUrl[]
    | undefined;

  // Mutations
  const createChain = useMutation(api.images.createChain);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const deleteLastStep = useMutation(api.images.deleteLastStep);
  const deleteLeafImage = useMutation(api.images.deleteLeafImage);
  const deleteChain = useMutation(api.images.deleteChain);

  // Computed
  const controlsDisabled = isGenerating;
  const uploadDisabled = isUploading;

  // Handlers
  const handleFileSelect = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const uploadUrl = await generateUploadUrl({});
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = (await uploadResponse.json()) as {
          storageId: Id<"_storage">;
        };

        const chainId = await createChain({
          name: file.name,
          originalStorageId: storageId,
        });

        setCurrentChainId(chainId);
        setShowUpload(false);
        setSelectedImageId(null);
      } catch (error) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    },
    [createChain, generateUploadUrl, setSelectedImageId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleNewImage = useCallback(() => {
    setCurrentChainId(null);
    setShowUpload(true);
    setSelectedImageId(null);
  }, [setSelectedImageId]);

  const handleSelectChain = useCallback(
    (chainId: Id<"imageChains">) => {
      setCurrentChainId(chainId);
      setShowUpload(false);
      setSelectedImageId(null);
    },
    [setSelectedImageId]
  );

  const handleDeleteLastStep = useCallback(async () => {
    if (!currentChainId || !images || images.length <= 1) return;
    if (controlsDisabled) return;
    try {
      await deleteLastStep({ chainId: currentChainId });
    } catch (error) {
      console.error("Error deleting last step:", error);
      alert("Failed to delete last step");
    }
  }, [currentChainId, images, controlsDisabled, deleteLastStep]);

  const handleDeleteLeafImage = useCallback(
    async (imageId: Id<"images">) => {
      if (!currentChainId || !images || images.length <= 1) return;
      if (controlsDisabled) return;
      try {
        await deleteLeafImage({ imageId });
        if (selectedImageId === imageId) {
          setSelectedImageId(null);
        }
      } catch (error) {
        console.error("Error deleting image:", error);
        alert("Failed to delete image: " + (error as Error).message);
      }
    },
    [
      currentChainId,
      images,
      controlsDisabled,
      deleteLeafImage,
      selectedImageId,
      setSelectedImageId,
    ]
  );

  const handleDeleteChainAction = useCallback(async () => {
    if (!currentChainId) return;
    if (controlsDisabled) return;
    const ok = window.confirm("Delete this project and reset to upload?");
    if (!ok) return;
    try {
      await deleteChain({ chainId: currentChainId });
      handleNewImage();
    } catch (error) {
      console.error("Error deleting chain:", error);
      alert("Failed to delete project");
    }
  }, [currentChainId, controlsDisabled, deleteChain, handleNewImage]);

  return {
    currentChainId,
    showUpload,
    isUploading,
    chain,
    images,
    allChains,
    handleFileSelect,
    handleDrop,
    handleFileInputChange,
    handleNewImage,
    handleSelectChain,
    handleDeleteLastStep,
    handleDeleteLeafImage,
    handleDeleteChain: handleDeleteChainAction,
    fileInputRef,
    controlsDisabled,
    uploadDisabled,
  };
}
