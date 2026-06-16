import { useEffect, useRef } from "react";
import { Copy, Download, Link2 } from "lucide-react";

import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import type { Id, ImageWithUrl } from "../../types";
import { getImageUrl, getTooltipText } from "../../utils";
import type { ImageViewerMode } from "../../stores/useImageViewerStore";

type ImageActionState = "idle" | "copying" | "copied" | "error";
type DownloadActionState = "idle" | "downloading" | "done" | "error";

type MainImageSectionProps = {
  imagesCount: number;
  currentChainId: Id<"imageChains"> | null;
  currentImage: ImageWithUrl;
  originalImage: ImageWithUrl;
  historyPathImages: ImageWithUrl[];
  selectedHistoryId: Id<"images">;
  latestStepNumber: number;
  currentImageSrc: string;
  imageViewerMode: ImageViewerMode;
  setImageViewerMode: (mode: ImageViewerMode) => void;
  alternateShowingOriginal: boolean;
  setAlternateShowingOriginal: (updater: (value: boolean) => boolean) => void;
  canCompareWithOriginal: boolean;
  controlsDisabled: boolean;
  isGenerating: boolean;
  activePrompt: string | null;
  copyState: ImageActionState;
  downloadState: DownloadActionState;
  imageActionMessage: string | null;
  onOpenHistoryModal: () => void;
  onSelectImage: (imageId: Id<"images">) => void;
  onCopyCurrentImage: () => void;
  onDownloadCurrentImage: () => void;
  onShareLink: () => void;
};

