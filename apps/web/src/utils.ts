import type { Id } from "@repo/convex-backend/convex/_generated/dataModel";
import type {
  ImageWithUrl,
  HistoryNode,
  HistoryLayout,
  HistoryRow,
} from "./types";

/**
 * Build a tree-like layout structure from a flat list of images.
 * This creates rows for the history timeline visualization.
 */
export function buildHistoryLayout(images: ImageWithUrl[]): HistoryLayout {
  const nodeMap = new Map<Id<"images">, HistoryNode>();

  // Create nodes for all images
  for (const image of images) {
    nodeMap.set(image._id, { image, children: [] });
  }

  let root: HistoryNode | null = null;

  // Build parent-child relationships
  for (const node of nodeMap.values()) {
    const parentId = node.image.parentImageId;
    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)?.children.push(node);
    } else if (!root || node.image.stepNumber === 0) {
      root = node;
    }
  }

  // Sort children by step number and creation time
  for (const node of nodeMap.values()) {
    node.children.sort((a, b) => {
      if (a.image.stepNumber !== b.image.stepNumber) {
        return a.image.stepNumber - b.image.stepNumber;
      }
      return a.image.createdAt - b.image.createdAt;
    });
  }

  // Fallback if no root found
  if (!root) {
    root = nodeMap.values().next().value ?? null;
  }

  // Collect all paths from root to leaves
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

  // Calculate visible depths for each row
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
}

/**
 * Get tooltip text for an image in the history timeline.
 */
export function getTooltipText(image: ImageWithUrl): string {
  return (
    image.prompt?.trim() ||
    (image.stepNumber === 0 ? "Original upload" : "No prompt for this step")
  );
}

/**
 * Add cache-busting timestamp to image URLs.
 */
export function getImageUrl(url: string, createdAt?: number): string {
  const timestamp = createdAt || Date.now();
  if (!url) return "";
  return `${url}${url.includes("?") ? "&" : "?"}t=${timestamp}`;
}

/**
 * Get the currently selected image or the latest one.
 */
export function getSelectedImage(
  images: ImageWithUrl[] | undefined,
  selectedImageId: Id<"images"> | null
): ImageWithUrl | null {
  if (!images || images.length === 0) return null;

  if (selectedImageId) {
    const selected = images.find((img) => img._id === selectedImageId);
    if (selected) return selected;
  }

  return images.reduce((best, img) =>
    img.stepNumber >= best.stepNumber ? img : best
  );
}

/**
 * Get the latest image by step number.
 */
export function getLatestImage(
  images: ImageWithUrl[] | undefined
): ImageWithUrl | null {
  if (!images || images.length === 0) return null;

  return images.reduce((best, img) =>
    img.stepNumber >= best.stepNumber ? img : best
  );
}

/**
 * Build a zoom adjustment prompt.
 */
export function buildZoomPrompt(value: number, base: number): string {
  const direction = value > base ? "in" : "out";
  const amount = Math.abs(value - base);
  return `Adjust the zoom ${direction} by about ${amount}%. Target zoom ${value}% (100% = original framing).`;
}

/**
 * Build a brightness adjustment prompt.
 */
export function buildBrightnessPrompt(value: number, base: number): string {
  const direction = value > base ? "brighter" : "darker";
  const amount = Math.abs(value - base);
  return `Make the image about ${amount}% ${direction}. Target brightness ${value}% (100% = original). Adjust overall brightness/exposure while keeping the same subject and composition.`;
}
