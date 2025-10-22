'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip';

interface GlassKnobProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  size?: number;
  tooltip?: string;
}

function GlassKnob({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  size = 48,
  tooltip,
}: GlassKnobProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [localValue, setLocalValue] = useState(value);
  const knobRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const startValue = useRef<number>(value);

  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = localValue;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
    startValue.current = localValue;
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMove = (clientY: number) => {
      if (!isDragging) return;

      const sensitivity = 100;
      const delta = (startY.current - clientY) / sensitivity;
      const range = max - min;
      const rawValue = startValue.current + delta * range;
      const steps = Math.round(rawValue / step);
      const steppedValue = steps * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));
      const finalValue = Math.round(clampedValue / step) * step;

      setLocalValue(finalValue);
      onChange(finalValue);
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
      if (isDragging) {
        setIsDragging(false);
        onChange(localValue);
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
  }, [isDragging, onChange, min, max, step, localValue]);

  const rotation = ((localValue - min) / (max - min)) * 270 - 135;
  const percentage = ((localValue - min) / (max - min)) * 100;
  const decimalPlaces = step >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(step)));

  const knobElement = (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </span>
      )}
      <div
        ref={knobRef}
        className="glass-knob relative cursor-grab active:cursor-grabbing touch-none"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeDasharray="263.89"
            strokeDashoffset={263.89 - (263.89 * percentage) / 100}
            strokeLinecap="round"
            style={{ opacity: 0.8 }}
          />
        </svg>
        <div
          className="absolute inset-2 rounded-full glass-knob-center flex items-center justify-center"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div
            className="w-0.5 h-3 rounded-full shadow-sm"
            style={{ background: 'linear-gradient(to bottom, var(--primary), var(--primary))' }}
          />
        </div>
      </div>
      <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
        {localValue.toFixed(decimalPlaces)}
      </span>
    </div>
  );

  if (!tooltip) {
    return knobElement;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{knobElement}</TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export { GlassKnob };
export default GlassKnob;
