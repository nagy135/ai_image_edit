import { Button } from "../ui/button";
import type { PositionButtonProps } from "../../types";

export function PositionButton({
  onClick,
  disabled,
  size = "regular",
  label,
  toneClassName,
  icon: Icon,
}: PositionButtonProps) {
  const isCompact = size === "compact";

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant="ghost"
      className={`flex items-center justify-center w-full h-auto transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-black font-semibold ${toneClassName} ${
        isCompact
          ? "gap-1.5 rounded-xl px-2 py-2 text-xs"
          : "gap-2 rounded-2xl px-4 py-3 text-sm shadow-[0_18px_40px_rgba(45,212,191,0.16)]"
      }`}
    >
      <Icon className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {label}
    </Button>
  );
}
