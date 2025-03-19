# PageDAO Hub

A comprehensive dashboard and API suite for the PageDAO ecosystem, providing token metrics, governance data, and interactions across multiple blockchains (Ethereum, Optimism, Base, Osmosis).

## Project Overview

PageDAO Hub serves as the central interface for interacting with the PageDAO ecosystem. It provides:

- Comprehensive visibility into token metrics across multiple chains
- Sophisticated liquidity-weighted price calculation
- Dashboard for visualizing data and trends
- API endpoints for programmatic access
- Integration with Claude through the Model Context Protocol (MCP)

The system is designed with a modular, extensible architecture that can accommodate future growth and additional features.

## Repository Structure

The repository is organized as a monorepo with the following packages:

- `packages/core`: Core library with shared functionality
- `packages/api`: API endpoints implemented as Netlify Functions
- `packages/dashboard`: React-based dashboard for visualization
- `packages/frame`: Farcaster Frame integration (optional)

## Getting Started

### Prerequisites

- Node.js v18 or higher
- PNPM v8 or higher
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/pagedao/pagedao-hub.git
   cd pagedao-hub
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file and fill in any required values.

4. Build the packages:
   ```bash
   pnpm build
   ```

### Development

To start the development servers:

```bash
pnpm dev
```

This will start the development servers for both the API and dashboard.

To start only the dashboard:

```bash
pnpm dev:dashboard
```

To start only the API:

```bash
pnpm dev:api
```

### Testing

To run all tests:

```bash
pnpm test
```

### Linting and Formatting

To lint all packages:

```bash
pnpm lint
```

To format all files:

```bash
pnpm format
```

## Deployment

### Netlify Deployment

The project is designed to be deployed on Netlify:

1. Create a new site in Netlify
2. Connect to your GitHub repository
3. Configure the build settings:
   - Build command: `pnpm build`
   - Publish directory: `packages/dashboard/dist`
4. Configure the environment variables in the Netlify dashboard
5. Deploy the site

### Environment Variables

See the `.env.example` file for a list of all environment variables and their descriptions.

## Architecture

PageDAO Hub follows a three-layer architecture:

1. **Data Collection Layer**: Fetches and processes data from various blockchain sources
2. **API Layer**: Standardizes access to data through well-documented endpoints
3. **Presentation Layer**: React-based dashboard for displaying and interacting with data

## API Documentation

### Core Endpoints

- `/api/v1/token/price`: Current token prices across all chains
- `/api/v1/token/price/:chain`: Chain-specific price metrics
- `/api/v1/liquidity/tvl`: Total value locked across all chains
- `/api/v1/liquidity/tvl/:chain`: Chain-specific TVL data

For more detailed API documentation, see the [API Documentation](docs/api.md).

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.