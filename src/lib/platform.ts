/**
 * Platform detection utilities
 * Provides environment detection for VST plugin vs standalone web app
 */

export enum Platform {
  WEB = 'web',
  VST = 'vst',
}

/**
 * Detects the current platform environment
 * VST environment is identified by the presence of WKWebView message handlers
 */
export function detectPlatform(): Platform {
  if (typeof window === 'undefined') {
    return Platform.WEB;
  }

  const hasVSTBridge = window.webkit?.messageHandlers?.vstHost !== undefined;

  return hasVSTBridge ? Platform.VST : Platform.WEB;
}

/**
 * Platform-specific configuration and utilities
 */
export class PlatformConfig {
  private static _platform: Platform | null = null;

  static get platform(): Platform {
    if (this._platform === null) {
      this._platform = detectPlatform();
    }
    return this._platform;
  }

  static get isVST(): boolean {
    return this.platform === Platform.VST;
  }

  static get isWeb(): boolean {
    return this.platform === Platform.WEB;
  }

  /**
   * Reset platform detection
   */
  static reset(): void {
    this._platform = null;
  }
}

/**
 * TypeScript declaration for webkit message handlers
 */
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        vstHost?: {
          postMessage: (message: unknown) => void;
        };
      };
    };
  }
}
