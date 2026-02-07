import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@repo/convex-backend/convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import type { Doc, Id } from "@repo/convex-backend/convex/_generated/dataModel";
import { EditSlider } from "./components/EditSlider";
import {
  AlignLeft,
  AlignRight,
  ArrowDownRight,
  ArrowRight,
  Focus,
  Image as ImageIcon,
  PencilLine,
  Sparkles,
  Sun,
  Wand2,
  ZoomIn,
} from "lucide-react";

// Reusable button components for tools
interface QuickToolButtonProps {
  onClick: () => void;
  disabled: boolean;
  isGenerating: boolean;
  size?: "compact" | "regular";
}

interface PositionButtonProps extends QuickToolButtonProps {
  label: string;
  toneClassName: string;
  icon: typeof Focus;
}

function PositionButton({
  onClick,
  disabled,
  isGenerating,
  size = "regular",
  label,
  toneClassName,
  icon: Icon,
}: PositionButtonProps) {
  const isCompact = size === "compact";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center w-full transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-black font-semibold ${toneClassName} ${
        isCompact
          ? "gap-1.5 rounded-xl px-2 py-2 text-xs"
          : "gap-2 rounded-2xl px-4 py-3 text-sm shadow-[0_18px_40px_rgba(45,212,191,0.16)]"
      }`}
    >
      <Icon className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {isGenerating ? (isCompact ? "..." : "Generating...") : label}
    </button>
  );
}

function MakeOldButton({
  onClick,
  disabled,
  isGenerating,
  size = "regular",
}: QuickToolButtonProps) {
  const isCompact = size === "compact";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500/90 to-orange-400/90 text-black hover:from-amber-400 hover:to-orange-300 font-semibold ${
        isCompact
          ? "gap-1.5 rounded-xl px-2 py-2 text-xs"
          : "gap-2 rounded-2xl px-4 py-3 text-sm shadow-[0_18px_40px_rgba(217,119,6,0.16)]"
      }`}
    >
      <Sparkles className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {isGenerating ? (isCompact ? "..." : "Generating...") : "Make old"}
    </button>
  );
}

type ImageDoc = Doc<"images">;
type ChainDoc = Doc<"imageChains">;
type ImageWithUrl = ImageDoc & { url: string | null };
type ChainWithUrl = ChainDoc & { originalUrl: string | null };
type EditType = ImageDoc["editType"];

type HistoryNode = {
  image: ImageWithUrl;
  children: HistoryNode[];
};

type HistoryRow = {
  path: HistoryNode[];
  visibleFromDepth: number;
  branchDepth: number;
};

type HistoryLayout = {
  rows: HistoryRow[];
  maxDepth: number;
};

const buildHistoryLayout = (images: ImageWithUrl[]): HistoryLayout => {
  const nodeMap = new Map<Id<"images">, HistoryNode>();
  for (const image of images) {
    nodeMap.set(image._id, { image, children: [] });
  }

  let root: HistoryNode | null = null;

  for (const node of nodeMap.values()) {
    const parentId = node.image.parentImageId;
    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)?.children.push(node);
    } else if (!root || node.image.stepNumber === 0) {
      root = node;
    }
  }

  for (const node of nodeMap.values()) {
    node.children.sort((a, b) => {
      if (a.image.stepNumber !== b.image.stepNumber) {
        return a.image.stepNumber - b.image.stepNumber;
      }
      return a.image.createdAt - b.image.createdAt;
    });
  }

  if (!root) {
    root = nodeMap.values().next().value ?? null;
  }

  const paths: HistoryNode[][] = [];
  const walk = (node: HistoryNode, path: HistoryNode[]) => {
    const nextPath = [...path, node];
    if (node.children.length === 0) {
      paths.push(nextPath);
      return;
    }
    for (const child of node.children) {
      walk(child, nextPath);
    }
  };

  if (root) {
    walk(root, []);
  }

  const maxDepth = paths.reduce((max, row) => Math.max(max, row.length), 0);
  let previousPath: HistoryNode[] | null = null;
  const rows: HistoryRow[] = paths.map((path) => {
    let visibleFromDepth = 0;
    if (previousPath) {
      const maxCommon = Math.min(path.length, previousPath.length);
      while (
        visibleFromDepth < maxCommon &&
        path[visibleFromDepth]?.image._id ===
          previousPath[visibleFromDepth]?.image._id
      ) {
        visibleFromDepth += 1;
      }
    }
    previousPath = path;
    return {
      path,
      visibleFromDepth,
      branchDepth: visibleFromDepth,
    };
  });

  return { rows, maxDepth };
};

