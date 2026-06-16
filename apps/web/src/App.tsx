import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { UserButton, useUser } from "@clerk/clerk-react";
import { Button } from "./components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import {
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Baby,
  Circle,
  Copy,
  CornerDownRight,
  Eraser,
  Focus,
  ImagePlus,
  MoveDown,
  Sparkles,
  Square,
  Scissors,
  Shirt,
  Trash2,
  Wand2,
} from "lucide-react";
import { EditSlider } from "./components/EditSlider";
import { PositionButton } from "./components/buttons/PositionButton";
import { UploadView } from "./components/UploadView";
import {
  AuthLoadingView,
  SignedInGate,
  SignedOutView,
} from "./components/auth/AuthViews";
import { MainImageSection } from "./components/image-editor/MainImageSection";
import {
  MobileToolsPanel,
  type ReferenceTool,
} from "./components/image-editor/ToolPanels";
import { useImageChain } from "./hooks/useImageChain";
import { useImageGeneration } from "./hooks/useImageGeneration";
import { api } from "@repo/convex-backend/convex/_generated/api";
import {
  getSelectedImage,
  getLatestImage,
  buildHistoryLayout,
  buildZoomPrompt,
  buildBrightnessPrompt,
  getImageAncestorPath,
  getTooltipText,
  getImageUrl,
  navigateHistoryTree,
} from "./utils";
import { APP_SHELL_STYLE, EDIT_TYPE_ICON_MAP, PROMPTS } from "./constants";
import type { AdminChainWithUrl, Id } from "./types";
import { useImageViewerStore } from "./stores/useImageViewerStore";

function App() {
  const { isLoaded, isSignedIn: clerkSignedIn } = useUser();

  // For self-hosted Convex, we use Clerk's auth status instead of Convex's
  // because JWT validation doesn't work the same way on self-hosted
  if (!isLoaded) {
    return (
      <AuthLoadingView
        title="Connecting"
        subtitle="Confirming your session with the image workspace."
      />
    );
  }

  if (!clerkSignedIn) {
    return <SignedOutView />;
  }

  return (
    <SignedInGate>
      <ImageEditorApp />
    </SignedInGate>
  );
}

