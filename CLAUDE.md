# CLAUDE.md

Claude Code guidance for this repository.

## Project

Underlay - ambient music generation powered by Google Lyria AI. Glass morphism UI for layered, real-time music composition.

## Core Files

- `src/components/player/player.tsx` - Main interface
- `src/hooks/use-lyria-session.ts` - Lyria API (@google/genai SDK)
- `src/hooks/use-audio-session.ts` - Web Audio API buffer scheduling
- `src/hooks/use-session-timer.ts` - 10-minute session timer
- `src/lib/audio-analyzer.ts` - Audio analysis

## Stack

- Next.js 15.4.6 + React 19.1.0 + TypeScript
- @google/genai (Lyria SDK)
- TailwindCSS 4.x
- shadcn/ui + Radix UI
- Framer Motion
- Web Audio API (48kHz stereo, 16-bit PCM)

## Commands

```bash
npm run dev          # Dev server
npm run build        # Static export
npm run vst:build    # Build VST plugin
```

## Environment

```
NEXT_PUBLIC_GEMINI_API_KEY=your_key
```

## Development Notes

**Audio:**
- WebSocket streaming via @google/genai SDK
- Must wait for `setupComplete` message before sending prompts/config
- 1.8s buffer lead (`use-audio-session.ts:10`)
- Auto-rebuffer on underflow
- Density/brightness omitted when 0 (model decides)
- Audio format is 48kHz stereo, 16-bit PCM (server-defined, not configurable)

**State:**
- Local React hooks
- Weighted prompts for layer blending
- Real-time parameter updates via SDK

**UI:**
- Glass morphism components in `src/components/ui/glass/`
- Theme files: `src/styles/themes/`
- Dual visualizer: fractal tree + grainy shader

## Adding Music Parameters

1. Update `GlobalConfig` in `src/types/lyria.ts`
2. Add UI controls in `src/components/player/`
3. Update `sendConfig()` in `use-lyria-session.ts`

## Adding Themes

**3 files to edit:**

1. **Create theme CSS**: `src/styles/themes/my-theme.css`
   ```css
   .theme-my-theme {
     --primary: #your-color;
     --glass-bg: rgba(0, 0, 0, 0.5);
     --text-primary: #ffffff;
     /* Copy vars from glass.css or dark.css */
   }
   ```

2. **Register theme**: `src/lib/theme-init.ts`
   ```typescript
   // Line 4
   export type ThemeType = 'glass' | 'dark' | 'my-theme';

   // Lines 9-13
   const THEME_CONFIG = {
     glass: 'theme-glass',
     dark: 'theme-dark',
     'my-theme': 'theme-my-theme',
   } as const;

   // Lines 83-87
   const themeClasses = {
     'glass': 'theme-glass',
     'dark': 'theme-dark',
     'my-theme': 'theme-my-theme'
   };
   ```

3. **Import CSS**: `src/app/globals.css`
   ```css
   @import '../styles/themes/my-theme.css';
   ```

## VST Integration

VST uses WKWebView for UI embedding:
- WKWebView loads Next.js static export from `out/`
- C++ VST sends parameters via JavaScript custom events
- See `vst/README.md` for VST details
