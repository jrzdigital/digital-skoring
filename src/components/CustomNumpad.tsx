import React, { useState, useEffect } from 'react';
import { Delete, Check, RotateCcw } from 'lucide-react';

interface CustomNumpadProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
}

export const CustomNumpad: React.FC<CustomNumpadProps> = ({
  label,
  value,
  min = 50.0,
  max = 60.0,
  onChange,
}) => {
  const [inputStr, setInputStr] = useState<string>(value.toFixed(2));
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Synchronize with external value changes when not actively editing
  useEffect(() => {
    if (!isEditing) {
      setInputStr(value.toFixed(2));
    }
  }, [value, isEditing]);

  const handleNumberClick = (num: string) => {
    setIsEditing(true);
    let nextStr = inputStr;
    
    // If it's the first keypress in editing state, we might want to start fresh 
    // or keep appending. Let's make it clear: if they just click and we weren't editing, 
    // we can reset or append. Let's reset the string on first digit if it has 5 digits (e.g. 50.00)
    // to make typing fast, but standard append is safer. Let's do:
    if (!isEditing) {
      nextStr = num;
    } else {
      // Prevent multiple decimals
      if (num === '.' && inputStr.includes('.')) return;
      
      // Limit decimals to 2 places
      const parts = inputStr.split('.');
      if (parts[1] && parts[1].length >= 2) {
        // already has 2 decimals, don't allow typing more digits unless it is backspace
        return;
      }
      
      nextStr = inputStr + num;
    }

    // Basic length limit (e.g. "60.00" is max 5 chars)
    if (nextStr.length > 5) return;

    setInputStr(nextStr);
    
    // Try to parse and update live, but don't force constraints until blurred or submitted
    const parsed = parseFloat(nextStr);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    }
  };

  const handleBackspace = () => {
    setIsEditing(true);
    if (inputStr.length <= 1) {
      setInputStr('0');
      onChange(0);
      return;
    }
    const nextStr = inputStr.slice(0, -1);
    setInputStr(nextStr);
    
    const parsed = parseFloat(nextStr);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleClear = () => {
    setIsEditing(true);
    setInputStr('');
    onChange(min); // Default back to minimum
  };

  const handleApply = () => {
    setIsEditing(false);
    let parsed = parseFloat(inputStr);
    if (isNaN(parsed)) {
      parsed = min;
    } else if (parsed < min) {
      parsed = min;
    } else if (parsed > max) {
      parsed = max;
    }
    const clamped = parseFloat(parsed.toFixed(2));
    setInputStr(clamped.toFixed(2));
    onChange(clamped);
  };

  // Quick helper increments
  const handleAdjustValue = (amount: number) => {
    setIsEditing(false);
    const newValue = Math.max(min, Math.min(max, value + amount));
    const formatted = parseFloat(newValue.toFixed(2));
    setInputStr(formatted.toFixed(2));
    onChange(formatted);
  };

  const handleSetMinMax = (targetVal: number) => {
    setIsEditing(false);
    setInputStr(targetVal.toFixed(2));
    onChange(targetVal);
  };

  // Helper validation status
  const parsedValue = parseFloat(inputStr);
  const isValid = !isNaN(parsedValue) && parsedValue >= min && parsedValue <= max;

  return (
    <div id="custom-numpad-widget" className="bg-black border border-gray-800 rounded-lg p-3.5 w-full max-w-sm flex flex-col shadow-inner">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-gray-500 font-mono">Range: {min.toFixed(0)}-{max.toFixed(0)}</span>
      </div>

      {/* Screen Display inside Numpad */}
      <div className="flex items-center justify-between bg-[#121212] border border-gray-800 rounded px-3 py-2 mb-2.5">
        <div className="flex flex-col">
          <span className="text-[9px] text-gray-500 font-mono">NILAI INPUT</span>
          <span className={`text-xl font-black font-mono transition-colors ${
            isValid ? 'text-yellow-400' : 'text-red-500'
          }`}>
            {inputStr || '0'}
          </span>
        </div>
        
        {/* Validation indicator */}
        <div className="flex items-center gap-1">
          {!isValid && inputStr !== '' ? (
            <span className="text-[9px] px-1.5 py-0.2 bg-red-950/40 text-red-400 border border-red-900/30 rounded font-bold">
              Batas!
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.2 bg-gray-800 text-gray-400 border border-gray-700 rounded font-bold">
              OK
            </span>
          )}
          <button
            onClick={handleApply}
            className="p-1 bg-[#1a1a1a] text-emerald-400 hover:bg-gray-800 active:bg-black rounded transition-colors cursor-pointer"
            title="Terapkan"
          >
            <Check size={12} />
          </button>
        </div>
      </div>

      {/* Quick Offset Adjusters */}
      <div className="grid grid-cols-6 gap-1 mb-2.5">
        <button
          onClick={() => handleAdjustValue(-1)}
          className="py-1 bg-[#121212] hover:bg-[#1a1a1a] text-red-500 rounded text-[10px] font-bold border border-gray-800 cursor-pointer"
        >
          -1.0
        </button>
        <button
          onClick={() => handleAdjustValue(-0.1)}
          className="py-1 bg-[#121212] hover:bg-[#1a1a1a] text-red-500 rounded text-[10px] font-bold border border-gray-800 cursor-pointer"
        >
          -0.1
        </button>
        <button
          onClick={() => handleAdjustValue(-0.01)}
          className="py-1 bg-[#121212] hover:bg-[#1a1a1a] text-red-500 rounded text-[9px] font-bold border border-gray-800 cursor-pointer"
        >
          -0.01
        </button>
        <button
          onClick={() => handleAdjustValue(0.01)}
          className="py-1 bg-[#121212] hover:bg-[#1a1a1a] text-emerald-400 rounded text-[9px] font-bold border border-gray-800 cursor-pointer"
        >
          +0.01
        </button>
        <button
          onClick={() => handleAdjustValue(0.1)}
          className="py-1 bg-[#121212] hover:bg-[#1a1a1a] text-emerald-400 rounded text-[10px] font-bold border border-gray-800 cursor-pointer"
        >
          +0.1
        </button>
        <button
          onClick={() => handleAdjustValue(1)}
          className="py-1 bg-[#121212] hover:bg-[#1a1a1a] text-emerald-400 rounded text-[10px] font-bold border border-gray-800 cursor-pointer"
        >
          +1.0
        </button>
      </div>

      {/* Keyboard Grid */}
      <div className="grid grid-cols-3 gap-1">
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num.toString())}
            className="py-2.5 bg-[#121212] hover:bg-[#1a1a1a] active:bg-black text-gray-200 font-bold font-mono rounded border border-gray-800 shadow-sm transition-all text-sm cursor-pointer"
          >
            {num}
          </button>
        ))}

        {/* 0, . and Backspace */}
        <button
          onClick={() => handleNumberClick('.')}
          className="py-2.5 bg-[#121212] hover:bg-[#1a1a1a] active:bg-black text-gray-300 font-bold font-mono rounded border border-gray-800 cursor-pointer"
        >
          .
        </button>
        <button
          onClick={() => handleNumberClick('0')}
          className="py-2.5 bg-[#121212] hover:bg-[#1a1a1a] active:bg-black text-gray-200 font-bold font-mono rounded border border-gray-800 cursor-pointer"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="py-2.5 bg-[#121212] hover:bg-[#1a1a1a] active:bg-black text-red-500 flex items-center justify-center rounded border border-gray-800 cursor-pointer"
          title="Hapus"
        >
          <Delete size={14} />
        </button>
      </div>

      {/* Preset boundaries and Reset */}
      <div className="grid grid-cols-3 gap-1 mt-1.5">
        <button
          onClick={() => handleSetMinMax(min)}
          className="py-1 bg-[#121212] hover:bg-[#1a1a1a] text-gray-400 text-[10px] font-bold rounded border border-gray-800 cursor-pointer"
        >
          MIN ({min.toFixed(0)})
        </button>
        <button
          onClick={handleClear}
          className="py-1 bg-[#121212] hover:bg-[#1a1a1a] text-gray-400 text-[10px] font-bold flex items-center justify-center gap-1 rounded border border-gray-800 cursor-pointer"
        >
          <RotateCcw size={10} /> CLEAR
        </button>
        <button
          onClick={() => handleSetMinMax(max)}
          className="py-1 bg-[#121212] hover:bg-[#1a1a1a] text-gray-400 text-[10px] font-bold rounded border border-gray-800 cursor-pointer"
        >
          MAX ({max.toFixed(0)})
        </button>
      </div>
    </div>
  );
};
