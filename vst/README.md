# Underlay VST3 Plugin

VST3 wrapper for Underlay. **macOS only.** Tested in Ableton Live.

## Installation

1. Download `UnderlayVST-v1.0.0-macOS.pkg`
2. **Right-click** → **Open** (bypasses Gatekeeper)
3. Click **Install**
4. Restart DAW, rescan plugins
5. Load "Underlay", enter API key

**API key**: https://ai.google.dev/gemini-api/docs/api-key

### Bypassing Gatekeeper

**This plugin is unsigned.** macOS will block it. Bypass:

**Right-click** `.pkg` → **Open** → **Open**

or

```bash
xattr -d com.apple.quarantine /path/to/UnderlayVST-v1.0.0-macOS.pkg
```

## Architecture

```
┌─────────────────────────────────┐
│       DAW (Host)                │
│  ┌───────────────────────────┐  │
│  │   VST3 Processor (C++)    │  │
│  │   ↕                       │  │
│  │   WebView Bridge (WK)     │  │
│  │   ↕                       │  │
│  │   Next.js UI + Web Audio  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

- **VST3 Processor**: Audio I/O, MIDI, automation
- **WKWebView**: Loads Next.js static export from `out/`
- **Bridge**: JavaScript custom events (not IPC)
- **Web Audio API**: Generates audio, routes to VST

## Building

### Quick Build

```bash
cd vst/
./scripts/build-and-package.sh
```

Output: `dist/UnderlayVST-v1.0.0-macOS.pkg`

### Manual Build

```bash
# 1. Build UI
cd /Users/ao/Desktop/lyria_draft
npm install && npm run build

# 2. Build VST (universal: Intel + Apple Silicon)
cd vst/
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES="x86_64;arm64"
cmake --build . --config Release -j$(sysctl -n hw.ncpu)

# 3. Install locally
cp -R VST3/Release/UnderlayVST.vst3 ~/Library/Audio/Plug-Ins/VST3/
```

### Prerequisites

```bash
# VST3 SDK
cd vst/
git clone --recursive https://github.com/steinbergmedia/vst3sdk.git

# Tools
brew install cmake node
xcode-select --install
```

## Parameters

### Global
- BPM (60-200)
- Density (0-1)
- Brightness (0-1)
- Guidance (0-6)
- Temperature (0-3)
- Top K (1-1000)
- Volume (0-100)
- Scale (dropdown)
- Mode (Quality/Diversity/Vocal)

### Mix
- Mute Bass
- Mute Drums
- Bass & Drums Only

### Layers (50x)
- Weight (0.1-3.0)
- Enabled (toggle)

## MIDI CC Mapping

| CC  | Parameter   | Range         |
|-----|-------------|---------------|
| 7   | Volume      | 0-127         |
| 20  | BPM         | 0-127 (60-200)|
| 21  | Density     | 0-127         |
| 22  | Brightness  | 0-127         |
| 23  | Guidance    | 0-127         |
| 24  | Temperature | 0-127         |

## Known Limitations

1. **macOS only** - Uses WKWebView (no Windows/Linux)
2. **Only tested in Ableton Live** - May work in other DAWs
3. **Latency**: ~50-100ms (bridge + Web Audio)
4. **Session Limits**: 10-minute Lyria limit (auto-reconnect available)

## Development

**Debug logging**:
```bash
export UNDERLAY_DEBUG=1
# Logs: ~/Library/Logs/Underlay/vst.log
```

**Testing**:
- Use VST3 Plugin Test Host
- Load in DAW: Audio Effects → VST3

**Code format**:
```bash
clang-format -i vst/src/*.cpp vst/src/*.h
```

## License

MIT
