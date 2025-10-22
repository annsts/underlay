export const GLASS_VARIABLES = {
  '--glass-blur-sm': '8px',
  '--glass-blur-md': '16px',
  '--glass-blur-lg': '24px',
  '--glass-blur-xl': '32px',

  '--glass-bg-primary': 'rgba(255, 255, 255, 0.07)',
  '--glass-bg-secondary': 'rgba(255, 255, 255, 0.04)',
  '--glass-bg-darker': 'rgba(0, 0, 0, 0.6)',
  '--glass-bg-hover': 'rgba(255, 255, 255, 0.09)',
  '--glass-bg-active': 'rgba(139, 69, 19, 0.15)',

  '--glass-border-primary': 'rgba(255, 255, 255, 0.1)',
  '--glass-border-secondary': 'rgba(255, 255, 255, 0.06)',
  '--glass-border-focus': 'rgba(139, 69, 19, 0.3)',

  '--glass-text-primary': 'rgba(255, 255, 255, 0.95)',
  '--glass-text-muted': 'rgba(255, 255, 255, 0.65)',
  '--glass-text-accent': 'rgba(139, 69, 19, 0.9)',

  '--glass-shadow-sm': '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  '--glass-shadow-md': '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  '--glass-shadow-lg': '0 12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
} as const;

export const glassStyles = {
  panel: {
    background: 'var(--glass-bg-primary)',
    backdropFilter: 'blur(var(--glass-blur-lg))',
    border: '1px solid var(--glass-border-primary)',
    borderRadius: '16px',
    boxShadow: 'var(--glass-shadow-md)',
    willChange: 'transform, box-shadow',
  },

  panelDarker: {
    background: 'var(--glass-bg-darker)',
    backdropFilter: 'blur(var(--glass-blur-xl))',
    border: '1px solid var(--glass-border-secondary)',
    borderRadius: '16px',
    boxShadow: 'var(--glass-shadow-lg)',
    willChange: 'transform, box-shadow',
  },

  control: {
    background: 'var(--glass-bg-secondary)',
    backdropFilter: 'blur(var(--glass-blur-md))',
    border: '1px solid var(--glass-border-secondary)',
    borderRadius: '12px',
    boxShadow: 'var(--glass-shadow-sm)',
    willChange: 'transform, background, border-color',
  },

  input: {
    background: 'var(--glass-bg-secondary)',
    backdropFilter: 'blur(var(--glass-blur-sm))',
    border: '1.5px solid var(--glass-border-secondary)',
    borderRadius: '14px',
    color: 'var(--glass-text-primary)',
    willChange: 'border-color, box-shadow',
    '::placeholder': {
      color: 'var(--glass-text-muted)',
      opacity: 0.8,
    },
  },

  button: {
    background: 'var(--glass-bg-secondary)',
    backdropFilter: 'blur(var(--glass-blur-md))',
    border: '1px solid var(--glass-border-primary)',
    borderRadius: '16px',
    color: 'var(--glass-text-primary)',
    boxShadow: 'var(--glass-shadow-sm)',
    willChange: 'transform, background, box-shadow',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export function applyGlassVariables(element?: HTMLElement): void {
  const target = element || document.documentElement;

  Object.entries(GLASS_VARIABLES).forEach(([property, value]) => {
    target.style.setProperty(property, value);
  });
}

export const GLASS_PERFORMANCE_HINTS = {
  transform3d: 'transform3d(0, 0, 0)',
  backfaceVisibility: 'hidden' as const,
  isolation: 'isolate' as const,
  willChange: 'transform, opacity, backdrop-filter' as const,
} as const;

export const glassAnimations = {
  fadeIn: {
    keyframes: [
      { opacity: 0, transform: 'scale(0.95) translateZ(0)' },
      { opacity: 1, transform: 'scale(1) translateZ(0)' },
    ],
    options: {
      duration: 200,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'both' as FillMode,
    },
  },

  slideIn: {
    keyframes: [
      { opacity: 0, transform: 'translateY(8px) translateZ(0)' },
      { opacity: 1, transform: 'translateY(0) translateZ(0)' },
    ],
    options: {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'both' as FillMode,
    },
  },

  scaleIn: {
    keyframes: [
      { opacity: 0, transform: 'scale(0.9) translateZ(0)' },
      { opacity: 1, transform: 'scale(1) translateZ(0)' },
    ],
    options: {
      duration: 250,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      fill: 'both' as FillMode,
    },
  },
} as const;

export function useGlassEffect(
  element: HTMLElement | null,
  variant: keyof typeof glassStyles
): () => void {
  if (!element) return () => {};

  const style = glassStyles[variant];
  const originalStyles: Record<string, string> = {};

  Object.entries(style).forEach(([property, value]) => {
    const camelCase = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    originalStyles[camelCase] = element.style.getPropertyValue(property);
    (element.style as unknown as Record<string, string>)[camelCase] = value as string;
  });

  Object.entries(GLASS_PERFORMANCE_HINTS).forEach(([property, value]) => {
    const camelCase = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (!originalStyles[camelCase]) {
      originalStyles[camelCase] = element.style.getPropertyValue(property);
    }
    (element.style as unknown as Record<string, string>)[camelCase] = value as string;
  });

  return () => {
    Object.entries(originalStyles).forEach(([property, value]) => {
      (element.style as unknown as Record<string, string>)[property] = value;
    });
  };
}

export function createGlassComponent<T extends Record<string, unknown>>(
  baseStyles: T,
  performanceOptimized = true
): T & typeof GLASS_PERFORMANCE_HINTS {
  if (!performanceOptimized) return baseStyles as T & typeof GLASS_PERFORMANCE_HINTS;

  return {
    ...baseStyles,
    ...GLASS_PERFORMANCE_HINTS,
  } as T & typeof GLASS_PERFORMANCE_HINTS;
}

export function initializeGlassEffects(): void {
  applyGlassVariables();

  if (document.body) {
    document.body.style.transform = GLASS_PERFORMANCE_HINTS.transform3d;
  }

  if ('CSS' in window && 'supports' in CSS) {
    const supportsBackdropFilter =
      CSS.supports('backdrop-filter', 'blur(1px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(1px)');

    document.documentElement.dataset.backdropSupport = supportsBackdropFilter.toString();
  }
}
