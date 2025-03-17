#!/bin/bash
# Build script for PageDAO Hub

# Exit on error
set -e

echo "Building PageDAO Hub..."

# Ensure pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "pnpm is not installed. Installing..."
    npm install -g pnpm
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build the core package first
echo "Building @pagedao/core..."
cd packages/core
pnpm build
cd ../..

# Build the API package
echo "Building @pagedao/api..."
cd packages/api
pnpm build
cd ../..

# Build the dashboard package
echo "Building @pagedao/dashboard..."
cd packages/dashboard
pnpm build
cd ../..

# Copy the netlify.toml to the root if it's not already there
if [ ! -f netlify.toml ]; then
    echo "Copying netlify.toml to root..."
    cp packages/api/netlify.toml .
fi

echo "Build complete!"
echo "To start the development server, run: pnpm dev"