# Farcaster Frame Development Playbook for PAGE Token

## Overview
This playbook outlines the process of developing, testing, and deploying a Farcaster Frame for displaying PAGE token prices across multiple blockchains (Ethereum, Base, Optimism, and Osmosis) using Netlify Functions.

## Development Strategy
We're taking a two-phase approach:

1. **Development Phase**: Work within the existing readme-clubs repository
    - Leverage existing token service logic from TypeScript files
    - Convert TypeScript utilities to JavaScript for Netlify Functions
    - Test within the current project structure

2. **Extraction Phase**: Move to a dedicated repository
    - Create a clean, focused repository for just the Frame
    - Simplify code where possible
    - Deploy independently from the main application

## Components Required

### Core Functions
- **frame.js**: Generates HTML with Farcaster meta tags
- **image.js**: Creates dynamic price visualization images
- **tokenServices.js**: Fetches token prices from multiple chains
- **constants.js**: Stores configuration values

### Supporting Files
- **netlify.toml**: Configures Netlify deployment
- **package.json**: Defines dependencies (axios, ethers, canvas)

## Implementation Principles

### Price Accuracy & Transparency
- Use on-chain data directly from liquidity pools
- Avoid fallbacks or "guessed" values 
- Display clear error messages when data cannot be fetched
- Let errors propagate to user rather than silently using defaults

### Web3 Integration
- Use ethers.js for interacting with EVM chains
- Query Uniswap V2 pairs directly for pool reserves
- Implement correct PAGE price calculation from pool data
- Separate chain-specific functionality for maintainability

### Caching Strategy
- Cache price data for reasonable durations (5 minutes)
- Use caching for performance, not as fallback mechanism
- Clear cache on explicit refresh requests

## Development Workflow

### 1. Set Up Local Environment
- Install Netlify CLI: `npm install -g netlify-cli`
- Install required dependencies: `npm install axios ethers canvas`
- Configure proper directory structure for Netlify Functions

### 2. Convert TypeScript Services to JavaScript
- Port token price calculation logic to JavaScript
- Implement web3 functionality for EVM chains
- Create HTTP clients for Osmosis API

### 3. Implement Frame Function
- Create HTML with required Farcaster meta tags
- Handle chain selection via buttons
- Support refreshing of price data
- Pass appropriate parameters to image generation

### 4. Implement Image Generation
- Use Canvas to create price visualizations
- Show prices from all chains or selected chain
- Include timestamp and PAGE branding
- Format prices consistently

### 5. Local Testing
- Test with `netlify dev`
- Verify prices match on-chain data
- Test error scenarios

## Testing with Frame Validators

### Frame Validators to Use
- Warpcast Frame Validator
- Frames.js Debugger

### What to Test
- **Basic functionality**: `/.netlify/functions/frame`
- **Chain selection**: `/.netlify/functions/frame?chain=ethereum`
- **Error handling**: Test with invalid parameters
- **Image generation**: Verify with different chains and states

## Debugging Common Issues

### 502 Bad Gateway Errors
- Check function logs in Netlify dashboard
- Look for errors in web3 provider connections
- Verify RPC URLs are accessible

### Web3 Connection Issues
- Check RPC URL availability and rate limits
- Verify contract addresses are correct
- Test ABI compatibility with contracts

### Image Generation Issues
- Ensure all required dependencies are installed
- Verify Canvas is properly configured in Netlify
- Check image dimensions (1.91:1 aspect ratio)

## Deployment to Production

### Netlify Configuration
```toml
[build]
   functions = "netlify/functions"

[functions]
   node_bundler = "esbuild"

[[redirects]]
   from = "/frame"
   to = "/.netlify/functions/frame"
   status = 200

[[redirects]]
   from = "/image"
   to = "/.netlify/functions/image"
   status = 200
```

### Environment Variables
- Set RPC URLs for production
- Configure rate limiting if needed

### Post-Deployment Verification
- Test all frame functionality in production
- Verify prices against blockchain explorers
- Check image loading and caching behavior

## Resources
- [Farcaster Frames Documentation](https://docs.farcaster.xyz/learn/what-is-farcaster/frames)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Canvas NPM Package](https://www.npmjs.com/package/canvas)
