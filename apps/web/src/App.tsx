import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@repo/convex-backend/convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import type { Doc, Id } from "@repo/convex-backend/convex/_generated/dataModel";
import { EditSlider } from "./components/EditSlider";
import {
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

function CenterButton({
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
      className={`flex items-center justify-center transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-teal-400/90 to-lime-300/90 text-black hover:from-teal-300 hover:to-lime-200 font-semibold ${
        isCompact
          ? "gap-1.5 rounded-xl px-2 py-2 text-xs"
          : "gap-2 rounded-2xl px-4 py-3 text-sm shadow-[0_18px_40px_rgba(45,212,191,0.16)]"
      }`}
    >
      <Focus className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {isGenerating ? (isCompact ? "..." : "Generating...") : "Center"}
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

function ManualButton({
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
      className={`flex items-center justify-center transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-sky-400/90 to-blue-300/90 text-black hover:from-sky-300 hover:to-blue-200 font-semibold ${
        isCompact
          ? "gap-1.5 rounded-xl px-2 py-2 text-xs"
          : "gap-2 rounded-2xl px-4 py-3 text-sm shadow-[0_18px_40px_rgba(56,189,248,0.16)]"
      }`}
    >
      <PencilLine className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {isGenerating ? (isCompact ? "..." : "Generating...") : "Manual"}
    </button>
  );
}

type ImageDoc = Doc<"images">;
type ChainDoc = Doc<"imageChains">;
type ImageWithUrl = ImageDoc & { url: string | null };
type ChainWithUrl = ChainDoc & { originalUrl: string | null };
type EditType = ImageDoc["editType"];

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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualPrompt, setManualPrompt] = useState("");

  // Slider states
  const [zoomLevel, setZoomLevel] = useState(100);
  const [brightnessLevel, setBrightnessLevel] = useState(100);

  // Controls disabled when generating
  const controlsDisabled = isGenerating;
  const uploadDisabled = isUploading;

  // When images change, select the latest one
  useEffect(() => {
    if (images && images.length > 0) {
      setSelectedImageIndex(images.length - 1);
    }
  }, [images?.length]);

  // When the selected image changes, reflect its stored adjustment values.
  useEffect(() => {
    if (!images || images.length === 0) return;
    const img = images[selectedImageIndex];
    if (!img) return;
    setZoomLevel(img.zoomPercent ?? 100);
    setBrightnessLevel(img.brightnessPercent ?? 100);
  }, [images, selectedImageIndex]);

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
      setSelectedImageIndex(0);
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

  const handleNewImage = () => {
    setCurrentChainId(null);
    setShowUpload(true);
    setSelectedImageIndex(0);
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

  // Generic function for generating images with a prompt
  const generateImage = async (
    prompt: string,
    editType: EditType,
    nextZoomPercent?: number,
    nextBrightnessPercent?: number,
  ) => {
    if (!currentChainId || !images || images.length === 0) return;

    setIsGenerating(true);
    try {
      const sourceImage =
        images[selectedImageIndex] ?? images[images.length - 1];
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
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image: " + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCenterClick = async () => {
    const source = images?.[selectedImageIndex];
    await generateImage(
      "Center the main object in the image",
      "center",
      source?.zoomPercent ?? zoomLevel,
      source?.brightnessPercent ?? brightnessLevel,
    );
  };

  const handleZoomRelease = async (value: number) => {
    const base = images?.[selectedImageIndex]?.zoomPercent ?? 100;
    if (value === base) return;
    const direction = value > base ? "in" : "out";
    const amount = Math.abs(value - base);
    const prompt = `Adjust the zoom ${direction} by about ${amount}%. Target zoom ${value}% (100% = original framing). Keep the same subject and style.`;
    const brightness = images?.[selectedImageIndex]?.brightnessPercent ?? 100;
    await generateImage(prompt, "zoom", value, brightness);
  };

  const handleBrightnessRelease = async (value: number) => {
    const base = images?.[selectedImageIndex]?.brightnessPercent ?? 100;
    if (value === base) return;
    const direction = value > base ? "brighter" : "darker";
    const amount = Math.abs(value - base);
    const prompt = `Make the image about ${amount}% ${direction}. Target brightness ${value}% (100% = original). Adjust overall brightness/exposure while keeping the same subject and composition.`;
    const zoom = images?.[selectedImageIndex]?.zoomPercent ?? 100;
    await generateImage(prompt, "brightness", zoom, value);
  };

   const handleSelectChain = (chainId: Id<"imageChains">) => {
     setCurrentChainId(chainId);
     setShowUpload(false);
     setSelectedImageIndex(0);
   };

   const handleMakeOlder = async () => {
     const source = images?.[selectedImageIndex];
      await generateImage(
        "Make everyone and everything in this photo look noticeably older. Add wrinkles, age spots, graying hair, aged appearance to any people. Show aging effects on objects and surroundings as well.",
        "make_old",
        source?.zoomPercent ?? zoomLevel,
        source?.brightnessPercent ?? brightnessLevel,
      );
    };

   const handleManualSubmit = async () => {
     const nextPrompt = manualPrompt.trim();
     if (!nextPrompt) return;
     const source = images?.[selectedImageIndex];
     await generateImage(
       nextPrompt,
       "manual",
       source?.zoomPercent ?? zoomLevel,
       source?.brightnessPercent ?? brightnessLevel,
     );
     setManualPrompt("");
     setIsManualOpen(false);
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
  const safeSelectedImageIndex = Math.min(
    selectedImageIndex,
    Math.max(0, images.length - 1),
  );
  const currentImage = images[safeSelectedImageIndex];
  const latestStepNumber = images.reduce(
    (max, img) => Math.max(max, img.stepNumber),
    0,
  );

  const editTypeIconMap: Record<string, { icon: typeof Focus; label: string }> = {
    original: { icon: ImageIcon, label: "Original" },
    center: { icon: Focus, label: "Center" },
    make_old: { icon: Sparkles, label: "Make old" },
    manual: { icon: PencilLine, label: "Manual" },
    zoom: { icon: ZoomIn, label: "Zoom" },
    brightness: { icon: Sun, label: "Brightness" },
    unknown: { icon: Wand2, label: "Edit" },
  };

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
                    <div className="app-card-2 rounded-2xl px-4 py-3 lg:px-5 lg:py-4">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="h-4 w-4 lg:h-5 lg:w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <div>
                          <p className="text-xs lg:text-sm font-semibold">Working...</p>
                          <p className="text-[10px] lg:text-xs text-[color:var(--app-muted)] hidden sm:block">
                            Controls locked until the new image arrives.
                          </p>
                        </div>
                      </div>
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
              <div className="grid grid-cols-2 gap-3">
                {/* Compact sliders */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-medium text-gray-300">Zoom</span>
                      <span className="text-[10px] text-gray-400 tabular-nums">{zoomLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={zoomLevel}
                      onChange={(e) => setZoomLevel(Number(e.target.value))}
                      onPointerUp={() => {
                        const base = images?.[selectedImageIndex]?.zoomPercent ?? 100;
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
                      <span className="text-[10px] font-medium text-gray-300">Brightness</span>
                      <span className="text-[10px] text-gray-400 tabular-nums">{brightnessLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={brightnessLevel}
                      onChange={(e) => setBrightnessLevel(Number(e.target.value))}
                      onPointerUp={() => {
                        const base = images?.[selectedImageIndex]?.brightnessPercent ?? 100;
                        if (brightnessLevel !== base) handleBrightnessRelease(brightnessLevel);
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
                <div className="flex flex-col gap-2">
                  <CenterButton
                    onClick={handleCenterClick}
                    disabled={controlsDisabled}
                    isGenerating={isGenerating}
                    size="compact"
                  />
                  <MakeOldButton
                    onClick={handleMakeOlder}
                    disabled={controlsDisabled}
                    isGenerating={isGenerating}
                    size="compact"
                  />
                  <ManualButton
                    onClick={() => setIsManualOpen(true)}
                    disabled={controlsDisabled}
                    isGenerating={isGenerating}
                    size="compact"
                  />
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

              <div className="mt-2 lg:mt-4 flex gap-2 lg:gap-3 overflow-x-auto pb-1 lg:pb-2">
                {images.map((image, index) => {
                  const isSelected = safeSelectedImageIndex === index;
                  const isOriginal = image.stepNumber === 0;
                  const isLast = index === images.length - 1;
                  const canDelete =
                    (isOriginal && images.length >= 1) ||
                    (isLast && !isOriginal);

                  const editType = image.editType ?? "unknown";
                  const meta = editTypeIconMap[editType] ??
                    editTypeIconMap.unknown;
                  const Icon = meta.icon;

                  const deleteTitle = isOriginal
                    ? "Delete original (reset project)"
                    : "Delete last step";

                  return (
                    <div
                      key={image._id}
                      className={`group flex-shrink-0 text-left transition ${
                        isSelected ? "" : "opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div className="relative">
                        <button
                          type="button"
                          disabled={controlsDisabled}
                          onClick={() => {
                            if (controlsDisabled) return;
                            setSelectedImageIndex(index);
                          }}
                          className={`block w-14 h-14 sm:w-16 sm:h-16 lg:w-24 lg:h-24 rounded-xl lg:rounded-2xl overflow-hidden border transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                            isSelected
                              ? "border-teal-300/70 shadow-[0_0_0_2px_rgba(45,212,191,0.18)] lg:shadow-[0_0_0_3px_rgba(45,212,191,0.18)]"
                              : "border-white/10"
                          }`}
                        >
                          <img
                            src={getImageUrl(image.url ?? "", image.createdAt)}
                            alt={`Step ${image.stepNumber}`}
                            className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                          <div className="absolute left-1 top-1 lg:left-2 lg:top-2 app-badge rounded-full px-1.5 py-0.5 lg:px-2 text-[8px] lg:text-[10px] text-[color:var(--app-muted)]">
                            {image.stepNumber}
                          </div>
                          <div
                            title={meta.label}
                            className="absolute right-1 top-1 lg:right-2 lg:top-2 h-5 w-5 lg:h-7 lg:w-7 rounded-full border border-white/15 bg-black/60 backdrop-blur grid place-items-center text-white/90"
                          >
                            <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          </div>
                        </button>

                        {canDelete && (
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

                      <div className="mt-1 lg:mt-2 text-[10px] lg:text-xs text-[color:var(--app-muted)]">
                        {isOriginal
                          ? "Orig"
                          : isLast
                            ? "Last"
                            : `#${image.stepNumber}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right sidebar: Tools (hidden on mobile, shown on large screens) */}
          <aside className="hidden lg:block space-y-5">
            <section className="app-card rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Adjustments</h2>
                <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
                  Release to apply
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
                One-click edits that generate a new step.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <CenterButton
                  onClick={handleCenterClick}
                  disabled={controlsDisabled}
                  isGenerating={isGenerating}
                />
                <MakeOldButton
                  onClick={handleMakeOlder}
                  disabled={controlsDisabled}
                  isGenerating={isGenerating}
                />
                <ManualButton
                  onClick={() => setIsManualOpen(true)}
                  disabled={controlsDisabled}
                  isGenerating={isGenerating}
                />
              </div>
            </section>
          </aside>
        </main>

        {isManualOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center px-4">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setIsManualOpen(false)}
            />
            <div className="relative w-full max-w-lg app-card rounded-3xl p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base lg:text-lg font-semibold">Manual edit</h2>
                  <p className="text-xs lg:text-sm text-[color:var(--app-muted)]">
                    Describe the change you want to apply.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManualOpen(false)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="mt-4">
                <textarea
                  value={manualPrompt}
                  onChange={(e) => setManualPrompt(e.target.value)}
                  placeholder="e.g., Remove the background and make the sky a soft sunrise gradient"
                  rows={5}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-0 app-focus"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] lg:text-xs text-[color:var(--app-faint)]">
                    Tip: Be specific about the subject, style, and constraints.
                  </span>
                  <button
                    type="button"
                    onClick={handleManualSubmit}
                    disabled={controlsDisabled || manualPrompt.trim().length === 0}
                    className="rounded-full px-4 py-2 text-xs lg:text-sm font-semibold bg-gradient-to-r from-sky-400/90 to-blue-300/90 text-black hover:from-sky-300 hover:to-blue-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? "Generating..." : "Apply manual edit"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
