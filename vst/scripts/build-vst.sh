#!/bin/bash

# Underlay VST Build Script
# Builds the complete VST plugin with bundled UI

set -e

echo "========================================="
echo "Underlay VST3 Plugin Build"
echo "========================================="
echo ""

# Get project root (3 levels up from this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VST_DIR="$PROJECT_ROOT/vst"

echo "Project root: $PROJECT_ROOT"
echo "VST directory: $VST_DIR"
echo ""

# Step 1: Build the Next.js app
echo "Step 1/4: Building Next.js production app..."
cd "$PROJECT_ROOT"
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found in $PROJECT_ROOT"
    exit 1
fi

npm run build
echo "✓ Next.js build complete (output: out/)"
echo ""

# Step 2: Check for VST3 SDK
echo "Step 2/4: Checking VST3 SDK..."
if [ ! -d "$VST_DIR/vst3sdk" ]; then
    echo "ERROR: VST3 SDK not found!"
    echo "Please run: cd $VST_DIR && git clone --recursive https://github.com/steinbergmedia/vst3sdk.git"
    exit 1
fi
echo "✓ VST3 SDK found"
echo ""

# Step 3: Build VST plugin
echo "Step 3/4: Building VST3 plugin with CMake..."
cd "$VST_DIR"
mkdir -p build
cd build

cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_OSX_ARCHITECTURES="x86_64;arm64" \
    -DSMTG_CREATE_VST2_VERSION=OFF

cmake --build . --config Release -j$(sysctl -n hw.ncpu)
echo "✓ VST3 plugin built"
echo ""

# Step 4: Install plugin
echo "Step 4/4: Installing to system VST3 directory..."
sudo cmake --install . --config Release
echo "✓ Plugin installed to ~/Library/Audio/Plug-Ins/VST3/"
echo ""

echo "========================================="
echo "Build Complete!"
echo "========================================="
echo ""
echo "The plugin is now installed and ready to use."
echo "Restart your DAW to load the plugin."
echo ""
echo "Location: ~/Library/Audio/Plug-Ins/VST3/Underlay.vst3"
echo ""
