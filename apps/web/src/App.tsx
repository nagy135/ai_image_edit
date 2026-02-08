import { useState, useEffect } from "react";
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
  AlignLeft,
  AlignRight,
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
  Trash2,
} from "lucide-react";
import { EditSlider } from "./components/EditSlider";
import { PositionButton } from "./components/buttons/PositionButton";
import { UploadView } from "./components/UploadView";
import { useImageChain } from "./hooks/useImageChain";
import { useImageGeneration } from "./hooks/useImageGeneration";
import {
  getSelectedImage,
  getLatestImage,
  buildHistoryLayout,
  buildZoomPrompt,
  buildBrightnessPrompt,
  getTooltipText,
  getImageUrl,
} from "./utils";
import { APP_SHELL_STYLE, EDIT_TYPE_ICON_MAP, PROMPTS } from "./constants";
import type { Id } from "./types";

function App() {
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
  } = useImageChain(false, selectedImageId, setSelectedImageId);

   // Image generation management
   const {
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
     setPendingPrompts,
    } = useImageGeneration(
     currentChainId,
     images,
     () => getSelectedImage(images, selectedImageId),
     setSelectedImageId,
     selectedModel,
   );

  const controlsDisabled = isGenerating;

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

  // Show upload view when no chain selected
  if (showUpload || !currentChainId || !images || images.length === 0) {
    return (
      <UploadView
        allChains={allChains}
        uploadDisabled={uploadDisabled}
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

  const latestImage = getLatestImage(images);
  const latestStepNumber = latestImage?.stepNumber ?? 0;

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

  return (
    <div
      className="min-h-screen px-3 py-4 lg:px-6 lg:py-8"
      style={APP_SHELL_STYLE}
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
            <Button
              type="button"
              onClick={handleNewImage}
              disabled={controlsDisabled}
              variant="secondary"
              className="h-auto rounded-full px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              New
            </Button>
          </div>
        </header>

        <main className="mt-6 grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-start">
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
              <div className="mt-2 lg:mt-4 flex flex-row items-center justify-between gap-1 lg:gap-2">
                <div className="flex items-center gap-1 lg:gap-2 flex-wrap">
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
                <Button
                  type="button"
                  onClick={handleBatchGenerate}
                  disabled={
                    controlsDisabled ||
                    !isBatchMode ||
                    pendingPrompts.length === 0
                  }
                  variant="ghost"
                  className="h-auto rounded-full px-3 py-1 text-[10px] font-semibold bg-gradient-to-r from-teal-400/90 to-lime-300/90 text-black hover:from-teal-300 hover:to-lime-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate
                </Button>
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
                         const base = getSelectedImage(images, selectedImageId)?.zoomPercent ?? 100;
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
                           getSelectedImage(images, selectedImageId)?.brightnessPercent ?? 100;
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
                {/* Compact quick tools - 3x3 grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Row 1: Position */}
                  <PositionButton
                    onClick={handleAlignLeftClick}
                    disabled={controlsDisabled}
                    size="compact"
                    label="Left"
                    icon={AlignLeft}
                    toneClassName="bg-gradient-to-r from-sky-400/90 to-cyan-300/90 hover:from-sky-300 hover:to-cyan-200"
                  />
                  <PositionButton
                    onClick={handleCenterClick}
                    disabled={controlsDisabled}
                    size="compact"
                    label="Center"
                    icon={Focus}
                    toneClassName="bg-gradient-to-r from-teal-400/90 to-lime-300/90 hover:from-teal-300 hover:to-lime-200"
                  />
                  <PositionButton
                    onClick={handleAlignRightClick}
                    disabled={controlsDisabled}
                    size="compact"
                    label="Right"
                    icon={AlignRight}
                    toneClassName="bg-gradient-to-r from-rose-400/90 to-amber-300/90 hover:from-rose-300 hover:to-amber-200"
                  />
                  {/* Row 2: Age */}
                  <PositionButton
                    onClick={handleMakeOlder}
                    disabled={controlsDisabled}
                    size="compact"
                    label="Old"
                    icon={Sparkles}
                    toneClassName="bg-gradient-to-r from-amber-500/90 to-orange-400/90 hover:from-amber-400 hover:to-orange-300"
                  />
                  <PositionButton
                    onClick={handleMakeYoung}
                    disabled={controlsDisabled}
                    size="compact"
                    label="Young"
                    icon={Baby}
                    toneClassName="bg-gradient-to-r from-pink-400/90 to-rose-300/90 hover:from-pink-300 hover:to-rose-200"
                  />
                  <PositionButton
                    onClick={handleDuplicateObject}
                    disabled={controlsDisabled}
                    size="compact"
                    label="Duplicate"
                    icon={Copy}
                    toneClassName="bg-gradient-to-r from-emerald-500/90 to-teal-400/90 hover:from-emerald-400 hover:to-teal-300"
                  />
                  {/* Row 3: Background */}
                  <PositionButton
                    onClick={handleDeleteBackground}
                    disabled={controlsDisabled}
                    size="compact"
                    label="Remove BG"
                    icon={Eraser}
                    toneClassName="bg-gradient-to-r from-red-500/90 to-pink-400/90 hover:from-red-400 hover:to-pink-300"
                  />
                  <PositionButton
                    onClick={handleAddBackground}
                    disabled={controlsDisabled}
                    size="compact"
                    label="Add BG"
                    icon={ImagePlus}
                    toneClassName="bg-gradient-to-r from-indigo-500/90 to-purple-400/90 hover:from-indigo-400 hover:to-purple-300"
                  />
                  <PositionButton
                    onClick={handleRemoveObject}
                    disabled={controlsDisabled}
                    size="compact"
                    label="Clean Up"
                    icon={Trash2}
                    toneClassName="bg-gradient-to-r from-slate-500/90 to-gray-400/90 hover:from-slate-400 hover:to-gray-300"
                  />
                  {/* Row 4: Shape */}
                  <PositionButton
                    onClick={handleMakeSquare}
                    disabled={controlsDisabled}
                    size="compact"
                    label="Square"
                    icon={Square}
                    toneClassName="bg-gradient-to-r from-violet-500/90 to-purple-400/90 hover:from-violet-400 hover:to-purple-300"
                  />
                  <PositionButton
                    onClick={handleMakeCircular}
                    disabled={controlsDisabled}
                    size="compact"
                    label="Circular"
                    icon={Circle}
                    toneClassName="bg-gradient-to-r from-fuchsia-500/90 to-pink-400/90 hover:from-fuchsia-400 hover:to-pink-300"
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
                  <Button
                    type="button"
                    onClick={handleManualSubmit}
                    disabled={
                      controlsDisabled || manualPrompt.trim().length === 0
                    }
                    variant="ghost"
                    className="h-auto rounded-full px-3 py-1 text-[10px] font-semibold bg-gradient-to-r from-sky-400/90 to-blue-300/90 text-black hover:from-sky-300 hover:to-blue-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBatchMode ? "Add prompt" : "Generate"}
                  </Button>
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
                                              setSelectedImageId(
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
                                          <p className="text-left leading-relaxed break-words">
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
               <div className="space-y-4">
                 <div>
                   <label className="text-xs font-medium text-gray-300 block mb-2">
                     Generation Mode
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
                 </div>

                 <div>
                   <label className="text-xs font-medium text-gray-300 block mb-2">
                     Model
                   </label>
                   <Select value={selectedModel} onValueChange={setSelectedModel}>
                     <SelectTrigger className="w-full border-white/10 bg-black/30 text-white">
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
      </div>
    </div>
  );
}

export default App;
