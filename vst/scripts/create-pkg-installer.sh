#!/bin/bash

# Underlay VST - PKG Installer Creator
# Creates a macOS installer package (.pkg) using Apple's native tools
# This is the industry standard for VST plugin distribution

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Underlay VST3 PKG Creator          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# Configuration
VERSION="1.0.0"
PLUGIN_NAME="UnderlayVST"
VST_BUNDLE="${PLUGIN_NAME}.vst3"
PKG_NAME="${PLUGIN_NAME}-v${VERSION}-macOS"
DIST_DIR="dist"
TEMP_DIR="$DIST_DIR/pkg_temp"
PKG_FILE="$DIST_DIR/${PKG_NAME}.pkg"

# Code signing identity (optional)
CODESIGN_IDENTITY="${CODESIGN_IDENTITY:-}"
INSTALLER_IDENTITY="${INSTALLER_IDENTITY:-$CODESIGN_IDENTITY}"

# Check if VST is built
SOURCE_VST=""
if [ -d "build/VST3/Release/$VST_BUNDLE" ]; then
    SOURCE_VST="build/VST3/Release/$VST_BUNDLE"
elif [ -d "build/VST3/Debug/$VST_BUNDLE" ]; then
    SOURCE_VST="build/VST3/Debug/$VST_BUNDLE"
    echo -e "${YELLOW}Warning: Using Debug build${NC}"
else
    echo -e "${RED}Error: VST not built. Run: cmake --build build --config Release${NC}"
    exit 1
fi

echo -e "Found VST: ${GREEN}$SOURCE_VST${NC}"

# Check for UI build
if [ ! -d "../out" ]; then
    echo -e "${YELLOW}Warning: UI not built. Run: npm run build${NC}"
    echo "Continuing without UI assets..."
fi

# Clean and create temp directory
echo "Creating temporary package staging area..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR/payload"

# Copy VST bundle to staging
echo "Copying VST plugin..."
cp -R "$SOURCE_VST" "$TEMP_DIR/payload/"

# Bundle UI assets if available
if [ -d "../out" ]; then
    echo "Bundling UI assets..."
    mkdir -p "$TEMP_DIR/payload/$VST_BUNDLE/Contents/Resources"
    cp -R "../out" "$TEMP_DIR/payload/$VST_BUNDLE/Contents/Resources/"
fi

# Sign the plugin if identity is provided
if [ -n "$CODESIGN_IDENTITY" ]; then
    echo -e "${BLUE}Signing plugin with identity: $CODESIGN_IDENTITY${NC}"

    # Sign all binaries in the bundle
    find "$TEMP_DIR/payload/$VST_BUNDLE" -type f \( -name "*.dylib" -o -perm +111 \) -print0 | while IFS= read -r -d '' file; do
        codesign --force --sign "$CODESIGN_IDENTITY" \
            --options runtime \
            --timestamp \
            "$file" 2>/dev/null || true
    done

    # Sign the entire bundle
    codesign --force --sign "$CODESIGN_IDENTITY" \
        --options runtime \
        --timestamp \
        --deep \
        "$TEMP_DIR/payload/$VST_BUNDLE"

    # Verify
    if codesign --verify --deep --strict "$TEMP_DIR/payload/$VST_BUNDLE" 2>/dev/null; then
        echo -e "${GREEN}  ✓ Plugin signed successfully${NC}"
    else
        echo -e "${YELLOW}  ⚠ Signature verification failed${NC}"
    fi
else
    echo -e "${YELLOW}Skipping code signing (no identity set)${NC}"
fi

# Remove old PKG if exists
if [ -f "$PKG_FILE" ]; then
    echo "Removing old PKG..."
    rm "$PKG_FILE"
fi

# Create PKG installer using pkgbuild
echo ""
echo "Creating PKG installer..."

PKG_IDENTIFIER="com.underlay.vst3.pkg"
INSTALL_LOCATION="/Library/Audio/Plug-Ins/VST3"

# Build package command
PKGBUILD_CMD="pkgbuild \
    --root \"$TEMP_DIR/payload\" \
    --identifier \"$PKG_IDENTIFIER\" \
    --version \"$VERSION\" \
    --install-location \"$INSTALL_LOCATION\""

# Add signing if installer identity is provided
if [ -n "$INSTALLER_IDENTITY" ]; then
    echo -e "${BLUE}Signing installer with: $INSTALLER_IDENTITY${NC}"
    PKGBUILD_CMD="$PKGBUILD_CMD --sign \"$INSTALLER_IDENTITY\""
else
    echo -e "${YELLOW}Creating unsigned installer${NC}"
fi

PKGBUILD_CMD="$PKGBUILD_CMD \"$PKG_FILE\""

# Execute pkgbuild
eval $PKGBUILD_CMD

# Check if PKG was created
if [ ! -f "$PKG_FILE" ]; then
    echo -e "${RED}Error: PKG creation failed${NC}"
    exit 1
fi

# Clean up temp directory
echo "Cleaning up..."
rm -rf "$TEMP_DIR"

# Get PKG size
PKG_SIZE=$(du -h "$PKG_FILE" | cut -f1)

echo ""
echo -e "${GREEN}✓ PKG installer created successfully!${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}Installer Location:${NC}"
echo "  $PKG_FILE"
echo ""
echo -e "${GREEN}Size:${NC} $PKG_SIZE"
echo ""
echo -e "${BLUE}Install:${NC} Double-click PKG → /Library/Audio/Plug-Ins/VST3/"
echo ""
if [ -z "$INSTALLER_IDENTITY" ]; then
    echo -e "${YELLOW}⚠ PKG is unsigned${NC}"
    echo "  To sign: export INSTALLER_IDENTITY=\"Developer ID Installer: Name (TEAM)\""
else
    echo -e "${GREEN}✓ PKG is signed${NC}"
fi
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
