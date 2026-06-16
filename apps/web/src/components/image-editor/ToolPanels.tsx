import type { Dispatch, SetStateAction } from "react";
import {
  AlignLeft,
  AlignRight,
  Baby,
  Circle,
  Copy,
  Eraser,
  Focus,
  ImagePlus,
  Scissors,
  Shirt,
  Sparkles,
  Square,
  Trash2,
  Wand2,
} from "lucide-react";

import { EditSlider } from "../EditSlider";
import { PositionButton } from "../buttons/PositionButton";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { Id } from "../../types";

export type ReferenceTool = "dress_me" | "change_hair";

type ToolHandlerProps = {
  onAlignLeft: () => void;
  onCenter: () => void;
  onAlignRight: () => void;
  onMakeOlder: () => void;
  onMakeYoung: () => void;
  onDuplicateObject: () => void;
  onDeleteBackground: () => void;
  onAddBackground: () => void;
  onRemoveObject: () => void;
  onMakeSquare: () => void;
  onMakeCircular: () => void;
  onPrettify: () => void;
  onDressMe: () => void;
  onChangeHair: () => void;
};

type SharedToolProps = ToolHandlerProps & {
  controlsDisabled: boolean;
  isBatchMode: boolean;
  pendingPromptsCount: number;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  batchReferenceStorageId: Id<"_storage"> | null;
  batchReferenceTool: ReferenceTool | null;
};

type GenerationModeProps = {
  controlsDisabled: boolean;
  isBatchMode: boolean;
  pendingPromptsCount: number;
  setIsBatchMode: Dispatch<SetStateAction<boolean>>;
  clearBatch: () => void;
  onBatchGenerate: () => void;
  compact?: boolean;
};

type ManualPromptProps = {
  controlsDisabled: boolean;
  isBatchMode: boolean;
  pendingPromptsCount: number;
  manualPrompt: string;
  setManualPrompt: (prompt: string) => void;
  onManualSubmit: () => void;
  compact?: boolean;
};

type MobileToolsPanelProps = SharedToolProps & {
  zoomLevel: number;
  brightnessLevel: number;
  setZoomLevel: (value: number) => void;
  setBrightnessLevel: (value: number) => void;
  onZoomRelease: (value: number) => void;
  onBrightnessRelease: (value: number) => void;
  setIsBatchMode: Dispatch<SetStateAction<boolean>>;
  clearBatch: () => void;
  onBatchGenerate: () => void;
  manualPrompt: string;
  setManualPrompt: (prompt: string) => void;
  onManualSubmit: () => void;
};

type DesktopToolsSidebarProps = SharedToolProps & {
  zoomLevel: number;
  brightnessLevel: number;
  setZoomLevel: (value: number) => void;
  setBrightnessLevel: (value: number) => void;
  onZoomRelease: (value: number) => void;
  onBrightnessRelease: (value: number) => void;
  setIsBatchMode: Dispatch<SetStateAction<boolean>>;
  clearBatch: () => void;
  onBatchGenerate: () => void;
  manualPrompt: string;
  setManualPrompt: (prompt: string) => void;
  onManualSubmit: () => void;
};

