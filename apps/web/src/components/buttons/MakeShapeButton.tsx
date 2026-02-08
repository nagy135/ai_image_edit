import { Button } from "../ui/button";
import { Square, Circle } from "lucide-react";
import type { QuickToolButtonProps } from "../../types";

interface MakeShapeButtonProps extends QuickToolButtonProps {
  shape: "square" | "circular";
}

export function MakeShapeButton({
  onClick,
  disabled,
  size = "regular",
  shape,
}: MakeShapeButtonProps) {
  const isCompact = size === "compact";
  const Icon = shape === "square" ? Square : Circle;
  const label = shape === "square" ? "Square" : "Circular";
  const gradientClass =
    shape === "square"
      ? "from-indigo-500/90 to-purple-400/90 hover:from-indigo-400 hover:to-purple-300"
      : "from-violet-500/90 to-fuchsia-400/90 hover:from-violet-400 hover:to-fuchsia-300";
  const shadowColor =
    shape === "square"
      ? "rgba(99,102,241,0.16)"
      : "rgba(139,92,246,0.16)";

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant="ghost"
      className={`flex items-center justify-center w-full h-auto transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r ${gradientClass} text-black font-semibold ${
        isCompact
          ? "gap-1.5 rounded-xl px-2 py-2 text-xs"
          : `gap-2 rounded-2xl px-4 py-3 text-sm shadow-[0_18px_40px_${shadowColor}]`
      }`}
    >
      <Icon className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {label}
    </Button>
  );
}
