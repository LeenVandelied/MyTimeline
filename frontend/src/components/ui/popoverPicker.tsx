import React, { useCallback } from "react";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export const PopoverPicker = ({ 
  color, 
  onChange, 
  isOpen, 
  onToggle 
}: { 
  color: string, 
  onChange: (color: string) => void, 
  isOpen: boolean,
  onToggle?: (isOpen: boolean) => void
}) => {
  const handlePickerMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleColorChange = useCallback((newColor: string) => {
    onChange(newColor);
  }, [onChange]);

  return (
    <Popover open={isOpen} onOpenChange={onToggle}>
      <PopoverTrigger asChild>
        <div
          className="w-6 h-6 rounded-lg border border-white cursor-pointer"
          style={{ backgroundColor: color }}
          onMouseDown={handlePickerMouseDown}
        />
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 border-none bg-transparent shadow-none"
        onMouseDown={handlePickerMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div onMouseDown={handlePickerMouseDown}>
          <HexColorPicker color={color} onChange={handleColorChange} />
        </div>
      </PopoverContent>
    </Popover>
  );
};