function ViewerModeButton({
  mode,
  activeMode,
  label,
  title,
  onChange,
}: {
  mode: ImageViewerMode;
  activeMode: ImageViewerMode;
  label: string;
  title: string;
  onChange: (mode: ImageViewerMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(mode);
      }}
      aria-pressed={activeMode === mode}
      title={title}
      className={`rounded-full px-2 py-1 text-[10px] font-semibold transition ${
        activeMode === mode
          ? "bg-white/15 text-white"
          : "text-[color:var(--app-muted)] hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function ViewerImage({
  image,
  showOriginalBadge,
  label,
  imageClassName,
}: {
  image: ImageWithUrl;
  showOriginalBadge?: boolean;
  label?: string;
  imageClassName?: string;
}) {
  return (
    <div className="relative rounded-xl border border-white/10 bg-black/20 overflow-hidden">
      <img
        src={getImageUrl(image.url ?? "", image.createdAt)}
        alt={
          showOriginalBadge
            ? `Original (Step ${image.stepNumber})`
            : `Step ${image.stepNumber}`
        }
        className={
          imageClassName ??
          "w-full h-auto max-h-[52vh] lg:max-h-[56vh] object-contain"
        }
      />
      {showOriginalBadge && (
        <span className="absolute left-2 top-2 app-badge rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/90 bg-black/60 border border-white/15 backdrop-blur">
          ORIGINAL
        </span>
      )}
      {label && (
        <span className="absolute right-2 bottom-2 app-badge rounded-full px-2 py-0.5 text-[10px] text-[color:var(--app-muted)] bg-black/60 border border-white/10 backdrop-blur">
          {label}
        </span>
      )}
    </div>
  );
}

function HistoryBranchStrip({
  historyPathImages,
  selectedHistoryId,
  controlsDisabled,
  onSelectImage,
}: {
  historyPathImages: ImageWithUrl[];
  selectedHistoryId: Id<"images">;
  controlsDisabled: boolean;
  onSelectImage: (imageId: Id<"images">) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    scrollElement.scrollTo({
      left: scrollElement.scrollWidth,
      behavior: "smooth",
    });
  }, [selectedHistoryId, historyPathImages.length]);

  return (
    <div
      ref={scrollRef}
      className="h-[52vh] min-h-[260px] lg:h-[56vh] overflow-x-auto overflow-y-hidden pt-10 pb-2"
    >
      <div className="flex h-full min-w-full w-max items-stretch justify-end gap-2 lg:gap-3">
        {historyPathImages.map((image, index) => {
          const isSelected = image._id === selectedHistoryId;

          return (
            <div
              key={image._id}
              className="flex h-full shrink-0 items-stretch gap-2 lg:gap-3"
            >
              {index > 0 && (
                <div className="flex h-full w-5 shrink-0 items-center justify-center text-[color:var(--app-faint)]">
                  <span className="h-px w-full bg-white/15" />
                </div>
              )}
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={controlsDisabled}
                      onClick={() => {
                        if (controlsDisabled) return;
                        onSelectImage(image._id);
                      }}
                      className={`group relative grid h-full w-[min(72vw,340px)] shrink-0 place-items-center rounded-xl border bg-black/20 overflow-hidden text-left transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                        isSelected
                          ? "border-teal-300/70 shadow-[0_0_0_2px_rgba(45,212,191,0.18)]"
                          : "border-white/10 hover:border-white/25"
                      }`}
                    >
                      <img
                        src={getImageUrl(image.url ?? "", image.createdAt)}
                        alt={`Step ${image.stepNumber}`}
                        className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-[1.01]"
                      />
                      {image.stepNumber === 0 && (
                        <span className="absolute left-2 top-2 app-badge rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/90 bg-black/60 border border-white/15 backdrop-blur">
                          ORIGINAL
                        </span>
                      )}
                      <span className="absolute right-2 bottom-2 app-badge rounded-full px-2 py-0.5 text-[10px] text-[color:var(--app-muted)] bg-black/60 border border-white/10 backdrop-blur">
                        {isSelected
                          ? `Selected step ${image.stepNumber}`
                          : `Step ${image.stepNumber}`}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[320px]">
                    <p className="text-left leading-relaxed break-words whitespace-pre-wrap">
                      {getTooltipText(image)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MainImageSection({
  imagesCount,
  currentChainId,
  currentImage,
  originalImage,
  historyPathImages,
  selectedHistoryId,
  latestStepNumber,
  currentImageSrc,
  imageViewerMode,
  setImageViewerMode,
  alternateShowingOriginal,
  setAlternateShowingOriginal,
  canCompareWithOriginal,
  controlsDisabled,
  isGenerating,
  activePrompt,
  copyState,
  downloadState,
  imageActionMessage,
  onOpenHistoryModal,
  onSelectImage,
  onCopyCurrentImage,
  onDownloadCurrentImage,
  onShareLink,
}: MainImageSectionProps) {
  return (
    <section className="app-card rounded-3xl p-3 lg:p-5">
      <div className="flex flex-row-reverse pb-2">
        <div>
          <Button
            type="button"
            size="sm"
            onClick={onOpenHistoryModal}
            variant="secondary"
            className="lg:hidden w-full h-auto rounded-2xl px-3 py-2 text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition cursor-pointer"
          >
            History ({imagesCount} steps)
          </Button>
        </div>
      </div>

      <div className="relative rounded-2xl border border-white/10 bg-black/20 p-2 lg:p-3 overflow-hidden">
        <div className="absolute right-2 top-2 z-20">
          <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/60 backdrop-blur px-1 py-1">
            <ViewerModeButton
              mode="current"
              activeMode={imageViewerMode}
              label="Current"
              title="Only show current photo"
              onChange={setImageViewerMode}
            />
            <ViewerModeButton
              mode="sideBySide"
              activeMode={imageViewerMode}
              label="Side"
              title="Side by side: original + current"
              onChange={setImageViewerMode}
            />
            <ViewerModeButton
              mode="alternate"
              activeMode={imageViewerMode}
              label="Alternate"
              title="Click to alternate: original <-> current"
              onChange={setImageViewerMode}
            />
            <ViewerModeButton
              mode="history"
              activeMode={imageViewerMode}
              label="History"
              title="Show full image history"
              onChange={setImageViewerMode}
            />
          </div>
        </div>

        {imageViewerMode === "current" && (
          <ViewerImage
            image={currentImage}
            showOriginalBadge={currentImage.stepNumber === 0}
            label="Selected"
          />
        )}

        {imageViewerMode === "sideBySide" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3">
            <ViewerImage
              image={originalImage}
              showOriginalBadge
              label="Original"
              imageClassName="w-full h-auto max-h-[26vh] sm:max-h-[52vh] lg:max-h-[56vh] object-contain"
            />
            <ViewerImage
              image={currentImage}
              showOriginalBadge={currentImage.stepNumber === 0}
              label="Selected"
              imageClassName="w-full h-auto max-h-[26vh] sm:max-h-[52vh] lg:max-h-[56vh] object-contain"
            />
          </div>
        )}

        {imageViewerMode === "alternate" && (
          <button
            type="button"
            onClick={() => {
              if (!canCompareWithOriginal) return;
              setAlternateShowingOriginal((prev) => !prev);
            }}
            className="relative block w-full text-left cursor-pointer"
            disabled={!canCompareWithOriginal}
            title={
              canCompareWithOriginal
                ? "Click to alternate"
                : "No alternate view available"
            }
          >
            <ViewerImage
              image={alternateShowingOriginal ? originalImage : currentImage}
              showOriginalBadge={
                alternateShowingOriginal || currentImage.stepNumber === 0
              }
              label={alternateShowingOriginal ? "Original" : "Selected"}
            />
            {canCompareWithOriginal && (
              <span className="absolute left-3 bottom-3 z-10 app-badge rounded-full px-2 py-0.5 text-[10px] text-[color:var(--app-muted)] bg-black/60 border border-white/10 backdrop-blur">
                Click to alternate
              </span>
            )}
          </button>
        )}

        {imageViewerMode === "history" && (
          <HistoryBranchStrip
            historyPathImages={historyPathImages}
            selectedHistoryId={selectedHistoryId}
            controlsDisabled={controlsDisabled}
            onSelectImage={onSelectImage}
          />
        )}

        {isGenerating && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/45">
            <div className="app-card-2 rounded-2xl px-4 py-3 lg:px-5 lg:py-4 max-w-[90%]">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="h-4 w-4 lg:h-5 lg:w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <div className="space-y-1">
                  <p className="text-xs lg:text-sm font-semibold">Working...</p>
                  <p className="text-[10px] lg:text-xs text-[color:var(--app-muted)] hidden sm:block">
                    Controls locked until the new image arrives.
                  </p>
                </div>
              </div>
              {activePrompt && (
                <p className="mt-3 text-[10px] lg:text-xs text-[color:var(--app-muted)] break-words whitespace-pre-wrap">
                  {activePrompt}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 lg:mt-3 flex flex-wrap items-center justify-end gap-2">
        {imageActionMessage && (
          <span className="text-[10px] lg:text-xs text-[color:var(--app-faint)]">
            {imageActionMessage}
          </span>
        )}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={onCopyCurrentImage}
            disabled={!currentImageSrc || copyState === "copying"}
            variant="secondary"
            className="h-auto rounded-full px-3 py-1.5 lg:px-4 lg:py-2 text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            title="Copy current image to clipboard"
          >
            <Copy className="h-3.5 w-3.5" />
            {copyState === "copied" ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button"
            onClick={onDownloadCurrentImage}
            disabled={!currentImageSrc || downloadState === "downloading"}
            variant="secondary"
            className="h-auto rounded-full px-3 py-1.5 lg:px-4 lg:py-2 text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            title="Download current image"
          >
            <Download className="h-3.5 w-3.5" />
            {downloadState === "done" ? "Downloaded" : "Download"}
          </Button>
          <Button
            type="button"
            onClick={onShareLink}
            disabled={!currentChainId}
            variant="secondary"
            className="h-auto rounded-full px-3 py-1.5 lg:px-4 lg:py-2 text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            title="Copy a link anyone can edit (uses their credits)"
          >
            <Link2 className="h-3.5 w-3.5" />
            Share
          </Button>
        </div>
      </div>

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
        <div className="hidden lg:block text-xs text-[color:var(--app-faint)] break-words max-w-[64ch] whitespace-pre-wrap">
          {currentImage.prompt
            ? `"${currentImage.prompt}"`
            : "No prompt for this step"}
        </div>
      </div>

      <div className="lg:hidden mt-2 text-[10px] text-[color:var(--app-faint)] break-words whitespace-pre-wrap">
        {currentImage.prompt
          ? `"${currentImage.prompt}"`
          : "No prompt for this step"}
      </div>
    </section>
  );
}