const appShellStyle = {
  backgroundColor: "var(--app-bg-0)",
  backgroundImage:
    "radial-gradient(900px 600px at 18% 12%, rgba(45, 212, 191, 0.16), transparent 55%), radial-gradient(900px 700px at 82% 18%, rgba(163, 230, 53, 0.14), transparent 60%), linear-gradient(180deg, rgba(11, 18, 32, 1), rgba(7, 10, 15, 1))",
  backgroundAttachment: "scroll",
} as const;

function App() {
  const [currentChainId, setCurrentChainId] =
    useState<Id<"imageChains"> | null>(null);
  const [showUpload, setShowUpload] = useState(true);

  const chain = useQuery(
    api.images.getChain,
    currentChainId ? { chainId: currentChainId } : "skip",
  ) as ChainWithUrl | null | undefined;
  const images = useQuery(
    api.images.list,
    currentChainId ? { chainId: currentChainId } : "skip",
  ) as ImageWithUrl[] | undefined;
  const allChains = useQuery(api.images.listChains) as
    | ChainWithUrl[]
    | undefined;
  const createChain = useMutation(api.images.createChain);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const generateNextStep = useAction(api.generateImage.generateNextStep);
  const deleteLastStep = useMutation(api.images.deleteLastStep);
  const deleteChain = useMutation(api.images.deleteChain);

  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<Id<"images"> | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualPrompt, setManualPrompt] = useState("");
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [pendingPrompts, setPendingPrompts] = useState<string[]>([]);
  const [activePrompt, setActivePrompt] = useState<string>("");

  // Slider states
  const [zoomLevel, setZoomLevel] = useState(100);
  const [brightnessLevel, setBrightnessLevel] = useState(100);

  // Controls disabled when generating
  const controlsDisabled = isGenerating;
  const uploadDisabled = isUploading;

  // When images change, select the latest one if needed
  useEffect(() => {
    if (!images || images.length === 0) return;
    setSelectedImageId((prev) => {
      if (prev && images.some((img) => img._id === prev)) return prev;
      const latest = images.reduce((best, img) =>
        img.stepNumber >= best.stepNumber ? img : best,
      );
      return latest._id;
    });
  }, [images]);

  // When the selected image changes, reflect its stored adjustment values.
  useEffect(() => {
    if (!images || images.length === 0) return;
    const img =
      (selectedImageId &&
        images.find((image) => image._id === selectedImageId)) ??
      images.reduce((best, image) =>
        image.stepNumber >= best.stepNumber ? image : best,
      );
    if (!img) return;
    setZoomLevel(img.zoomPercent ?? 100);
    setBrightnessLevel(img.brightnessPercent ?? 100);
  }, [images, selectedImageId]);

  const handleFileSelect = async (file: File) => {
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
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Helper to add cache-busting to image URLs
  const getImageUrl = (url: string, createdAt?: number) => {
    const timestamp = createdAt || Date.now();
    if (!url) return "";
    return `${url}${url.includes("?") ? "&" : "?"}t=${timestamp}`;
  };

  const getSelectedImage = () => {
    if (!images || images.length === 0) return null;
    if (selectedImageId) {
      const selected = images.find((img) => img._id === selectedImageId);
      if (selected) return selected;
    }
    return images.reduce((best, img) =>
      img.stepNumber >= best.stepNumber ? img : best,
    );
  };

  const handleNewImage = () => {
    setCurrentChainId(null);
    setShowUpload(true);
    setSelectedImageId(null);
  };

  const handleDeleteLastStep = async () => {
    if (!currentChainId || !images || images.length <= 1) return;
    if (controlsDisabled) return;
    try {
      await deleteLastStep({ chainId: currentChainId });
    } catch (error) {
      console.error("Error deleting last step:", error);
      alert("Failed to delete last step");
    }
  };

  const handleDeleteChain = async () => {
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
  };

  const enqueuePrompt = (prompt: string) => {
    if (!prompt.trim()) return;
    setPendingPrompts((prev) => [...prev, prompt.trim()]);
  };

  // Generic function for generating images with a prompt
  const generateImage = async (
    prompt: string,
    editType: EditType,
    nextZoomPercent?: number,
    nextBrightnessPercent?: number,
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
      setSelectedImageId(null);
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image: " + (error as Error).message);
    } finally {
      setIsGenerating(false);
      setActivePrompt("");
    }
  };

  const buildZoomPrompt = (value: number, base: number) => {
    const direction = value > base ? "in" : "out";
    const amount = Math.abs(value - base);
    return `Adjust the zoom ${direction} by about ${amount}%. Target zoom ${value}% (100% = original framing).`;
  };

  const buildBrightnessPrompt = (value: number, base: number) => {
    const direction = value > base ? "brighter" : "darker";
    const amount = Math.abs(value - base);
    return `Make the image about ${amount}% ${direction}. Target brightness ${value}% (100% = original). Adjust overall brightness/exposure while keeping the same subject and composition.`;
  };

  const handleCenterClick = async () => {
    const prompt = "Center the main object in the image";
    const source = getSelectedImage();
    if (isBatchMode) {
      enqueuePrompt(prompt);
      return;
    }
    await generateImage(
      prompt,
      "center",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleAlignLeftClick = async () => {
    const prompt = "Place the main object on the left side of the photo";
    const source = getSelectedImage();
    if (isBatchMode) {
      enqueuePrompt(prompt);
      return;
    }
    await generateImage(
      prompt,
      "align_left",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleAlignRightClick = async () => {
    const prompt = "Place the main object on the right side of the photo";
    const source = getSelectedImage();
    if (isBatchMode) {
      enqueuePrompt(prompt);
      return;
    }
    await generateImage(
      prompt,
      "align_right",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleZoomRelease = async (value: number) => {
    const base = getSelectedImage()?.zoomPercent ?? 100;
    if (value === base) return;
    const prompt = buildZoomPrompt(value, base);
    const brightness = getSelectedImage()?.brightnessPercent ?? 100;
    if (isBatchMode) {
      enqueuePrompt(prompt);
      return;
    }
    await generateImage(prompt, "zoom", value, brightness);
  };

  const handleBrightnessRelease = async (value: number) => {
    const base = getSelectedImage()?.brightnessPercent ?? 100;
    if (value === base) return;
    const prompt = buildBrightnessPrompt(value, base);
    const zoom = getSelectedImage()?.zoomPercent ?? 100;
    if (isBatchMode) {
      enqueuePrompt(prompt);
      return;
    }
    await generateImage(prompt, "brightness", zoom, value);
  };

  const handleSelectChain = (chainId: Id<"imageChains">) => {
    setCurrentChainId(chainId);
    setShowUpload(false);
    setSelectedImageId(null);
  };

  const handleMakeOlder = async () => {
    const prompt =
      "Make everyone and everything in this photo look noticeably older. Add wrinkles, age spots, graying hair, aged appearance to any people. Show aging effects on objects and surroundings as well.";
    const source = getSelectedImage();
    if (isBatchMode) {
      enqueuePrompt(prompt);
      return;
    }
    await generateImage(
      prompt,
      "make_old",
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
    const source = getSelectedImage();
    await generateImage(
      nextPrompt,
      "manual",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
    setManualPrompt("");
  };

  const handleBatchGenerate = async () => {
    if (!pendingPrompts.length) return;
    const combinedPrompt = pendingPrompts.join(" ");
    const source = getSelectedImage();
    await generateImage(
      combinedPrompt,
      "manual",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
    setPendingPrompts([]);
  };

  // No image mode / Upload mode
  if (showUpload || !currentChainId || !images || images.length === 0) {
    return (
      <div className="min-h-screen px-6 py-10" style={appShellStyle}>
        <div className="mx-auto max-w-6xl app-anim-in">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-400 to-lime-300 shadow-[0_18px_40px_rgba(45,212,191,0.18)]" />
              <div>
                <p className="text-xs tracking-wide text-[color:var(--app-muted)]">
                  AI Image Edit
                </p>
                <h1 className="text-lg font-semibold">
                  Edit images with quick AI tools
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
                {uploadDisabled ? "Uploading..." : "Convex storage"}
              </span>
            </div>
          </header>

          <main className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="app-card rounded-3xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Start a new edit</h2>
                  <p className="mt-1 text-sm text-[color:var(--app-muted)]">
                    Drop an image, then use sliders and one-click tools.
                  </p>
                </div>
                <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
                  Release sliders to apply
                </span>
              </div>

              <div
                className={`relative mt-6 rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center transition-colors cursor-pointer ${
                  uploadDisabled
                    ? "opacity-60 pointer-events-none"
                    : "hover:bg-white/10"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 grid place-items-center">
                  <div className="h-6 w-6 rounded-md border border-white/30" />
                </div>
                <h3 className="mt-5 text-base font-semibold">
                  {uploadDisabled
                    ? "Uploading image"
                    : "Drop an image or click"}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--app-muted)]">
                  PNG, JPG, WEBP. Stored in Convex file storage.
                </p>

                {uploadDisabled && (
                  <div className="absolute inset-0 grid place-items-center rounded-3xl bg-black/30">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span className="text-sm text-[color:var(--app-muted)]">
                        Preparing chain...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="app-card rounded-3xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Recent projects</h2>
                  <p className="mt-1 text-sm text-[color:var(--app-muted)]">
                    Jump back into an image chain.
                  </p>
                </div>
                <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
                  {allChains?.length ?? 0} total
                </span>
              </div>

              {allChains && allChains.length > 0 ? (
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {allChains.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      disabled={uploadDisabled}
                      onClick={() => handleSelectChain(c._id)}
                      className="group text-left rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:border-white/20 hover:bg-white/10"
                    >
                      <div className="aspect-square bg-black/20">
                        <img
                          src={getImageUrl(c.originalUrl ?? "", c.createdAt)}
                          alt={c.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold truncate">
                          {c.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[color:var(--app-muted)]">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                  <p className="text-sm text-[color:var(--app-muted)]">
                    No projects yet. Upload an image to start your first chain.
                  </p>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    );
  }

  // Edit mode
  const currentImage = getSelectedImage();
  if (!currentImage) {
    return null;
  }
  const latestImage = images.reduce((best, img) =>
    img.stepNumber >= best.stepNumber ? img : best,
  );
  const latestStepNumber = latestImage.stepNumber;

  const editTypeIconMap: Record<string, { icon: typeof Focus; label: string }> =
    {
      original: { icon: ImageIcon, label: "Original" },
      align_left: { icon: AlignLeft, label: "Align left" },
      align_right: { icon: AlignRight, label: "Align right" },
      center: { icon: Focus, label: "Center" },
      make_old: { icon: Sparkles, label: "Make old" },
      manual: { icon: PencilLine, label: "Manual" },
      zoom: { icon: ZoomIn, label: "Zoom" },
      brightness: { icon: Sun, label: "Brightness" },
      unknown: { icon: Wand2, label: "Edit" },
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

  return (
    <div
      className="min-h-screen px-3 py-4 lg:px-6 lg:py-8"
      style={appShellStyle}
    >
      <div className="mx-auto max-w-6xl app-anim-in">
        <header className="flex flex-wrap items-center justify-between gap-2 lg:gap-4">
          <div className="flex items-center gap-2 lg:gap-3">
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
            {isGenerating && (
              <span className="hidden sm:inline app-badge rounded-full px-2 py-0.5 lg:px-3 lg:py-1 text-[10px] lg:text-xs text-[color:var(--app-muted)]">
                Generating...
              </span>
            )}
            <button
              type="button"
              onClick={handleNewImage}
              disabled={controlsDisabled}
              className="rounded-full px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              New
            </button>
          </div>
        </header>

        <main className="mt-6 grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
          {/* Left column: Image + History (on large screens) */}
          <div className="space-y-4 lg:space-y-6">
            {/* Main image card */}
            <section className="app-card rounded-3xl p-3 lg:p-5">
              <div className="relative rounded-2xl border border-white/10 bg-black/20 p-2 lg:p-3 overflow-hidden">
                <img
                  src={getImageUrl(
                    currentImage.url ?? "",
                    currentImage.createdAt,
                  )}
                  alt={`Step ${currentImage.stepNumber}`}
                  className="w-full h-auto max-h-[52vh] lg:max-h-[56vh] object-contain rounded-xl"
                />

                {isGenerating && (
                  <div className="absolute inset-0 grid place-items-center bg-black/45">
                    <div className="app-card-2 rounded-2xl px-4 py-3 lg:px-5 lg:py-4 max-w-[90%]">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="h-4 w-4 lg:h-5 lg:w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <div className="space-y-1">
                          <p className="text-xs lg:text-sm font-semibold">
                            Working...
                          </p>
                          <p className="text-[10px] lg:text-xs text-[color:var(--app-muted)] hidden sm:block">
                            Controls locked until the new image arrives.
                          </p>
                        </div>
                      </div>
                      {activePrompt && (
                        <p className="mt-3 text-[10px] lg:text-xs text-[color:var(--app-muted)] break-words">
                          {activePrompt}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Status badges - simplified on mobile */}
              <div className="mt-2 lg:mt-4 flex flex-wrap items-center justify-between gap-1 lg:gap-2">
                <div className="flex items-center gap-1 lg:gap-2 flex-wrap">
                  <span className="app-badge rounded-full px-2 py-0.5 lg:px-3 lg:py-1 text-[10px] lg:text-xs text-[color:var(--app-muted)]">
                    Step {currentImage.stepNumber}/{latestStepNumber}
                  </span>
                  <span className="app-badge rounded-full px-2 py-0.5 lg:px-3 lg:py-1 text-[10px] lg:text-xs text-[color:var(--app-muted)]">
                    Z:{currentImage.zoomPercent ?? 100}%
                  </span>
                  <span className="app-badge rounded-full px-2 py-0.5 lg:px-3 lg:py-1 text-[10px] lg:text-xs text-[color:var(--app-muted)]">
                    B:{currentImage.brightnessPercent ?? 100}%
                  </span>
                </div>
                <div className="hidden lg:block text-xs text-[color:var(--app-faint)] break-words max-w-[64ch]">
                  {currentImage.prompt
                    ? `"${currentImage.prompt}"`
                    : "No prompt for this step"}
                </div>
              </div>
            </section>

            {/* Mobile: Compact tools section - shown only on small screens */}
            <section className="lg:hidden app-card rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[color:var(--app-muted)]">
                    Oneshot
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (controlsDisabled) return;
                      setIsBatchMode((prev) => !prev);
                      setPendingPrompts([]);
                    }}
                    disabled={controlsDisabled}
                    className={`relative h-5 w-9 rounded-full border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isBatchMode
                        ? "bg-teal-400/80 border-teal-200/60"
                        : "bg-white/10 border-white/20"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                        isBatchMode ? "left-4" : "left-0.5"
                      }`}
                    />
                  </button>
                  <span className="text-[10px] text-[color:var(--app-muted)]">
                    Batch
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleBatchGenerate}
                  disabled={
                    controlsDisabled ||
                    !isBatchMode ||
                    pendingPrompts.length === 0
                  }
                  className="rounded-full px-3 py-1 text-[10px] font-semibold bg-gradient-to-r from-teal-400/90 to-lime-300/90 text-black hover:from-teal-300 hover:to-lime-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3">
                {/* Compact sliders */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-medium text-gray-300">
                        Zoom
                      </span>
                      <span className="text-[10px] text-gray-400 tabular-nums">
                        {zoomLevel}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={zoomLevel}
                      onChange={(e) => setZoomLevel(Number(e.target.value))}
                      onPointerUp={() => {
                        const base = getSelectedImage()?.zoomPercent ?? 100;
                        if (zoomLevel !== base) handleZoomRelease(zoomLevel);
                      }}
                      disabled={controlsDisabled}
                      style={{
                        background: `linear-gradient(90deg, rgba(45,212,191,0.95) 0%, rgba(163,230,53,0.90) ${(zoomLevel / 200) * 100}%, rgba(255,255,255,0.14) ${(zoomLevel / 200) * 100}%, rgba(255,255,255,0.14) 100%)`,
                      }}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-transparent disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-medium text-gray-300">
                        Brightness
                      </span>
                      <span className="text-[10px] text-gray-400 tabular-nums">
                        {brightnessLevel}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={brightnessLevel}
                      onChange={(e) =>
                        setBrightnessLevel(Number(e.target.value))
                      }
                      onPointerUp={() => {
                        const base =
                          getSelectedImage()?.brightnessPercent ?? 100;
                        if (brightnessLevel !== base)
                          handleBrightnessRelease(brightnessLevel);
                      }}
                      disabled={controlsDisabled}
                      style={{
                        background: `linear-gradient(90deg, rgba(45,212,191,0.95) 0%, rgba(163,230,53,0.90) ${(brightnessLevel / 200) * 100}%, rgba(255,255,255,0.14) ${(brightnessLevel / 200) * 100}%, rgba(255,255,255,0.14) 100%)`,
                      }}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-transparent disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                    />
                  </div>
                </div>
                {/* Compact quick tools */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <PositionButton
                      onClick={handleAlignLeftClick}
                      disabled={controlsDisabled}
                      isGenerating={isGenerating}
                      size="compact"
                      label="Left"
                      icon={AlignLeft}
                      toneClassName="bg-gradient-to-r from-sky-400/90 to-cyan-300/90 hover:from-sky-300 hover:to-cyan-200"
                    />
                    <PositionButton
                      onClick={handleCenterClick}
                      disabled={controlsDisabled}
                      isGenerating={isGenerating}
                      size="compact"
                      label="Center"
                      icon={Focus}
                      toneClassName="bg-gradient-to-r from-teal-400/90 to-lime-300/90 hover:from-teal-300 hover:to-lime-200"
                    />
                    <PositionButton
                      onClick={handleAlignRightClick}
                      disabled={controlsDisabled}
                      isGenerating={isGenerating}
                      size="compact"
                      label="Right"
                      icon={AlignRight}
                      toneClassName="bg-gradient-to-r from-rose-400/90 to-amber-300/90 hover:from-rose-300 hover:to-amber-200"
                    />
                  </div>
                  <MakeOldButton
                    onClick={handleMakeOlder}
                    disabled={controlsDisabled}
                    isGenerating={isGenerating}
                    size="compact"
                  />
                </div>
              </div>
              <div className="mt-3">
                <textarea
                  value={manualPrompt}
                  onChange={(e) => setManualPrompt(e.target.value)}
                  placeholder="Describe an edit"
                  rows={3}
                  disabled={controlsDisabled}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[10px] text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-0 app-focus disabled:opacity-50"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-[color:var(--app-faint)]">
                    {isBatchMode
                      ? `Queued ${pendingPrompts.length}`
                      : "Runs immediately"}
                  </span>
                  <button
                    type="button"
                    onClick={handleManualSubmit}
                    disabled={
                      controlsDisabled || manualPrompt.trim().length === 0
                    }
                    className="rounded-full px-3 py-1 text-[10px] font-semibold bg-gradient-to-r from-sky-400/90 to-blue-300/90 text-black hover:from-sky-300 hover:to-blue-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBatchMode ? "Add prompt" : "Generate"}
                  </button>
                </div>
              </div>
            </section>

            {/* History timeline */}
            <section className="app-card rounded-2xl lg:rounded-3xl p-3 lg:p-5">
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
                          const nextNode = row.path[depth + 1];
                          const image = node?.image;
                          const visibleImage =
                            depth >= row.visibleFromDepth ? image : undefined;
                          const showNode = !!visibleImage;
                          const isSelected =
                            visibleImage?._id === selectedHistoryId;
                          const isOriginal = image?.stepNumber === 0;
                          const isLast = image?._id === latestImage._id;
                          const canDelete =
                            showNode &&
                            ((isOriginal && images.length >= 1) ||
                              (isLast && !isOriginal));
                          const deleteTitle = isOriginal
                            ? "Delete original (reset project)"
                            : "Delete last step";

                          const editType =
                            nextNode?.image.editType ?? "unknown";
                          const meta =
                            editTypeIconMap[editType] ??
                            editTypeIconMap.unknown;
                          const EditIcon = meta.icon;
                          const isBranchJoin =
                            row.branchDepth > 0 &&
                            depth + 1 === row.branchDepth;
                          const shouldShowArrow =
                            !!image &&
                            !!nextNode &&
                            depth + 1 >= row.visibleFromDepth;
                          const ArrowIcon = isBranchJoin
                            ? ArrowDownRight
                            : ArrowRight;

                          return (
                            <div
                              key={`history-cell-${rowIndex}-${depth}`}
                              className="contents"
                            >
                              <div className="flex flex-col items-start">
                                <div className="relative">
                                  {visibleImage ? (
                                    <button
                                      type="button"
                                      disabled={controlsDisabled}
                                      onClick={() => {
                                        if (controlsDisabled) return;
                                        setSelectedImageId(visibleImage._id);
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
                                  ) : (
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-24 lg:h-24 opacity-0 pointer-events-none" />
                                  )}

                                  {showNode && canDelete && (
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
                                          handleDeleteLastStep();
                                        }
                                      }}
                                      className="absolute -right-1 -top-1 lg:-right-2 lg:-top-2 h-5 w-5 lg:h-7 lg:w-7 rounded-full border border-white/15 bg-black/60 backdrop-blur grid place-items-center text-xs lg:text-sm font-semibold text-white transition hover:bg-black/80 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      x
                                    </button>
                                  )}
                                </div>

                                {visibleImage ? (
                                  <div className="mt-1 lg:mt-2 w-full flex items-center justify-between gap-1">
                                    <div className="justify-center text-[10px] lg:text-xs text-[color:var(--app-muted)]">
                                      {isOriginal
                                        ? "Original"
                                        : isLast
                                          ? "Last"
                                          : `#${visibleImage.stepNumber}`}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-1 lg:mt-2 h-5 lg:h-6" />
                                )}
                              </div>

                              {depth < historyColumns - 1 && (
                                <div className="flex items-center justify-center w-7 sm:w-9 lg:w-12">
                                  {shouldShowArrow ? (
                                    <div className="flex items-center gap-1 text-[color:var(--app-faint)]">
                                      <ArrowIcon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                      <div
                                        title={meta.label}
                                        className="h-5 w-5 lg:h-6 lg:w-6 rounded-full border border-white/15 bg-black/60 backdrop-blur grid place-items-center text-white/90"
                                      >
                                        <EditIcon className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-5 w-5 lg:h-6 lg:w-6" />
                                  )}
                                </div>
                              )}
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
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Generation mode</h2>
                <button
                  type="button"
                  onClick={handleBatchGenerate}
                  disabled={
                    controlsDisabled ||
                    !isBatchMode ||
                    pendingPrompts.length === 0
                  }
                  className="rounded-full px-3 py-1 text-xs font-semibold bg-gradient-to-r from-teal-400/90 to-lime-300/90 text-black hover:from-teal-300 hover:to-lime-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
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
                </div>
                <span className="text-xs text-[color:var(--app-faint)]">
                  {isBatchMode
                    ? `Queued prompts: ${pendingPrompts.length}`
                    : "Runs instantly"}
                </span>
              </div>
              <div className="mt-4">
                <textarea
                  value={manualPrompt}
                  onChange={(e) => setManualPrompt(e.target.value)}
                  placeholder="Describe an edit"
                  rows={4}
                  disabled={controlsDisabled}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-0 app-focus disabled:opacity-50"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-[color:var(--app-faint)]">
                    {isBatchMode
                      ? "Add multiple prompts, then generate once."
                      : "Submit to generate immediately."}
                  </span>
                  <button
                    type="button"
                    onClick={handleManualSubmit}
                    disabled={
                      controlsDisabled || manualPrompt.trim().length === 0
                    }
                    className="rounded-full px-4 py-2 text-xs font-semibold bg-gradient-to-r from-sky-400/90 to-blue-300/90 text-black hover:from-sky-300 hover:to-blue-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBatchMode ? "Add prompt" : "Generate"}
                  </button>
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
              <h2 className="text-sm font-semibold">Quick tools</h2>
              <p className="mt-1 text-sm text-[color:var(--app-muted)]">
                One-click edits{" "}
                {isBatchMode ? "queue prompts" : "generate a new step"}.
              </p>
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <PositionButton
                    onClick={handleAlignLeftClick}
                    disabled={controlsDisabled}
                    isGenerating={isGenerating}
                    label="Left"
                    icon={AlignLeft}
                    toneClassName="bg-gradient-to-r from-sky-400/90 to-cyan-300/90 hover:from-sky-300 hover:to-cyan-200"
                  />
                  <PositionButton
                    onClick={handleCenterClick}
                    disabled={controlsDisabled}
                    isGenerating={isGenerating}
                    label="Center"
                    icon={Focus}
                    toneClassName="bg-gradient-to-r from-teal-400/90 to-lime-300/90 hover:from-teal-300 hover:to-lime-200"
                  />
                  <PositionButton
                    onClick={handleAlignRightClick}
                    disabled={controlsDisabled}
                    isGenerating={isGenerating}
                    label="Right"
                    icon={AlignRight}
                    toneClassName="bg-gradient-to-r from-rose-400/90 to-amber-300/90 hover:from-rose-300 hover:to-amber-200"
                  />
                </div>
                <MakeOldButton
                  onClick={handleMakeOlder}
                  disabled={controlsDisabled}
                  isGenerating={isGenerating}
                />
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}

export default App;
