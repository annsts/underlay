#!/bin/bash

echo "🧹 Cleaning Next.js cache and build artifacts..."

# Remove Next.js cache
rm -rf .next

# Remove TypeScript build info
find . -name ".tsbuildinfo" -type f -delete
find . -name "tsconfig.tsbuildinfo" -type f -delete

# Remove Next.js cache in node_modules
rm -rf node_modules/.cache

# Clear swc cache
rm -rf node_modules/.cache/swc

echo "✅ Cache cleaned successfully"
echo ""
echo "To rebuild:"
echo "  npm run build"