const quickTools = [
  {
    key: "left",
    label: "Left",
    icon: AlignLeft,
    handler: "onAlignLeft",
    tone:
      "bg-gradient-to-r from-sky-400/90 to-cyan-300/90 hover:from-sky-300 hover:to-cyan-200",
  },
  {
    key: "center",
    label: "Center",
    icon: Focus,
    handler: "onCenter",
    tone:
      "bg-gradient-to-r from-teal-400/90 to-lime-300/90 hover:from-teal-300 hover:to-lime-200",
  },
  {
    key: "right",
    label: "Right",
    icon: AlignRight,
    handler: "onAlignRight",
    tone:
      "bg-gradient-to-r from-rose-400/90 to-amber-300/90 hover:from-rose-300 hover:to-amber-200",
  },
  {
    key: "old",
    label: "Old",
    icon: Sparkles,
    handler: "onMakeOlder",
    tone:
      "bg-gradient-to-r from-amber-500/90 to-orange-400/90 hover:from-amber-400 hover:to-orange-300",
  },
  {
    key: "young",
    label: "Young",
    icon: Baby,
    handler: "onMakeYoung",
    tone:
      "bg-gradient-to-r from-pink-400/90 to-rose-300/90 hover:from-pink-300 hover:to-rose-200",
  },
  {
    key: "duplicate",
    label: "Duplicate",
    icon: Copy,
    handler: "onDuplicateObject",
    tone:
      "bg-gradient-to-r from-emerald-500/90 to-teal-400/90 hover:from-emerald-400 hover:to-teal-300",
  },
  {
    key: "remove-bg",
    label: "Remove BG",
    icon: Eraser,
    handler: "onDeleteBackground",
    tone:
      "bg-gradient-to-r from-red-500/90 to-pink-400/90 hover:from-red-400 hover:to-pink-300",
  },
  {
    key: "add-bg",
    label: "Add BG",
    icon: ImagePlus,
    handler: "onAddBackground",
    tone:
      "bg-gradient-to-r from-indigo-500/90 to-purple-400/90 hover:from-indigo-400 hover:to-purple-300",
  },
  {
    key: "clean-up",
    label: "Clean Up",
    icon: Trash2,
    handler: "onRemoveObject",
    tone:
      "bg-gradient-to-r from-slate-500/90 to-gray-400/90 hover:from-slate-400 hover:to-gray-300",
  },
  {
    key: "square",
    label: "Square",
    icon: Square,
    handler: "onMakeSquare",
    tone:
      "bg-gradient-to-r from-violet-500/90 to-purple-400/90 hover:from-violet-400 hover:to-purple-300",
  },
  {
    key: "circular",
    label: "Circular",
    icon: Circle,
    handler: "onMakeCircular",
    tone:
      "bg-gradient-to-r from-fuchsia-500/90 to-pink-400/90 hover:from-fuchsia-400 hover:to-pink-300",
  },
  {
    key: "prettify",
    label: "Prettify",
    icon: Wand2,
    handler: "onPrettify",
    tone:
      "bg-gradient-to-r from-cyan-400/90 to-blue-300/90 hover:from-cyan-300 hover:to-blue-200",
  },
] as const;

function ModelSelect({
  selectedModel,
  setSelectedModel,
  compact,
}: {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  compact?: boolean;
}) {
  return (
    <div>
      <label
        className={`${compact ? "text-[10px]" : "text-xs"} font-medium text-gray-300 block mb-2`}
      >
        Model
      </label>
      <Select value={selectedModel} onValueChange={setSelectedModel}>
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
  );
}

function GenerationModeControls({
  controlsDisabled,
  isBatchMode,
  pendingPromptsCount,
  setIsBatchMode,
  clearBatch,
  onBatchGenerate,
  compact,
}: GenerationModeProps) {
  const textClass = compact ? "text-[10px]" : "text-xs";

  return (
    <div className={compact ? "flex items-center justify-between gap-2" : ""}>
      {!compact && (
        <label className="text-xs font-medium text-gray-300 block mb-2">
          Mode
        </label>
      )}
      <div className="flex items-center gap-2">
        <span className={`${textClass} text-[color:var(--app-muted)]`}>
          Oneshot
        </span>
        <button
          type="button"
          onClick={() => {
            if (controlsDisabled) return;
            setIsBatchMode((prev) => !prev);
            clearBatch();
          }}
          disabled={controlsDisabled}
          className={`relative ${compact ? "h-5 w-9" : "h-6 w-11"} rounded-full border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            isBatchMode
              ? "bg-teal-400/80 border-teal-200/60"
              : "bg-white/10 border-white/20"
          }`}
        >
          <span
            className={`absolute ${compact ? "top-0.5 h-4 w-4" : "top-0.5 h-5 w-5"} rounded-full bg-white shadow transition ${
              isBatchMode ? (compact ? "left-4" : "left-5") : "left-0.5"
            }`}
          />
        </button>
        <span className={`${textClass} text-[color:var(--app-muted)]`}>
          Batch
        </span>
        {!compact && (
          <span className="text-xs text-[color:var(--app-faint)] ml-auto">
            {isBatchMode ? `Queued: ${pendingPromptsCount}` : "Runs instantly"}
          </span>
        )}
      </div>
      {compact && (
        <Button
          type="button"
          onClick={onBatchGenerate}
          disabled={
            controlsDisabled || !isBatchMode || pendingPromptsCount === 0
          }
          variant="ghost"
          className="h-auto rounded-full px-3 py-1 text-[10px] font-semibold bg-gradient-to-r from-teal-400/90 to-lime-300/90 text-black hover:from-teal-300 hover:to-lime-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate
        </Button>
      )}
    </div>
  );
}

