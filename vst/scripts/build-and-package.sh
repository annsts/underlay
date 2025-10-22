#!/bin/bash

# Underlay VST - Complete Build and Package Script
# Builds the VST plugin and creates a distributable DMG

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Underlay VST3 Build & Package        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VST_DIR="$PROJECT_ROOT/vst"

echo "Project root: $PROJECT_ROOT"
echo "VST directory: $VST_DIR"
echo ""

# Check for code signing identity
if [ -n "$CODESIGN_IDENTITY" ]; then
    echo -e "${GREEN}✓ Code signing enabled: $CODESIGN_IDENTITY${NC}"
else
    echo -e "${YELLOW}⚠ Code signing disabled (CODESIGN_IDENTITY not set)${NC}"
    echo "  Users will see security warnings on macOS"
    echo "  To enable: export CODESIGN_IDENTITY=\"Developer ID Application: Your Name (TEAMID)\""
fi
echo ""

# Step 1: Build Next.js UI
echo -e "${BLUE}Step 1/3: Checking Next.js UI...${NC}"
cd "$PROJECT_ROOT"
if [ ! -f "package.json" ]; then
    echo -e "${RED}ERROR: package.json not found in $PROJECT_ROOT${NC}"
    exit 1
fi

if [ ! -d "out" ]; then
    echo "Building UI for VST"
    BUILD_TARGET=vst npm run build
    echo -e "${GREEN}✓ UI build complete${NC}"
else
    echo -e "${GREEN}✓ Using existing UI build (out/ directory)${NC}"
fi
echo ""

# Step 2: Check VST3 SDK
echo -e "${BLUE}Step 2/3: Checking VST3 SDK...${NC}"
if [ ! -d "$VST_DIR/vst3sdk" ]; then
    echo -e "${RED}ERROR: VST3 SDK not found!${NC}"
    echo "Please run: cd $VST_DIR && git clone --recursive https://github.com/steinbergmedia/vst3sdk.git"
    exit 1
fi
echo -e "${GREEN}✓ VST3 SDK found${NC}"
echo ""

# Step 3: Build VST plugin
echo -e "${BLUE}Step 3/3: Building VST3 plugin...${NC}"
cd "$VST_DIR"
mkdir -p build
cd build

# Configure with CMake (code signing handled automatically via CODESIGN_IDENTITY env var)
cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_OSX_ARCHITECTURES="x86_64;arm64" \
    -DSMTG_CREATE_VST2_VERSION=OFF

# Build (code signing happens post-build if CODESIGN_IDENTITY is set)
cmake --build . --config Release --target UnderlayVST -j$(sysctl -n hw.ncpu)

echo -e "${GREEN}✓ VST3 plugin built${NC}"
echo ""

# Step 4: Create PKG installer (industry standard)
echo -e "${BLUE}Creating PKG installer...${NC}"
echo ""
cd "$VST_DIR"
"$SCRIPT_DIR/create-pkg-installer.sh"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          BUILD & PACKAGE COMPLETE         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Your PKG installer is ready:${NC}"
echo "  $VST_DIR/dist/UnderlayVST-v1.0.0-macOS.pkg"
echo ""
echo -e "${GREEN}How it works:${NC}"
echo "  • Double-click the PKG file"
echo "  • Native macOS installer launches"
echo "  • Plugin installs to /Library/Audio/Plug-Ins/VST3/"
echo ""

if [ -z "$CODESIGN_IDENTITY" ]; then
    echo -e "${YELLOW}⚠ PKG is unsigned${NC}"
    echo "  To sign: export INSTALLER_IDENTITY=\"Developer ID Installer: Name (TEAM)\""
else
    echo -e "${GREEN}✓ Plugin is signed${NC}"
fi
echo ""

echo -e "${BLUE}Test in your DAW and distribute${NC}"
