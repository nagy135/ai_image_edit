import { Button } from "../ui/button";
import { Copy } from "lucide-react";
import type { QuickToolButtonProps } from "../../types";

export function DuplicateObjectButton({
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
      className={`flex items-center justify-center w-full h-auto transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-500/90 to-teal-400/90 text-black hover:from-emerald-400 hover:to-teal-300 font-semibold ${
        isCompact
          ? "gap-1.5 rounded-xl px-2 py-2 text-xs"
          : "gap-2 rounded-2xl px-4 py-3 text-sm shadow-[0_18px_40px_rgba(16,185,129,0.16)]"
      }`}
    >
      <Copy className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      Duplicate
    </Button>
  );
}