function ReferenceButtons({
  controlsDisabled,
  isBatchMode,
  batchReferenceStorageId,
  batchReferenceTool,
  onDressMe,
  onChangeHair,
  compact,
}: Pick<
  SharedToolProps,
  | "controlsDisabled"
  | "isBatchMode"
  | "batchReferenceStorageId"
  | "batchReferenceTool"
  | "onDressMe"
  | "onChangeHair"
> & { compact?: boolean }) {
  const iconClass = compact ? "w-3 h-3" : "w-4 h-4";
  const className = compact
    ? "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-black transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    : "flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2.5 text-xs shadow-[0_8px_20px_rgba(45,212,191,0.12)] text-black font-semibold transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="col-span-3 grid grid-cols-2 gap-1.5">
      <Button
        type="button"
        onClick={onDressMe}
        disabled={controlsDisabled}
        variant="ghost"
        className={`${className} bg-gradient-to-r from-lime-300/95 to-amber-300/95 hover:from-lime-200 hover:to-amber-200`}
        title="Upload a clothing image reference"
      >
        <Shirt className={iconClass} />
        Dress me
        {isBatchMode && batchReferenceStorageId && batchReferenceTool === "dress_me"
          ? " (ref ready)"
          : ""}
      </Button>
      <Button
        type="button"
        onClick={onChangeHair}
        disabled={controlsDisabled}
        variant="ghost"
        className={`${className} bg-gradient-to-r from-cyan-300/95 to-fuchsia-300/95 hover:from-cyan-200 hover:to-fuchsia-200`}
        title="Upload a hairstyle image reference"
      >
        <Scissors className={iconClass} />
        Change hair
        {isBatchMode &&
        batchReferenceStorageId &&
        batchReferenceTool === "change_hair"
          ? " (ref ready)"
          : ""}
      </Button>
    </div>
  );
}

function QuickToolsGrid(props: SharedToolProps & { compact?: boolean }) {
  const buttonClass = props.compact
    ? "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-black transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    : "";
  const iconClass = props.compact ? "w-3 h-3" : undefined;

  return (
    <div className={props.compact ? "grid grid-cols-3 gap-1" : "grid grid-cols-3 gap-1.5"}>
      {quickTools.map((tool) => {
        const Icon = tool.icon;
        const handler = props[tool.handler];

        if (!props.compact) {
          return (
            <PositionButton
              key={tool.key}
              onClick={handler}
              disabled={props.controlsDisabled}
              label={tool.label}
              icon={Icon}
              toneClassName={tool.tone}
            />
          );
        }

        return (
          <Button
            key={tool.key}
            type="button"
            onClick={handler}
            disabled={props.controlsDisabled}
            variant="ghost"
            className={`${buttonClass} ${tool.tone}`}
          >
            <Icon className={iconClass} />
            {tool.label}
          </Button>
        );
      })}
      <ReferenceButtons {...props} />
    </div>
  );
}

