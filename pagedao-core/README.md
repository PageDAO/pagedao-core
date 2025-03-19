# @pagedao/core

Core library for PageDAO Hub with blockchain connections and price calculations.

## Features

- Blockchain connections to Ethereum, Optimism, Base, and Osmosis
- Price calculation for PAGE token across all networks
- TVL calculation and weight distribution
- Caching mechanisms for efficient data retrieval

## Installation

```bash
npm install @pagedao/core
# or
yarn add @pagedao/core
```

## Usage

```typescript
import { fetchPagePrices, fetchAllTVL, calculateTVLWeights } from '@pagedao/core';

// Get PAGE token prices across all networks
const prices = await fetchPagePrices();
console.log(prices);

// Get TVL data
const tvlData = await fetchAllTVL(prices);
console.log(tvlData);

// Calculate weights based on TVL
const weights = calculateTVLWeights(tvlData);
console.log(weights);
```

## API Reference

### Price Service

#### `fetchPagePrices(): Promise<PriceData>`

Fetches PAGE token prices from all supported chains.

```typescript
interface PriceData {
  ethereum: number;
  optimism: number;
  base: number;
  osmosis: number;
  ethPrice: number;
  timestamp: number;
}
```

#### `fetchEthPrice(): Promise<number>`

Fetches the current ETH price in USD from a Uniswap V3 pool.

### TVL Service

#### `fetchAllTVL(priceData: PriceData): Promise<TvlData>`

Fetches Total Value Locked (TVL) for all networks.

```typescript
interface TvlData {
  ethereum: number;
  optimism: number;
  base: number;
  osmosis: number;
  timestamp: number;
}
```

#### `calculateTVLWeights(tvlData: TvlData): TvlWeights`

Calculates the weight distribution based on TVL across networks.

```typescript
interface TvlWeights {
  ethereum: number;
  optimism: number;
  base: number;
  osmosis: number;
}
```

## License

MIT