function ImageEditorApp() {
  const { user } = useUser();
  const clerkUserId = user?.id || null;

  const imageViewerMode = useImageViewerStore((s) => s.mode);
  const setImageViewerMode = useImageViewerStore((s) => s.setMode);
  const [alternateShowingOriginal, setAlternateShowingOriginal] =
    useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Fetch user credits
  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkUserId ? { clerkUserId } : "skip",
  );
  const credits = currentUser?.credits ?? 0;
  const hasCredits = credits > 0;
  const isAdmin = (currentUser?.isAdmin ?? false) === true;

  const adminChains = useQuery(
    api.images.listAllChainsAdmin,
    isAdmin && clerkUserId ? { clerkUserId, limit: 48 } : "skip",
  ) as AdminChainWithUrl[] | undefined;

  // Slider state
  const [selectedImageId, setSelectedImageId] = useState<Id<"images"> | null>(
    null,
  );
  const [zoomLevel, setZoomLevel] = useState(100);
  const [brightnessLevel, setBrightnessLevel] = useState(100);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash-image");

  // Image chain management
  const {
    currentChainId,
    showUpload,
    chain,
    images,
    allChains,
    handleDrop,
    handleFileInputChange,
    handleNewImage,
    handleSelectChain,
    handleDeleteChain,
    handleDeleteLeafImage,
    fileInputRef,
    uploadDisabled,
  } = useImageChain(false, selectedImageId, setSelectedImageId, clerkUserId);

  // Image generation management
  const {
    isGenerating,
    activePrompt,
    isBatchMode,
    pendingPrompts,
    manualPrompt,
    batchReferenceStorageId,
    generateImage,
    enqueuePrompt,
    handleBatchGenerate,
    setIsBatchMode,
    setManualPrompt,
    setPendingPrompts,
    setBatchReferenceStorageId,
  } = useImageGeneration(
    currentChainId,
    images,
    () => getSelectedImage(images, selectedImageId),
    setSelectedImageId,
    selectedModel,
    clerkUserId,
    hasCredits,
  );

  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);
  const [referenceTool, setReferenceTool] = useState<ReferenceTool>("dress_me");
  const [batchReferenceTool, setBatchReferenceTool] = useState<
    ReferenceTool | null
  >(null);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);

  const controlsDisabled = isGenerating || !hasCredits || isUploadingReference;

  // Image action states (copy/download)
  const [copyState, setCopyState] = useState<
    "idle" | "copying" | "copied" | "error"
  >("idle");
  const [downloadState, setDownloadState] = useState<
    "idle" | "downloading" | "done" | "error"
  >("idle");
  const [imageActionMessage, setImageActionMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setAlternateShowingOriginal(false);
  }, [selectedImageId, imageViewerMode]);

  useEffect(() => {
    if (!batchReferenceStorageId) {
      setBatchReferenceTool(null);
    }
  }, [batchReferenceStorageId]);

  // Sync slider state with selected image
  useEffect(() => {
    if (!images || images.length === 0) return;
    const img = getSelectedImage(images, selectedImageId);
    if (!img) return;
    setZoomLevel(img.zoomPercent ?? 100);
    setBrightnessLevel(img.brightnessPercent ?? 100);
  }, [images, selectedImageId]);

  // Auto-select latest image
  useEffect(() => {
    if (!images || images.length === 0) return;
    setSelectedImageId((prev) => {
      if (prev && images.some((img) => img._id === prev)) return prev;
      const latest = getLatestImage(images);
      return latest?._id ?? null;
    });
  }, [images]);

  // Keyboard navigation for history
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!images || images.length === 0 || controlsDisabled) return;

      // Map arrow keys to directions
      let direction: "up" | "down" | "left" | "right" | null = null;

      if (e.key === "ArrowUp") {
        direction = "up";
      } else if (e.key === "ArrowDown") {
        direction = "down";
      } else if (e.key === "ArrowLeft") {
        direction = "left";
      } else if (e.key === "ArrowRight") {
        direction = "right";
      }

      if (direction) {
        e.preventDefault();
        const newImageId = navigateHistoryTree(
          selectedImageId,
          images,
          direction,
        );
        if (newImageId) {
          setSelectedImageId(newImageId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedImageId, images, controlsDisabled]);

  // Reset image action states when image changes
  useEffect(() => {
    const currentImage = getSelectedImage(images, selectedImageId);
    if (!currentImage) return;
    setCopyState("idle");
    setDownloadState("idle");
    setImageActionMessage(null);
  }, [selectedImageId, images]);

  // Show upload view when no chain selected
  if (showUpload || !currentChainId || !images || images.length === 0) {
    return (
      <UploadView
        allChains={allChains}
        adminChains={adminChains}
        isAdmin={isAdmin}
        uploadDisabled={uploadDisabled}
        credits={credits}
        fileInputRef={fileInputRef}
        onDrop={handleDrop}
        onFileInputChange={handleFileInputChange}
        onSelectChain={handleSelectChain}
      />
    );
  }

  const currentImage = getSelectedImage(images, selectedImageId);
  if (!currentImage) {
    return null;
  }

  const isOwner = (chain?.userId ?? null) === (clerkUserId ?? null);

  const originalImage =
    images.find((img) => img.stepNumber === 0) ?? currentImage;
  const canCompareWithOriginal = originalImage._id !== currentImage._id;

  const latestImage = getLatestImage(images);
  const latestStepNumber = latestImage?.stepNumber ?? 0;

  const currentImageSrc = currentImage.url
    ? getImageUrl(currentImage.url, currentImage.createdAt)
    : "";

  const showImageActionMessage = (message: string) => {
    setImageActionMessage(message);
    window.setTimeout(() => {
      setImageActionMessage(null);
    }, 1800);
  };

  const uploadReferenceImage = async (file: File): Promise<Id<"_storage">> => {
    if (!clerkUserId) {
      throw new Error("Not authenticated");
    }
    const uploadUrl = await generateUploadUrl({ clerkUserId });
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
    return storageId;
  };

  const handleShareLink = async () => {
    if (!currentChainId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("chainId", String(currentChainId));
    const text = url.toString();
    try {
      await navigator.clipboard.writeText(text);
      showImageActionMessage("Copied share link");
    } catch (error) {
      console.error("Share failed:", error);
      // Fallback that works even when clipboard is blocked.
      window.prompt("Copy this link:", text);
    }
  };

  const handleCopyCurrentImage = async () => {
    // Get the image URL directly from currentImage at click time
    const currentImageSrcForCopy = currentImage.url
      ? getImageUrl(currentImage.url, currentImage.createdAt)
      : "";

    if (!currentImageSrcForCopy) return;

    // Check if we're in sideBySide mode and have an original image to include
    const isSideBySideMode = imageViewerMode === "sideBySide";
    const originalImageSrc = originalImage.url
      ? getImageUrl(originalImage.url, originalImage.createdAt)
      : "";
    const shouldCombineImages =
      isSideBySideMode &&
      originalImageSrc &&
      originalImage._id !== currentImage._id;

    setCopyState("copying");
    try {
      // Load current image
      const currentImg = new Image();
      currentImg.crossOrigin = "anonymous";

      const currentLoadPromise = new Promise<void>((resolve, reject) => {
        currentImg.onload = () => resolve();
        currentImg.onerror = () =>
          reject(new Error("Failed to load current image"));
      });

      currentImg.src = currentImageSrcForCopy;
      await currentLoadPromise;

      let pngBlob: Blob;

      if (shouldCombineImages) {
        // Load original image for side-by-side
        const originalImg = new Image();
        originalImg.crossOrigin = "anonymous";

        const originalLoadPromise = new Promise<void>((resolve, reject) => {
          originalImg.onload = () => resolve();
          originalImg.onerror = () =>
            reject(new Error("Failed to load original image"));
        });

        originalImg.src = originalImageSrc;
        await originalLoadPromise;

        // Create combined side-by-side canvas
        const gap = 20; // Gap between images
        const maxHeight = Math.max(
          originalImg.naturalHeight,
          currentImg.naturalHeight,
        );
        const totalWidth =
          originalImg.naturalWidth + gap + currentImg.naturalWidth;

        const canvas = document.createElement("canvas");
        canvas.width = totalWidth;
        canvas.height = maxHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }

        // Fill background with dark color (matches app theme)
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, totalWidth, maxHeight);

        // Draw original image on the left (vertically centered)
        const originalY = (maxHeight - originalImg.naturalHeight) / 2;
        ctx.drawImage(originalImg, 0, originalY);

        // Draw current image on the right (vertically centered)
        const currentX = originalImg.naturalWidth + gap;
        const currentY = (maxHeight - currentImg.naturalHeight) / 2;
        ctx.drawImage(currentImg, currentX, currentY);

        pngBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create PNG blob"));
          }, "image/png");
        });
      } else {
        // Single image copy (original behavior)
        const canvas = document.createElement("canvas");
        canvas.width = currentImg.naturalWidth;
        canvas.height = currentImg.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }
        ctx.drawImage(currentImg, 0, 0);

        pngBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create PNG blob"));
          }, "image/png");
        });
      }

      // Copy PNG to clipboard
      type ClipboardItemCtor = new (items: Record<string, Blob>) => unknown;
      const ClipboardItemCtor = (
        window as unknown as { ClipboardItem?: ClipboardItemCtor }
      ).ClipboardItem;
      if (navigator.clipboard?.write && ClipboardItemCtor) {
        const clipboardItem = new ClipboardItemCtor({
          "image/png": pngBlob,
        }) as unknown as ClipboardItem;
        await navigator.clipboard.write([clipboardItem]);
        setCopyState("copied");
        showImageActionMessage(
          shouldCombineImages
            ? "Copied side-by-side image"
            : "Copied image to clipboard",
        );
        return;
      }

      throw new Error("Clipboard API write not available");
    } catch (error) {
      console.error("Copy failed:", error);
      setCopyState("error");
      showImageActionMessage("Failed to copy image");
    } finally {
      window.setTimeout(() => {
        setCopyState("idle");
      }, 1500);
    }
  };

  const handleDownloadCurrentImage = async () => {
    // Get the image URL directly from currentImage at click time
    const imageSrc = currentImage.url
      ? getImageUrl(currentImage.url, currentImage.createdAt)
      : "";

    if (!imageSrc) return;

    setDownloadState("downloading");
    try {
      const response = await fetch(imageSrc, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const blob = await response.blob();

      const safeBaseName = (chain?.name ?? "image").trim() || "image";
      const safeName = safeBaseName
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const ext =
        blob.type === "image/jpeg"
          ? "jpg"
          : blob.type === "image/webp"
            ? "webp"
            : "png";
      const fileName = `${safeName || "image"}-step-${currentImage.stepNumber}.${ext}`;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

      setDownloadState("done");
      showImageActionMessage(`Downloaded ${fileName}`);
    } catch (error) {
      console.error("Download failed:", error);
      try {
        const a = document.createElement("a");
        a.href = imageSrc;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setDownloadState("done");
        showImageActionMessage("Opened image in a new tab");
      } catch (innerError) {
        console.error("Download fallback failed:", innerError);
        setDownloadState("error");
        showImageActionMessage("Download failed");
      }
    } finally {
      window.setTimeout(() => {
        setDownloadState("idle");
      }, 1200);
    }
  };

  // Quick tool handlers
  const handleCenterClick = async () => {
    const source = getSelectedImage(images, selectedImageId);
    if (isBatchMode) {
      enqueuePrompt(PROMPTS.center);
      return;
    }
    await generateImage(
      PROMPTS.center,
      "center",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleAlignLeftClick = async () => {
    const source = getSelectedImage(images, selectedImageId);
    if (isBatchMode) {
      enqueuePrompt(PROMPTS.alignLeft);
      return;
    }
    await generateImage(
      PROMPTS.alignLeft,
      "align_left",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleAlignRightClick = async () => {
    const source = getSelectedImage(images, selectedImageId);
    if (isBatchMode) {
      enqueuePrompt(PROMPTS.alignRight);
      return;
    }
    await generateImage(
      PROMPTS.alignRight,
      "align_right",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleDressMeClick = () => {
    if (controlsDisabled) return;
    setReferenceTool("dress_me");
    referenceFileInputRef.current?.click();
  };

  const handleChangeHairClick = () => {
    if (controlsDisabled) return;
    setReferenceTool("change_hair");
    referenceFileInputRef.current?.click();
  };

  const handleReferenceFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file twice.
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const source = getSelectedImage(images, selectedImageId);
    const zoom = source?.zoomPercent ?? zoomLevel;
    const brightness = source?.brightnessPercent ?? brightnessLevel;

    const referencePrompt =
      referenceTool === "dress_me" ? PROMPTS.dressMe : PROMPTS.changeHair;
    const batchAddedMessage =
      referenceTool === "dress_me"
        ? "Clothing reference added to batch"
        : "Hairstyle reference added to batch";

    setIsUploadingReference(true);
    try {
      const storageId = await uploadReferenceImage(file);

      if (isBatchMode) {
        setBatchReferenceStorageId(storageId);
        setBatchReferenceTool(referenceTool);
        enqueuePrompt(referencePrompt);
        showImageActionMessage(batchAddedMessage);
        return;
      }

      await generateImage(referencePrompt, referenceTool, zoom, brightness, {
        referenceStorageId: storageId,
      });
    } catch (error) {
      console.error("Reference upload failed:", error);
      alert("Failed to upload reference image");
    } finally {
      setIsUploadingReference(false);
    }
  };

  const handleZoomRelease = async (value: number) => {
    const base = getSelectedImage(images, selectedImageId)?.zoomPercent ?? 100;
    if (value === base) return;
    const prompt = buildZoomPrompt(value, base);
    const brightness =
      getSelectedImage(images, selectedImageId)?.brightnessPercent ?? 100;
    if (isBatchMode) {
      enqueuePrompt(prompt);
      return;
    }
    await generateImage(prompt, "zoom", value, brightness);
  };

  const handleBrightnessRelease = async (value: number) => {
    const base =
      getSelectedImage(images, selectedImageId)?.brightnessPercent ?? 100;
    if (value === base) return;
    const prompt = buildBrightnessPrompt(value, base);
    const zoom = getSelectedImage(images, selectedImageId)?.zoomPercent ?? 100;
    if (isBatchMode) {
      enqueuePrompt(prompt);
      return;
    }
    await generateImage(prompt, "brightness", zoom, value);
  };

  const handleMakeOlder = async () => {
    const source = getSelectedImage(images, selectedImageId);
    if (isBatchMode) {
      enqueuePrompt(PROMPTS.makeOld);
      return;
    }
    await generateImage(
      PROMPTS.makeOld,
      "make_old",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleDeleteBackground = async () => {
    const source = getSelectedImage(images, selectedImageId);
    if (isBatchMode) {
      enqueuePrompt(PROMPTS.deleteBackground);
      return;
    }
    await generateImage(
      PROMPTS.deleteBackground,
      "delete_background",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleMakeSquare = async () => {
    const source = getSelectedImage(images, selectedImageId);
    if (isBatchMode) {
      enqueuePrompt(PROMPTS.makeSquare);
      return;
    }
    await generateImage(
      PROMPTS.makeSquare,
      "make_square",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleMakeCircular = async () => {
    const source = getSelectedImage(images, selectedImageId);
    if (isBatchMode) {
      enqueuePrompt(PROMPTS.makeCircular);
      return;
    }
    await generateImage(
      PROMPTS.makeCircular,
      "make_circular",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleDuplicateObject = async () => {
    const source = getSelectedImage(images, selectedImageId);
    if (isBatchMode) {
      enqueuePrompt(PROMPTS.duplicateObject);
      return;
    }
    await generateImage(
      PROMPTS.duplicateObject,
      "duplicate_object",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleMakeYoung = async () => {
    const source = getSelectedImage(images, selectedImageId);
    if (isBatchMode) {
      enqueuePrompt(PROMPTS.makeYoung);
      return;
    }
    await generateImage(
      PROMPTS.makeYoung,
      "make_young",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleAddBackground = async () => {
    const source = getSelectedImage(images, selectedImageId);
    if (isBatchMode) {
      enqueuePrompt(PROMPTS.addBackground);
      return;
    }
    await generateImage(
      PROMPTS.addBackground,
      "add_background",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleRemoveObject = async () => {
    const source = getSelectedImage(images, selectedImageId);
    if (isBatchMode) {
      enqueuePrompt(PROMPTS.removeObject);
      return;
    }
    await generateImage(
      PROMPTS.removeObject,
      "remove_object",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handlePrettify = async () => {
    const source = getSelectedImage(images, selectedImageId);
    if (isBatchMode) {
      enqueuePrompt(PROMPTS.prettify);
      return;
    }
    await generateImage(
      PROMPTS.prettify,
      "prettify",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleManualSubmit = async () => {
    const nextPrompt = manualPrompt.trim();
    if (!nextPrompt) return;
    if (isBatchMode) {
      enqueuePrompt(nextPrompt);
      setManualPrompt("");
      return;
    }
    const source = getSelectedImage(images, selectedImageId);
    await generateImage(
      nextPrompt,
      "manual",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
    setManualPrompt("");
  };

  const historyLayout = buildHistoryLayout(images);
  const historyRows = historyLayout.rows.length
    ? historyLayout.rows
    : [
        {
          path: [{ image: currentImage, children: [] }],
          visibleFromDepth: 0,
          branchDepth: 0,
        },
      ];
  const historyColumns = Math.max(1, historyLayout.maxDepth);
  const selectedHistoryId = selectedImageId ?? currentImage._id;
  const historyPathImages = getImageAncestorPath(images, selectedHistoryId);
  const handleSelectHistoryImage = (imageId: Id<"images">) => {
    setSelectedImageId(imageId);
    setImageViewerMode("history");
  };
  const clearBatch = () => {
    setPendingPrompts([]);
    setBatchReferenceStorageId(null);
    setBatchReferenceTool(null);
  };

  return (
    <div
      className="min-h-screen px-3 py-4 lg:px-6 lg:py-8"
      style={APP_SHELL_STYLE}
    >
      <input
        ref={referenceFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReferenceFileChange}
      />
      <div className="mx-auto max-w-6xl app-anim-in">
        <header className="flex flex-wrap items-center justify-between gap-2 lg:gap-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <Button
              type="button"
              onClick={handleNewImage}
              disabled={controlsDisabled}
              variant="ghost"
              size="icon"
              className="h-8 w-8 lg:h-10 lg:w-10 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Back to upload"
            >
              <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
            </Button>
            <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-xl lg:rounded-2xl bg-gradient-to-br from-teal-400 to-lime-300 shadow-[0_18px_40px_rgba(45,212,191,0.18)]" />
            <div>
              <p className="text-[10px] lg:text-xs tracking-wide text-[color:var(--app-muted)]">
                AI Image Edit
              </p>
              <h1 className="text-sm lg:text-lg font-semibold truncate max-w-[140px] sm:max-w-none">
                {chain?.name ?? "Untitled"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 lg:gap-2">
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: "h-8 w-8" } }}
            />
            <span
              className={`app-badge rounded-full px-2 py-0.5 lg:px-3 lg:py-1 text-[10px] lg:text-xs ${hasCredits ? "text-[color:var(--app-muted)]" : "text-red-400"}`}
            >
              Credits: {credits}
            </span>
            {isGenerating && (
              <span className="hidden sm:inline app-badge rounded-full px-2 py-0.5 lg:px-3 lg:py-1 text-[10px] lg:text-xs text-[color:var(--app-muted)]">
                Generating...
              </span>
            )}
          </div>
        </header>

        <main className="mt-6 grid min-w-0 gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-start">
          {/* Left column: Image + History (on large screens) */}
          <div className="min-w-0 space-y-4 lg:space-y-6">
            <MainImageSection
              imagesCount={images.length}
              currentChainId={currentChainId}
              currentImage={currentImage}
              originalImage={originalImage}
              historyPathImages={historyPathImages}
              selectedHistoryId={selectedHistoryId}
              latestStepNumber={latestStepNumber}
              currentImageSrc={currentImageSrc}
              imageViewerMode={imageViewerMode}
              setImageViewerMode={setImageViewerMode}
              alternateShowingOriginal={alternateShowingOriginal}
              setAlternateShowingOriginal={setAlternateShowingOriginal}
              canCompareWithOriginal={canCompareWithOriginal}
              controlsDisabled={controlsDisabled}
              isGenerating={isGenerating}
              activePrompt={activePrompt}
              copyState={copyState}
              downloadState={downloadState}
              imageActionMessage={imageActionMessage}
              onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
              onSelectImage={handleSelectHistoryImage}
              onCopyCurrentImage={handleCopyCurrentImage}
              onDownloadCurrentImage={handleDownloadCurrentImage}
              onShareLink={handleShareLink}
            />

            <MobileToolsPanel
              controlsDisabled={controlsDisabled}
              isBatchMode={isBatchMode}
              pendingPromptsCount={pendingPrompts.length}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              batchReferenceStorageId={batchReferenceStorageId}
              batchReferenceTool={batchReferenceTool}
              zoomLevel={zoomLevel}
              brightnessLevel={brightnessLevel}
              setZoomLevel={setZoomLevel}
              setBrightnessLevel={setBrightnessLevel}
              onZoomRelease={handleZoomRelease}
              onBrightnessRelease={handleBrightnessRelease}
              setIsBatchMode={setIsBatchMode}
              clearBatch={clearBatch}
              onBatchGenerate={handleBatchGenerate}
              manualPrompt={manualPrompt}
              setManualPrompt={setManualPrompt}
              onManualSubmit={handleManualSubmit}
              onAlignLeft={handleAlignLeftClick}
              onCenter={handleCenterClick}
              onAlignRight={handleAlignRightClick}
              onMakeOlder={handleMakeOlder}
              onMakeYoung={handleMakeYoung}
              onDuplicateObject={handleDuplicateObject}
              onDeleteBackground={handleDeleteBackground}
              onAddBackground={handleAddBackground}
              onRemoveObject={handleRemoveObject}
              onMakeSquare={handleMakeSquare}
              onMakeCircular={handleMakeCircular}
              onPrettify={handlePrettify}
              onDressMe={handleDressMeClick}
              onChangeHair={handleChangeHairClick}
            />

            {/* History timeline - hidden on mobile, shown on desktop */}
            <section className="hidden lg:block app-card rounded-3xl p-5">
              <div className="flex items-center justify-between gap-2 lg:gap-3">
                <h3 className="text-xs lg:text-sm font-semibold">History</h3>
                <span className="app-badge rounded-full px-2 py-0.5 lg:px-3 lg:py-1 text-[10px] lg:text-xs text-[color:var(--app-muted)]">
                  {images.length} steps
                </span>
              </div>

              <div className="mt-2 lg:mt-4 overflow-x-auto pb-1 lg:pb-2">
                <div className="flex flex-col gap-3 min-w-max">
                  {historyRows.map((row, rowIndex) => (
                    <div
                      key={`history-row-${rowIndex}`}
                      className="flex items-center gap-2 lg:gap-3"
                    >
                      {Array.from({ length: historyColumns }).map(
                        (_, depth) => {
                          const node = row.path[depth];
                          const image = node?.image;
                          const visibleImage =
                            depth >= row.visibleFromDepth ? image : undefined;
                          const showNode = !!visibleImage;
                          const isSelected =
                            visibleImage?._id === selectedHistoryId;
                          const isOriginal = image?.stepNumber === 0;
                          // Check if this image is a leaf (has no children)
                          const isLeaf =
                            showNode &&
                            visibleImage &&
                            !images.some(
                              (img) => img.parentImageId === visibleImage._id,
                            );
                          const canDelete =
                            isOwner &&
                            showNode &&
                            ((isOriginal && images.length >= 1) ||
                              (isLeaf && !isOriginal));
                          const deleteTitle = isOriginal
                            ? "Delete original (reset project)"
                            : "Delete image";

                          // Edit icon for the current image (what edit created this image)
                          const currentEditType =
                            visibleImage?.editType ?? "unknown";
                          const currentMeta =
                            EDIT_TYPE_ICON_MAP[currentEditType] ??
                            EDIT_TYPE_ICON_MAP.unknown;
                          const CurrentEditIcon = currentMeta.icon;
                          const showEditIcon =
                            showNode && visibleImage?.stepNumber !== 0;

                          return (
                            <div
                              key={`history-cell-${rowIndex}-${depth}`}
                              className="contents"
                            >
                              <div className="flex flex-col items-start">
                                <div className="relative">
                                  {showEditIcon && (
                                    <div
                                      title={currentMeta.label}
                                      style={{
                                        top: "calc((100% - 1.25rem) / 2)",
                                      }}
                                      className="absolute -left-2.5 lg:-left-3 lg:top-[calc((100%-1.5rem)/2)] z-10 h-5 w-5 lg:h-6 lg:w-6 rounded-full border border-white/15 bg-black/60 backdrop-blur grid place-items-center text-white/90"
                                    >
                                      <CurrentEditIcon className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                                    </div>
                                  )}
                                  {visibleImage ? (
                                    <TooltipProvider delayDuration={0}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            disabled={controlsDisabled}
                                            onClick={() => {
                                              if (controlsDisabled) return;
                                              handleSelectHistoryImage(
                                                visibleImage._id,
                                              );
                                            }}
                                            className={`group block w-14 h-14 sm:w-16 sm:h-16 lg:w-24 lg:h-24 rounded-xl lg:rounded-2xl overflow-hidden border transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                              isSelected
                                                ? "border-teal-300/70 shadow-[0_0_0_2px_rgba(45,212,191,0.18)] lg:shadow-[0_0_0_3px_rgba(45,212,191,0.18)]"
                                                : "border-white/10"
                                            }`}
                                          >
                                            <img
                                              src={getImageUrl(
                                                visibleImage.url ?? "",
                                                visibleImage.createdAt,
                                              )}
                                              alt={`Step ${visibleImage.stepNumber}`}
                                              className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                            />
                                            <div className="absolute left-1 top-1 lg:left-2 lg:top-2 app-badge rounded-full px-1.5 py-0.5 lg:px-2 text-[8px] lg:text-[10px] text-[color:var(--app-muted)]">
                                              {visibleImage.stepNumber}
                                            </div>
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          className="max-w-[280px]"
                                        >
                                          <p className="text-left leading-relaxed break-words whitespace-pre-wrap">
                                            {getTooltipText(visibleImage)}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : depth === row.branchDepth - 1 &&
                                    row.branchDepth > 0 ? (
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-24 lg:h-24 flex items-center justify-center">
                                      <CornerDownRight className="h-4 w-4 lg:h-5 lg:w-5 text-[color:var(--app-faint)]" />
                                    </div>
                                  ) : depth === row.visibleFromDepth - 1 &&
                                    row.visibleFromDepth > 0 &&
                                    depth < row.branchDepth - 1 ? (
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-24 lg:h-24 flex items-center justify-center">
                                      <MoveDown className="h-4 w-4 lg:h-5 lg:w-5 text-[color:var(--app-faint)]" />
                                    </div>
                                  ) : (
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-24 lg:h-24 opacity-0 pointer-events-none" />
                                  )}

                                  {showNode && canDelete && visibleImage && (
                                    <button
                                      type="button"
                                      disabled={controlsDisabled}
                                      title={deleteTitle}
                                      aria-label={deleteTitle}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (isOriginal) {
                                          handleDeleteChain();
                                        } else {
                                          handleDeleteLeafImage(
                                            visibleImage._id,
                                          );
                                        }
                                      }}
                                      className="absolute -right-1 -top-1 lg:-right-2 lg:-top-2 h-5 w-5 lg:h-7 lg:w-7 rounded-full border border-white/15 bg-black/60 backdrop-blur grid place-items-center text-xs lg:text-sm font-semibold text-white transition hover:bg-black/80 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      x
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Right sidebar: Tools (hidden on mobile, shown on large screens) */}
          <aside className="hidden lg:block space-y-5">
            <section className="app-card rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-semibold">Generation mode</h2>
                <Button
                  type="button"
                  onClick={handleBatchGenerate}
                  disabled={
                    controlsDisabled ||
                    !isBatchMode ||
                    pendingPrompts.length === 0
                  }
                  variant="ghost"
                  className="h-auto rounded-full px-3 py-1 text-xs font-semibold bg-gradient-to-r from-teal-400/90 to-lime-300/90 text-black hover:from-teal-300 hover:to-lime-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-2">
                    Mode
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[color:var(--app-muted)]">
                      Oneshot
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (controlsDisabled) return;
                        setIsBatchMode((prev) => !prev);
                        setPendingPrompts([]);
                        setBatchReferenceStorageId(null);
                        setBatchReferenceTool(null);
                      }}
                      disabled={controlsDisabled}
                      className={`relative h-6 w-11 rounded-full border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isBatchMode
                          ? "bg-teal-400/80 border-teal-200/60"
                          : "bg-white/10 border-white/20"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                          isBatchMode ? "left-5" : "left-0.5"
                        }`}
                      />
                    </button>
                    <span className="text-xs text-[color:var(--app-muted)]">
                      Batch
                    </span>
                    <span className="text-xs text-[color:var(--app-faint)] ml-auto">
                      {isBatchMode
                        ? `Queued: ${pendingPrompts.length}`
                        : "Runs instantly"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-2">
                    Model
                  </label>
                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.5-flash-image">
                        Gemini 2.5 Flash
                      </SelectItem>
                      <SelectItem value="gemini-3-pro-image-preview">
                        Gemini 3 Pro Preview
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="app-card rounded-3xl p-5">
              <h2 className="text-sm font-semibold">Quick tools</h2>
              <p className="mt-1 text-sm text-[color:var(--app-muted)]">
                One-click edits{" "}
                {isBatchMode ? "queue prompts" : "generate a new step"}.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-1.5">
                {/* Row 1: Position */}
                <PositionButton
                  onClick={handleAlignLeftClick}
                  disabled={controlsDisabled}
                  label="Left"
                  icon={AlignLeft}
                  toneClassName="bg-gradient-to-r from-sky-400/90 to-cyan-300/90 hover:from-sky-300 hover:to-cyan-200"
                />
                <PositionButton
                  onClick={handleCenterClick}
                  disabled={controlsDisabled}
                  label="Center"
                  icon={Focus}
                  toneClassName="bg-gradient-to-r from-teal-400/90 to-lime-300/90 hover:from-teal-300 hover:to-lime-200"
                />
                <PositionButton
                  onClick={handleAlignRightClick}
                  disabled={controlsDisabled}
                  label="Right"
                  icon={AlignRight}
                  toneClassName="bg-gradient-to-r from-rose-400/90 to-amber-300/90 hover:from-rose-300 hover:to-amber-200"
                />
                {/* Row 2: Age */}
                <PositionButton
                  onClick={handleMakeOlder}
                  disabled={controlsDisabled}
                  label="Old"
                  icon={Sparkles}
                  toneClassName="bg-gradient-to-r from-amber-500/90 to-orange-400/90 hover:from-amber-400 hover:to-orange-300"
                />
                <PositionButton
                  onClick={handleMakeYoung}
                  disabled={controlsDisabled}
                  label="Young"
                  icon={Baby}
                  toneClassName="bg-gradient-to-r from-pink-400/90 to-rose-300/90 hover:from-pink-300 hover:to-rose-200"
                />
                <PositionButton
                  onClick={handleDuplicateObject}
                  disabled={controlsDisabled}
                  label="Duplicate"
                  icon={Copy}
                  toneClassName="bg-gradient-to-r from-emerald-500/90 to-teal-400/90 hover:from-emerald-400 hover:to-teal-300"
                />
                {/* Row 3: Background & Shape */}
                <PositionButton
                  onClick={handleDeleteBackground}
                  disabled={controlsDisabled}
                  label="Remove BG"
                  icon={Eraser}
                  toneClassName="bg-gradient-to-r from-red-500/90 to-pink-400/90 hover:from-red-400 hover:to-pink-300"
                />
                <PositionButton
                  onClick={handleAddBackground}
                  disabled={controlsDisabled}
                  label="Add BG"
                  icon={ImagePlus}
                  toneClassName="bg-gradient-to-r from-indigo-500/90 to-purple-400/90 hover:from-indigo-400 hover:to-purple-300"
                />
                <PositionButton
                  onClick={handleRemoveObject}
                  disabled={controlsDisabled}
                  label="Clean Up"
                  icon={Trash2}
                  toneClassName="bg-gradient-to-r from-slate-500/90 to-gray-400/90 hover:from-slate-400 hover:to-gray-300"
                />
                {/* Row 4: Shape */}
                <PositionButton
                  onClick={handleMakeSquare}
                  disabled={controlsDisabled}
                  label="Square"
                  icon={Square}
                  toneClassName="bg-gradient-to-r from-violet-500/90 to-purple-400/90 hover:from-violet-400 hover:to-purple-300"
                />
                <PositionButton
                  onClick={handleMakeCircular}
                  disabled={controlsDisabled}
                  label="Circular"
                  icon={Circle}
                  toneClassName="bg-gradient-to-r from-fuchsia-500/90 to-pink-400/90 hover:from-fuchsia-400 hover:to-pink-300"
                />
                <PositionButton
                  onClick={handlePrettify}
                  disabled={controlsDisabled}
                  label="Prettify"
                  icon={Wand2}
                  toneClassName="bg-gradient-to-r from-cyan-400/90 to-blue-300/90 hover:from-cyan-300 hover:to-blue-200"
                />
                <div className="col-span-3 grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    onClick={handleDressMeClick}
                    disabled={controlsDisabled}
                    variant="ghost"
                    className="flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2.5 text-xs shadow-[0_8px_20px_rgba(45,212,191,0.12)] text-black font-semibold transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-lime-300/95 to-amber-300/95 hover:from-lime-200 hover:to-amber-200"
                    title="Upload a clothing image reference"
                  >
                    <Shirt className="w-4 h-4" />
                    Dress me
                    {isBatchMode &&
                    batchReferenceStorageId &&
                    batchReferenceTool === "dress_me"
                      ? " (ref ready)"
                      : ""}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleChangeHairClick}
                    disabled={controlsDisabled}
                    variant="ghost"
                    className="flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2.5 text-xs shadow-[0_8px_20px_rgba(45,212,191,0.12)] text-black font-semibold transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-300/95 to-fuchsia-300/95 hover:from-cyan-200 hover:to-fuchsia-200"
                    title="Upload a hairstyle image reference"
                  >
                    <Scissors className="w-4 h-4" />
                    Change hair
                    {isBatchMode &&
                    batchReferenceStorageId &&
                    batchReferenceTool === "change_hair"
                      ? " (ref ready)"
                      : ""}
                  </Button>
                </div>
              </div>
            </section>

            <section className="app-card rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Adjustments</h2>
                <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
                  {isBatchMode ? "Release to queue" : "Release to apply"}
                </span>
              </div>

              <div className="mt-5 space-y-6">
                <EditSlider
                  label="Zoom"
                  value={zoomLevel}
                  onChange={setZoomLevel}
                  onRelease={handleZoomRelease}
                  disabled={controlsDisabled}
                />
                <EditSlider
                  label="Brightness"
                  value={brightnessLevel}
                  onChange={setBrightnessLevel}
                  onRelease={handleBrightnessRelease}
                  disabled={controlsDisabled}
                />
              </div>
            </section>

            <section className="app-card rounded-3xl p-5">
              <h2 className="text-sm font-semibold">Describe an edit</h2>
              <p className="mt-1 text-xs text-[color:var(--app-muted)]">
                {isBatchMode
                  ? "Add multiple prompts, then generate once."
                  : "Submit to generate immediately."}
              </p>
              <div className="mt-4">
                <textarea
                  value={manualPrompt}
                  onChange={(e) => setManualPrompt(e.target.value)}
                  placeholder="Describe an edit"
                  rows={4}
                  disabled={controlsDisabled}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-0 app-focus disabled:opacity-50"
                />
                <div className="mt-3 flex items-end justify-between gap-2">
                  <span className="text-xs text-[color:var(--app-faint)]">
                    {isBatchMode
                      ? `Queued: ${pendingPrompts.length}`
                      : "Press button to generate"}
                  </span>
                  <Button
                    type="button"
                    onClick={handleManualSubmit}
                    disabled={
                      controlsDisabled || manualPrompt.trim().length === 0
                    }
                    variant="ghost"
                    className="h-auto rounded-full px-4 py-2 text-xs font-semibold bg-gradient-to-r from-sky-400/90 to-blue-300/90 text-black hover:from-sky-300 hover:to-blue-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBatchMode ? "Add prompt" : "Generate"}
                  </Button>
                </div>
              </div>
            </section>
          </aside>
        </main>

        {/* Mobile: History Modal using shadcn Dialog */}
        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
          <DialogContent className="lg:hidden max-w-full w-full rounded-t-3xl border-t border-white/10 max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>History ({images.length} steps)</DialogTitle>
            </DialogHeader>

            <div className="overflow-x-auto pb-2 -mx-6 px-6">
              <div className="flex flex-col gap-3 min-w-max">
                {historyRows.map((row, rowIndex) => (
                  <div
                    key={`history-row-${rowIndex}`}
                    className="flex items-center gap-2"
                  >
                    {Array.from({ length: historyColumns }).map((_, depth) => {
                      const node = row.path[depth];
                      const image = node?.image;
                      const visibleImage =
                        depth >= row.visibleFromDepth ? image : undefined;
                      const showNode = !!visibleImage;
                      const isSelected =
                        visibleImage?._id === selectedHistoryId;
                      const isOriginal = image?.stepNumber === 0;
                      const isLeaf =
                        showNode &&
                        visibleImage &&
                        !images.some(
                          (img) => img.parentImageId === visibleImage._id,
                        );
                      const canDelete =
                        isOwner &&
                        showNode &&
                        ((isOriginal && images.length >= 1) ||
                          (isLeaf && !isOriginal));
                      const deleteTitle = isOriginal
                        ? "Delete original (reset project)"
                        : "Delete image";

                      const currentEditType =
                        visibleImage?.editType ?? "unknown";
                      const currentMeta =
                        EDIT_TYPE_ICON_MAP[currentEditType] ??
                        EDIT_TYPE_ICON_MAP.unknown;
                      const CurrentEditIcon = currentMeta.icon;
                      const showEditIcon =
                        showNode && visibleImage?.stepNumber !== 0;

                      return (
                        <div
                          key={`history-cell-${rowIndex}-${depth}`}
                          className="contents"
                        >
                          <div className="flex flex-col items-start">
                            <div className="relative">
                              {showEditIcon && (
                                <div
                                  title={currentMeta.label}
                                  style={{
                                    top: "calc((100% - 1.25rem) / 2)",
                                  }}
                                  className="absolute -left-2 z-10 h-5 w-5 rounded-full border border-white/15 bg-black/60 backdrop-blur grid place-items-center text-white/90"
                                >
                                  <CurrentEditIcon className="h-3 w-3" />
                                </div>
                              )}
                              {visibleImage ? (
                                <TooltipProvider delayDuration={0}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        disabled={controlsDisabled}
                                        onClick={() => {
                                          if (controlsDisabled) return;
                                          handleSelectHistoryImage(
                                            visibleImage._id,
                                          );
                                          setIsHistoryModalOpen(false);
                                        }}
                                        className={`group block w-16 h-16 rounded-xl overflow-hidden border transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                          isSelected
                                            ? "border-teal-300/70 shadow-[0_0_0_2px_rgba(45,212,191,0.18)]"
                                            : "border-white/10"
                                        }`}
                                      >
                                        <img
                                          src={getImageUrl(
                                            visibleImage.url ?? "",
                                            visibleImage.createdAt,
                                          )}
                                          alt={`Step ${visibleImage.stepNumber}`}
                                          className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                        />
                                        <div className="absolute left-1 top-1 app-badge rounded-full px-1.5 py-0.5 text-[8px] text-[color:var(--app-muted)]">
                                          {visibleImage.stepNumber}
                                        </div>
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="max-w-[280px]"
                                    >
                                      <p className="text-left leading-relaxed break-words whitespace-pre-wrap">
                                        {getTooltipText(visibleImage)}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : depth === row.branchDepth - 1 &&
                                row.branchDepth > 0 ? (
                                <div className="w-16 h-16 flex items-center justify-center">
                                  <CornerDownRight className="h-4 w-4 text-[color:var(--app-faint)]" />
                                </div>
                              ) : depth === row.visibleFromDepth - 1 &&
                                row.visibleFromDepth > 0 &&
                                depth < row.branchDepth - 1 ? (
                                <div className="w-16 h-16 flex items-center justify-center">
                                  <MoveDown className="h-4 w-4 text-[color:var(--app-faint)]" />
                                </div>
                              ) : (
                                <div className="w-16 h-16 opacity-0 pointer-events-none" />
                              )}

                              {showNode && canDelete && visibleImage && (
                                <button
                                  type="button"
                                  disabled={controlsDisabled}
                                  title={deleteTitle}
                                  aria-label={deleteTitle}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (isOriginal) {
                                      handleDeleteChain();
                                    } else {
                                      handleDeleteLeafImage(visibleImage._id);
                                    }
                                  }}
                                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full border border-white/15 bg-black/60 backdrop-blur grid place-items-center text-xs font-semibold text-white transition hover:bg-black/80 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  x
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default App;
