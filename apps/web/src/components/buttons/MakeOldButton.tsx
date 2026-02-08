import { Button } from "../ui/button";
import { Sparkles } from "lucide-react";
import type { QuickToolButtonProps } from "../../types";

export function MakeOldButton({
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
      className={`flex items-center justify-center w-full h-auto transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500/90 to-orange-400/90 text-black hover:from-amber-400 hover:to-orange-300 font-semibold ${
        isCompact
          ? "gap-1.5 rounded-xl px-2 py-2 text-xs"
          : "gap-2 rounded-2xl px-4 py-3 text-sm shadow-[0_18px_40px_rgba(217,119,6,0.16)]"
      }`}
    >
      <Sparkles className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      Make old
    </Button>
  );
}
