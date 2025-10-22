'use client';

import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'darker' | 'control' | 'active';
}

function GlassPanel({ children, className = '', variant = 'default' }: GlassPanelProps) {
  const variants = {
    default: 'glass-panel',
    darker: 'glass-panel-dark',
    control: 'glass-control',
    active: 'glass-active',
  };

  return <div className={`${variants[variant]} ${className}`}>{children}</div>;
}

export { GlassPanel };
export default GlassPanel;