function ManualPrompt({
  controlsDisabled,
  isBatchMode,
  pendingPromptsCount,
  manualPrompt,
  setManualPrompt,
  onManualSubmit,
  compact,
}: ManualPromptProps) {
  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <textarea
        value={manualPrompt}
        onChange={(e) => setManualPrompt(e.target.value)}
        placeholder="Describe an edit"
        rows={compact ? 3 : 4}
        disabled={controlsDisabled}
        className={
          compact
            ? "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[10px] text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-0 app-focus disabled:opacity-50"
            : "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-0 app-focus disabled:opacity-50"
        }
      />
      <div className={`${compact ? "mt-2" : "mt-3"} flex items-end justify-between gap-2`}>
        <span className={`${compact ? "text-[10px]" : "text-xs"} text-[color:var(--app-faint)]`}>
          {isBatchMode
            ? compact
              ? `Queued ${pendingPromptsCount}`
              : `Queued: ${pendingPromptsCount}`
            : compact
              ? "Runs immediately"
              : "Press button to generate"}
        </span>
        <Button
          type="button"
          onClick={onManualSubmit}
          disabled={controlsDisabled || manualPrompt.trim().length === 0}
          variant="ghost"
          className={`${compact ? "px-3 py-1 text-[10px]" : "px-4 py-2 text-xs"} h-auto rounded-full font-semibold bg-gradient-to-r from-sky-400/90 to-blue-300/90 text-black hover:from-sky-300 hover:to-blue-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isBatchMode ? "Add prompt" : "Generate"}
        </Button>
      </div>
    </div>
  );
}

export function MobileToolsPanel(props: MobileToolsPanelProps) {
  return (
    <section className="lg:hidden app-card rounded-2xl p-3">
      <div className="pb-3 border-b border-white/10">
        <GenerationModeControls {...props} compact />
      </div>
      <div className="mt-3 pb-3 border-b border-white/10">
        <ModelSelect
          selectedModel={props.selectedModel}
          setSelectedModel={props.setSelectedModel}
          compact
        />
      </div>
      <div className="mt-3 space-y-3">
        <div className="space-y-2">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-medium text-gray-300">Zoom</span>
              <span className="text-[10px] text-gray-400 tabular-nums">
                {props.zoomLevel}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={props.zoomLevel}
              onChange={(e) => props.setZoomLevel(Number(e.target.value))}
              onPointerUp={() => props.onZoomRelease(props.zoomLevel)}
              disabled={props.controlsDisabled}
              style={{
                background: `linear-gradient(90deg, rgba(45,212,191,0.95) 0%, rgba(163,230,53,0.90) ${(props.zoomLevel / 200) * 100}%, rgba(255,255,255,0.14) ${(props.zoomLevel / 200) * 100}%, rgba(255,255,255,0.14) 100%)`,
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
                {props.brightnessLevel}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={props.brightnessLevel}
              onChange={(e) => props.setBrightnessLevel(Number(e.target.value))}
              onPointerUp={() => props.onBrightnessRelease(props.brightnessLevel)}
              disabled={props.controlsDisabled}
              style={{
                background: `linear-gradient(90deg, rgba(45,212,191,0.95) 0%, rgba(163,230,53,0.90) ${(props.brightnessLevel / 200) * 100}%, rgba(255,255,255,0.14) ${(props.brightnessLevel / 200) * 100}%, rgba(255,255,255,0.14) 100%)`,
              }}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-transparent disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-gray-300">Quick tools</p>
          <QuickToolsGrid {...props} compact />
        </div>
      </div>
      <ManualPrompt {...props} compact />
    </section>
  );
}

export function DesktopToolsSidebar(props: DesktopToolsSidebarProps) {
  return (
    <aside className="hidden lg:block space-y-5">
      <section className="app-card rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold">Generation mode</h2>
          <Button
            type="button"
            onClick={props.onBatchGenerate}
            disabled={
              props.controlsDisabled ||
              !props.isBatchMode ||
              props.pendingPromptsCount === 0
            }
            variant="ghost"
            className="h-auto rounded-full px-3 py-1 text-xs font-semibold bg-gradient-to-r from-teal-400/90 to-lime-300/90 text-black hover:from-teal-300 hover:to-lime-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate
          </Button>
        </div>
        <div className="space-y-4">
          <GenerationModeControls {...props} />
          <ModelSelect
            selectedModel={props.selectedModel}
            setSelectedModel={props.setSelectedModel}
          />
        </div>
      </section>

      <section className="app-card rounded-3xl p-5">
        <h2 className="text-sm font-semibold">Quick tools</h2>
        <p className="mt-1 text-sm text-[color:var(--app-muted)]">
          One-click edits {props.isBatchMode ? "queue prompts" : "generate a new step"}.
        </p>
        <div className="mt-4">
          <QuickToolsGrid {...props} />
        </div>
      </section>

      <section className="app-card rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Adjustments</h2>
          <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
            {props.isBatchMode ? "Release to queue" : "Release to apply"}
          </span>
        </div>
        <div className="mt-5 space-y-6">
          <EditSlider
            label="Zoom"
            value={props.zoomLevel}
            onChange={props.setZoomLevel}
            onRelease={props.onZoomRelease}
            disabled={props.controlsDisabled}
          />
          <EditSlider
            label="Brightness"
            value={props.brightnessLevel}
            onChange={props.setBrightnessLevel}
            onRelease={props.onBrightnessRelease}
            disabled={props.controlsDisabled}
          />
        </div>
      </section>

      <section className="app-card rounded-3xl p-5">
        <h2 className="text-sm font-semibold">Describe an edit</h2>
        <p className="mt-1 text-xs text-[color:var(--app-muted)]">
          {props.isBatchMode
            ? "Add multiple prompts, then generate once."
            : "Submit to generate immediately."}
        </p>
        <ManualPrompt {...props} />
      </section>
    </aside>
  );
}
