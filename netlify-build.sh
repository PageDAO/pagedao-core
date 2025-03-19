#!/bin/bash
# Netlify build script for PageDAO Hub monorepo

# Exit on error
set -e

echo "PageDAO Hub - Netlify Build Starting"
echo "Node version: $(node -v)"
echo "PNPM version: $(pnpm -v)"

# Install dependencies (Netlify should have pnpm already installed)
echo "Installing dependencies..."
pnpm install

# Build packages in the correct order
echo "Building @pagedao/core..."
cd packages/core
pnpm build
cd ../..

echo "Building @pagedao/api..."
cd packages/api
pnpm build
cd ../..

echo "Building @pagedao/dashboard..."
cd packages/dashboard
pnpm build
cd ../..

# Copy original Frame functions to netlify/functions (if they exist)
if [ -d "packages/frame/netlify/functions" ]; then
  echo "Copying Frame functions to netlify/functions..."
  cp -r packages/frame/netlify/functions/* netlify/functions/
fi

# Create needed directories for dashboard serving
echo "Setting up public directory..."
mkdir -p public

# Copy dashboard build to public (optional, as publish dir is set to packages/dashboard/dist in netlify.toml)
# Uncomment if you want to copy to public instead
# echo "Copying dashboard build to public..."
# cp -r packages/dashboard/dist/* public/

echo "Build completed successfully!"