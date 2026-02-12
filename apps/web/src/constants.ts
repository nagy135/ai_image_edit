import {
  AlignLeft,
  AlignRight,
  Baby,
  Circle,
  Copy,
  Eraser,
  Focus,
  Image as ImageIcon,
  ImagePlus,
  PencilLine,
  Shirt,
  Scissors,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Wand2,
  ZoomIn,
} from "lucide-react";
import type { EditTypeMeta } from "./types";

/**
 * Background style for the main app shell.
 */
export const APP_SHELL_STYLE = {
  backgroundColor: "var(--app-bg-0)",
  backgroundImage:
    "radial-gradient(900px 600px at 18% 12%, rgba(45, 212, 191, 0.16), transparent 55%), radial-gradient(900px 700px at 82% 18%, rgba(163, 230, 53, 0.14), transparent 60%), linear-gradient(180deg, rgba(11, 18, 32, 1), rgba(7, 10, 15, 1))",
  backgroundAttachment: "scroll",
} as const;

/**
 * Mapping of edit types to their icons and labels.
 */
export const EDIT_TYPE_ICON_MAP: Record<string, EditTypeMeta> = {
  original: { icon: ImageIcon, label: "Original" },
  align_left: { icon: AlignLeft, label: "Align left" },
  align_right: { icon: AlignRight, label: "Align right" },
  center: { icon: Focus, label: "Center" },
  make_old: { icon: Sparkles, label: "Make old" },
  make_young: { icon: Baby, label: "Make young" },
  delete_background: { icon: Eraser, label: "Delete background" },
  add_background: { icon: ImagePlus, label: "Add background" },
  remove_object: { icon: Trash2, label: "Remove object" },
  make_square: { icon: Square, label: "Make square" },
  make_circular: { icon: Circle, label: "Make circular" },
   duplicate_object: { icon: Copy, label: "Duplicate object" },
   prettify: { icon: Wand2, label: "Prettify" },
   dress_me: { icon: Shirt, label: "Dress me" },
   change_hair: { icon: Scissors, label: "Change hair" },
   manual: { icon: PencilLine, label: "Manual" },
   zoom: { icon: ZoomIn, label: "Zoom" },
   brightness: { icon: Sun, label: "Brightness" },
   unknown: { icon: Wand2, label: "Edit" },
};

/**
 * Default slider values.
 */
export const DEFAULT_ZOOM = 100;
export const DEFAULT_BRIGHTNESS = 100;
export const SLIDER_MIN = 0;
export const SLIDER_MAX = 200;

/**
 * Preset prompts for quick tools.
 */
export const PROMPTS = {
  center: "Center the main object in the image",
  alignLeft: "Place the main object on the left side of the photo",
  alignRight: "Place the main object on the right side of the photo",
  makeOld:
    "Make everyone and everything in this photo look noticeably older. Add wrinkles, age spots, graying hair, aged appearance to any people. Show aging effects on objects and surroundings as well.",
  makeYoung:
    "Make everyone and everything in this photo look noticeably younger. Remove wrinkles, age spots, restore youthful skin, darker hair color. Make any people appear in their prime youth.",
  deleteBackground:
    "Remove the background completely, leaving only the main subject. Replace the background with a clean, transparent or solid white background.",
  addBackground:
    "Add a beautiful, natural-looking background to this image. If the background is plain or missing, generate an appropriate scenic or contextual background that complements the main subject.",
  removeObject:
    "Remove any distracting or unwanted objects from the background of this image. Keep the main subject intact but clean up the surroundings.",
  makeSquare:
    "Crop or extend the image to make it perfectly square while keeping the main subject centered and fully visible.",
  makeCircular:
    "Crop the image into a circular shape, centering on the main subject. Add a clean, solid background outside the circle.",
  duplicateObject:
    "Duplicate the main object or subject in the image. Place the duplicate next to the original in a natural-looking arrangement.",
  prettify:
    "Fix small imperfections and blemishes in the photo for a polished look. Subtly improve skin texture, remove minor marks, and enhance overall clarity without overdoing it or changing the natural appearance.",
  dressMe:
    "Dress the subject in the clothing shown in the reference image. Keep the same person, face, body shape, pose, background, and lighting. Match the garment's colors, pattern, texture, logos, and overall design; make it look realistically fitted with natural folds and shadows.",
  changeHair:
    "Change the subject's hairstyle to match the hair shown in the reference image. Preserve everything else about the person: same identity/face, skin tone, expression, body shape, pose, clothing, background, lighting, and overall photo style. Only change the hair cut/style (and hair color only if it is clearly part of the reference). Make the hairline, strands, texture, and edges look realistic.",
} as const;
