import { useState } from "react";
import type { ChangeEvent, CSSProperties, PointerEvent } from "react";

interface EditSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onRelease: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}

export function EditSlider({
  label,
  value,
  onChange,
  onRelease,
  disabled = false,
  min = 0,
  max = 200,
}: EditSliderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const pct = ((value - min) / (max - min)) * 100;
  const trackStyle: CSSProperties = {
    background: `linear-gradient(90deg, rgba(45,212,191,0.95) 0%, rgba(163,230,53,0.90) ${pct}%, rgba(255,255,255,0.14) ${pct}%, rgba(255,255,255,0.14) 100%)`,
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    onChange(newValue);
  };

  const handlePointerDown = (e: PointerEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (value !== 100) {
      onRelease(value);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-xs">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-sm text-gray-400 tabular-nums">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        disabled={disabled}
        style={trackStyle}
        className={`
          w-full h-2 rounded-lg appearance-none cursor-pointer
          bg-transparent
          disabled:cursor-not-allowed disabled:opacity-50
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:shadow-[0_10px_24px_rgba(0,0,0,0.40)]
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-webkit-slider-thumb]:transition
          [&::-webkit-slider-thumb]:disabled:bg-gray-500
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:shadow-[0_10px_24px_rgba(0,0,0,0.40)]
          [&::-moz-range-thumb]:disabled:bg-gray-500
        `}
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}%</span>
        <span>100%</span>
        <span>{max}%</span>
      </div>
    </div>
  );
}
