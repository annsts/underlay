'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { Scale, MusicGenerationMode } from '@google/genai';


interface GlassDropdownProps {
  value: string | Scale | MusicGenerationMode;
  onChange: (value: string | Scale | MusicGenerationMode) => void;
  options: { value: string | Scale | MusicGenerationMode; label: string }[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'right' | 'center';
  fitContent?: boolean;
}

function GlassDropdown({
  value,
  onChange,
  options,
  className = '',
  placeholder = 'Select an option...',
  disabled = false,
  minWidth = 200,
  maxWidth = 400,
  align = 'left',
  fitContent = false,
}: GlassDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [themeClass, setThemeClass] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    transformOrigin: 'top left',
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const selected = options.find((opt) => opt.value === value);
    setSelectedLabel(selected?.label || placeholder);
  }, [value, options, placeholder]);

  const calculatePosition = useCallback(() => {
    if (!isOpen || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    const itemHeight = 40;
    const maxItems = Math.min(options.length, 8);
    const dropdownHeight = Math.min(maxItems * itemHeight + 16, 400);

    let dropdownWidth: number;
    if (fitContent) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        context.font = '14px system-ui';
        const maxTextWidth = Math.max(
          ...options.map((opt) => context.measureText(opt.label).width)
        );
        dropdownWidth = Math.max(Math.min(maxTextWidth + 48, maxWidth), minWidth);
      } else {
        dropdownWidth = Math.max(rect.width, minWidth);
      }
    } else {
      dropdownWidth = Math.max(rect.width, minWidth);
    }

    dropdownWidth = Math.min(dropdownWidth, maxWidth);

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldPositionAbove = spaceBelow < dropdownHeight + 8 && spaceAbove > dropdownHeight + 8;

    let top: number;
    let transformOrigin: string;

    if (shouldPositionAbove) {
      top = rect.top + scrollY - dropdownHeight - 8;
      transformOrigin = 'bottom left';
    } else {
      top = rect.bottom + scrollY + 8;
      transformOrigin = 'top left';
    }

    let left: number;

    switch (align) {
      case 'right':
        left = rect.right + scrollX - dropdownWidth;
        transformOrigin = shouldPositionAbove ? 'bottom right' : 'top right';
        break;
      case 'center':
        left = rect.left + scrollX + (rect.width - dropdownWidth) / 2;
        transformOrigin = shouldPositionAbove ? 'bottom center' : 'top center';
        break;
      case 'left':
      default:
        left = rect.left + scrollX;
        break;
    }

    const padding = 16;
    left = Math.max(padding, Math.min(left, viewportWidth - dropdownWidth - padding));
    top = Math.max(padding, Math.min(top, viewportHeight + scrollY - dropdownHeight - padding));

    setDropdownPosition({
      top,
      left,
      width: dropdownWidth,
      transformOrigin,
    });
  }, [isOpen, options, fitContent, minWidth, maxWidth, align]);

  useEffect(() => {
    calculatePosition();
  }, [calculatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };


    const handleScroll = (event: Event) => {
      if (!isOpen) return;

      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
        return;
      }

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      calculatePosition();

      scrollTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 150);
    };

    const handleResize = () => {
      if (isOpen) {
        calculatePosition();
        setTimeout(() => setIsOpen(false), 100);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          const firstItem = dropdownRef.current?.querySelector(
            '.glass-dropdown-item:not([disabled])'
          ) as HTMLElement;
          firstItem?.focus();
          break;
        case 'ArrowUp':
          event.preventDefault();
          const items = dropdownRef.current?.querySelectorAll(
            '.glass-dropdown-item:not([disabled])'
          ) as NodeListOf<HTMLElement>;
          items[items.length - 1]?.focus();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      document.addEventListener('resize', handleResize);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isOpen, calculatePosition]);

  const handleSelect = useCallback(
    (optionValue: string | Scale | MusicGenerationMode) => {
      onChange(optionValue);
      setIsOpen(false);
      triggerRef.current?.focus();
    },
    [onChange]
  );

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const theme =
      triggerRef.current
        ?.closest('.theme-dark, .theme-dark-cinematic, .theme-glass')
        ?.className.match(/(theme-dark-cinematic|theme-dark|theme-glass)/)?.[0] || '';
    setThemeClass(theme);
    setIsOpen((prev) => !prev);
  }, [disabled]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          setIsOpen((prev) => !prev);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setIsOpen(true);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setIsOpen(true);
          break;
      }
    },
    [disabled]
  );

  const dropdownMenu = isOpen ? (
    <div
      ref={dropdownRef}
      className={`fixed glass-dropdown-menu ${themeClass}`}
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        transformOrigin: dropdownPosition.transformOrigin,
        zIndex: 10000,
        animation: 'dropdownFadeIn 0.15s ease-out',
      }}
      role="listbox"
      aria-label="Dropdown options"
    >
      <div className="glass-dropdown-scroll-container">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="option"
              aria-selected={isSelected}
              tabIndex={-1}
              onClick={() => handleSelect(option.value)}
              onKeyDown={(e) => {
                switch (e.key) {
                  case 'Enter':
                  case ' ':
                    e.preventDefault();
                    handleSelect(option.value);
                    break;
                  case 'ArrowDown':
                    e.preventDefault();
                    const nextItem = e.currentTarget.nextElementSibling as HTMLElement;
                    nextItem?.focus();
                    break;
                  case 'ArrowUp':
                    e.preventDefault();
                    const prevItem = e.currentTarget.previousElementSibling as HTMLElement;
                    prevItem?.focus();
                    break;
                  case 'Escape':
                    e.preventDefault();
                    setIsOpen(false);
                    triggerRef.current?.focus();
                    break;
                }
              }}
              className={`glass-dropdown-item w-full text-left ${
                isSelected ? 'glass-dropdown-item-selected' : ''
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={`glass-select w-full text-left flex items-center transition-opacity ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          style={{
            paddingTop: '10px',
            paddingBottom: '10px',
            paddingLeft: '14px',
            paddingRight: '14px',
            minHeight: '0',
            lineHeight: '1',
            minWidth: fitContent ? 'auto' : `${minWidth}px`,
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={selectedLabel || placeholder}
        >
          <span
            className={`flex-1 ${!selectedLabel || selectedLabel === placeholder ? 'opacity-60' : ''}`}
            style={{ lineHeight: '1' }}
          >
            {selectedLabel || placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ml-3 shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
            style={{ marginTop: '0', marginBottom: '0', color: 'var(--text-secondary)' }}
          />
        </button>
      </div>

      {typeof document !== 'undefined' && createPortal(dropdownMenu, document.body)}
    </>
  );
}

export default GlassDropdown;
