'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { useTooltipPreference } from '@/contexts/tooltip-context';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipPortal = TooltipPrimitive.Portal;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, ref) => {
  const { enabled } = useTooltipPreference();

  // Don't render tooltip content if disabled in preferences
  if (!enabled) {
    return null;
  }

  return (
    <TooltipPortal>
      <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={`
        z-40
        overflow-hidden
        rounded-md
        px-3
        py-1.5
        text-xs
        font-medium
        backdrop-blur-xl
        border
        shadow-lg
        animate-in
        fade-in-0
        zoom-in-95
        data-[state=closed]:animate-out
        data-[state=closed]:fade-out-0
        data-[state=closed]:zoom-out-95
        data-[side=bottom]:slide-in-from-top-2
        data-[side=left]:slide-in-from-right-2
        data-[side=right]:slide-in-from-left-2
        data-[side=top]:slide-in-from-bottom-2
        ${className || ''}
      `}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        color: 'rgba(255, 255, 255, 0.95)',
        maxWidth: '300px',
      }}
      {...props}
    >
      {children}
      </TooltipPrimitive.Content>
    </TooltipPortal>
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipPortal };
