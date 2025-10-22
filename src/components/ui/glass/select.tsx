'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';


interface GlassSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minWidth?: number;
  maxWidth?: number;
  fitContent?: boolean;
}

export function GlassSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  minWidth = 85,
  maxWidth = 200,
  fitContent = true,
}: GlassSelectProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [themeClass, setThemeClass] = React.useState('');

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (open && triggerRef.current) {
      const theme =
        triggerRef.current
          ?.closest('.theme-dark, .theme-dark-cinematic, .theme-glass')
          ?.className.match(/(theme-dark-cinematic|theme-dark|theme-glass)/)?.[0] || '';
      setThemeClass(theme);
    }
  }, []);

  const currentLabel = React.useMemo(() => {
    const option = options.find((opt) => String(opt.value) === String(value));
    return option?.label || placeholder;
  }, [options, value, placeholder]);

  return (
    <SelectPrimitive.Root
      value={String(value)}
      onValueChange={onChange}
      disabled={disabled}
      onOpenChange={handleOpenChange}
    >
      <SelectPrimitive.Trigger
        ref={triggerRef}
        className={`glass-select flex items-center transition-opacity ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
        style={{
          paddingTop: '10px',
          paddingBottom: '10px',
          paddingLeft: '14px',
          paddingRight: '14px',
          minHeight: 0,
          lineHeight: 1,
          minWidth: fitContent ? 'auto' : `${minWidth}px`,
        }}
      >
        <span className="flex-1" style={{ lineHeight: 1 }}>
          <SelectPrimitive.Value placeholder={placeholder}>{currentLabel}</SelectPrimitive.Value>
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            className="w-4 h-4 transition-transform duration-200 ml-3 shrink-0 data-[state=open]:rotate-180"
            style={{ marginTop: 0, marginBottom: 0, color: 'var(--text-secondary)' }}
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={`glass-dropdown-menu ${themeClass}`}
          position="popper"
          sideOffset={8}
          style={{
            zIndex: 10000,
            minWidth: fitContent ? 'var(--radix-select-trigger-width)' : `${minWidth}px`,
            maxWidth: `${maxWidth}px`,
            animation: 'dropdownFadeIn 0.15s ease-out',
          }}
        >
          <SelectPrimitive.Viewport className="glass-dropdown-scroll-container">
            {options.map((option) => {
              const stringValue = String(option.value);
              const isSelected = String(value) === stringValue;
              return (
                <SelectPrimitive.Item
                  key={stringValue}
                  value={stringValue}
                  className={`glass-dropdown-item w-full text-left ${
                    isSelected ? 'glass-dropdown-item-selected' : ''
                  }`}
                  style={{
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    marginBottom: '4px',
                  }}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              );
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
