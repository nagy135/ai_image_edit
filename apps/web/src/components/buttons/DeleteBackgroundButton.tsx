import { Button } from "../ui/button";
import { Eraser } from "lucide-react";
import type { QuickToolButtonProps } from "../../types";

export function DeleteBackgroundButton({
  onClick,
  disabled,
  size = "regular",
}: QuickToolButtonProps) {
  const isCompact = size === "compact";

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant="ghost"
      className={`flex items-center justify-center w-full h-auto transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-red-500/90 to-pink-400/90 text-black hover:from-red-400 hover:to-pink-300 font-semibold ${
        isCompact
          ? "gap-1.5 rounded-xl px-2 py-2 text-xs"
          : "gap-2 rounded-2xl px-4 py-3 text-sm shadow-[0_18px_40px_rgba(239,68,68,0.16)]"
      }`}
    >
      <Eraser className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      Delete BG
    </Button>
  );
}
