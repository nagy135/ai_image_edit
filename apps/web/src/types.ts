import type { Doc, Id } from "@repo/convex-backend/convex/_generated/dataModel";
import type { LucideIcon } from "lucide-react";

// Base document types from Convex
export type ImageDoc = Doc<"images">;
export type ChainDoc = Doc<"imageChains">;

// Extended types with URL
export type ImageWithUrl = ImageDoc & { url: string | null };
export type ChainWithUrl = ChainDoc & { originalUrl: string | null };

export type ChainOwnerSummary = {
  clerkUserId: string;
  name?: string;
  email?: string;
  imageUrl?: string;
  isAdmin: boolean;
};

export type AdminChainWithUrl = ChainWithUrl & {
  owner: ChainOwnerSummary | null;
};

// Edit type from the image document
export type EditType = ImageDoc["editType"];

// History tree structures
export type HistoryNode = {
  image: ImageWithUrl;
  children: HistoryNode[];
};

export type HistoryRow = {
  path: HistoryNode[];
  visibleFromDepth: number;
  branchDepth: number;
};

export type HistoryLayout = {
  rows: HistoryRow[];
  maxDepth: number;
};

// Button component props
export interface QuickToolButtonProps {
  onClick: () => void;
  disabled: boolean;
  size?: "compact" | "regular";
}

export interface PositionButtonProps extends QuickToolButtonProps {
  label: string;
  toneClassName: string;
  icon: LucideIcon;
}

// Edit type metadata for icons
export interface EditTypeMeta {
  icon: LucideIcon;
  label: string;
}

// Re-export Id type for convenience
export type { Id };
