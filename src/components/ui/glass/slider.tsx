'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';


interface GlassSliderProps {
  value: number;
  onChange: (value: number) => void;
  onCommit?: () => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
}

function GlassSlider({
  value,
  onChange,
  onCommit,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  className = '',
}: GlassSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const percentage = ((localValue - min) / (max - min)) * 100;

  const updateValue = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, relativeX / rect.width));

      const rawValue = min + percentage * (max - min);
      const steps = Math.round(rawValue / step);
      const steppedValue = steps * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));
      const finalValue = Math.round(clampedValue / step) * step;

      setLocalValue(finalValue);
      onChange(finalValue);
    },
    [min, max, step, onChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      updateValue(e.clientX);
    },
    [updateValue]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      updateValue(e.touches[0].clientX);
    },
    [updateValue]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        updateValue(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        updateValue(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        onChange(localValue);
        if (onCommit) onCommit();
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchend', handleEnd);
      document.body.style.userSelect = 'none';
      document.body.style.touchAction = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
      document.body.style.userSelect = '';
      document.body.style.touchAction = '';
    };
  }, [isDragging, updateValue, onChange, localValue, onCommit]);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </span>
      )}
      <div
        ref={sliderRef}
        className="relative h-2 bg-black/10 dark:bg-white/10 rounded-full cursor-pointer touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, percentage))}%`,
            background: 'linear-gradient(to right, var(--primary), var(--primary))',
          }}
        />
        <div
          className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-md transform -translate-y-1/2 -translate-x-1/2 border-2 cursor-grab active:cursor-grabbing"
          style={{
            left: `${Math.max(0, Math.min(100, percentage))}%`,
            borderColor: 'var(--primary)',
            opacity: 0.9,
          }}
        />
      </div>
    </div>
  );
}

export { GlassSlider };
export default GlassSlider;
