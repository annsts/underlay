'use client';

import React, { useState, useRef, useEffect } from 'react';

interface NumericDragInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  title?: string;
}

function NumericDragInput({ value, onChange, min = 1, max = 1000, title }: NumericDragInputProps) {
  const [localValue, setLocalValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(value);
  const [hasDragged, setHasDragged] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused && !isDragging) {
      setLocalValue(value.toString());
    }
  }, [value, isFocused, isDragging]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    if (input === '') {
      setLocalValue('');
      return;
    }
    if (!/^\d+$/.test(input)) return;
    setLocalValue(input);
  };

  const commitValue = (newValue: number) => {
    const clamped = Math.max(min, Math.min(max, Math.round(newValue)));
    onChange(clamped);
    setLocalValue(clamped.toString());
    return clamped;
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const num = parseInt(localValue);
    if (isNaN(num) || localValue === '') {
      setLocalValue(value.toString());
    } else {
      commitValue(num);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      e.currentTarget.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      commitValue(value + 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      commitValue(value - 1);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isFocused) return;
    setIsDragging(true);
    setHasDragged(false);
    setDragStartY(e.clientY);
    setDragStartValue(value);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isFocused) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
    setDragStartValue(value);
  };

  useEffect(() => {
    const handleMove = (clientY: number) => {
      if (!isDragging) return;
      const deltaY = Math.abs(dragStartY - clientY);

      if (deltaY > 3 && !hasDragged) {
        setHasDragged(true);
        if (containerRef.current) {
          containerRef.current.style.cursor = 'ns-resize';
        }
      }

      if (hasDragged) {
        const deltaYSigned = dragStartY - clientY;
        const sensitivity = 0.5;
        const deltaValue = deltaYSigned * sensitivity;
        const newValue = dragStartValue + deltaValue;
        const clamped = Math.max(min, Math.min(max, Math.round(newValue)));
        onChange(clamped);
        setLocalValue(clamped.toString());
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientY);
    };

    const handleEnd = () => {
      if (!hasDragged && inputRef.current && !isFocused) {
        inputRef.current.focus();
      }

      setIsDragging(false);
      setHasDragged(false);
      if (containerRef.current) {
        containerRef.current.style.cursor = '';
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchend', handleEnd);
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
      document.body.style.userSelect = '';
    };
  }, [isDragging, hasDragged, dragStartY, dragStartValue, min, max, onChange, isFocused]);

  return (
    <div className="flex items-center gap-2">
      <div ref={containerRef} className={`relative group ${isDragging ? 'select-none' : ''}`}>
        <div
          className={`relative glass-input w-16 h-8 flex items-center justify-center transition-all duration-200 p-0 ${
            isDragging ? 'scale-105 shadow-lg' : isFocused ? 'ring-2' : ''
          }`}
          style={
            {
              backgroundColor: isDragging ? 'rgba(255, 255, 255, 0.2)' : undefined,
              '--tw-ring-color': isFocused ? 'var(--primary)' : undefined,
            } as React.CSSProperties
          }
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          title={title}
        >
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none outline-none text-center text-sm font-bold w-full h-full py-2"
            style={{
              color: 'var(--text-primary)',
              cursor: hasDragged ? 'ns-resize' : isFocused ? 'text' : 'pointer',
            }}
            placeholder={value.toString()}
          />
          {!isFocused && (
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none">
              <div className="flex flex-col gap-0.5">
                <div className="w-0.5 h-0.5 bg-current rounded-full"></div>
                <div className="w-0.5 h-0.5 bg-current rounded-full"></div>
                <div className="w-0.5 h-0.5 bg-current rounded-full"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { NumericDragInput };
export default NumericDragInput;
