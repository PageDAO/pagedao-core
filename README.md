# @pagedao/core

Core library for PageDAO Hub with blockchain connections and price calculations.

## Features

- Multi-chain support for Ethereum, Optimism, Base, and Osmosis
- Robust blockchain connections with automatic fallback mechanisms
- Real-time PAGE token price calculations across all networks
- TVL (Total Value Locked) calculation and weight distribution
- Support for different DEX types (Uniswap V2, Uniswap V3, Osmosis)
- Efficient caching mechanisms to minimize RPC calls
- TypeScript support with full type definitions

## Installation

```bash
npm install @pagedao/core
# or
yarn add @pagedao/core
```

## Usage

### Basic Example

```typescript
import { fetchPagePrices, fetchAllTVL, calculateTVLWeights } from '@pagedao/core';

async function getPageTokenMetrics() {
  // Get PAGE token prices across all networks
  const prices = await fetchPagePrices();
  console.log('PAGE Prices:', prices);
  
  // Get TVL data
  const tvlData = await fetchAllTVL(prices);
  console.log('TVL Data:', tvlData);
  
  // Calculate weights based on TVL
  const weights = calculateTVLWeights(tvlData);
  console.log('Network Weights:', weights);
  
  // Calculate weighted average price
  const weightedPrice = 
    prices.ethereum * weights.ethereum +
    prices.optimism * weights.optimism +
    prices.base * weights.base +
    prices.osmosis * weights.osmosis;
  
  console.log('Weighted Average Price:', weightedPrice);
}

getPageTokenMetrics();
```

### Working with Specific Chains

```typescript
import { 
  fetchEthPrice, 
  fetchEthereumPagePrice, 
  fetchOptimismPagePrice,
  fetchBasePagePrice,
  fetchOsmosisPrice
} from '@pagedao/core';

async function getChainSpecificData() {
  // Get ETH price in USD
  const ethPrice = await fetchEthPrice();
  console.log('ETH Price:', ethPrice);
  
  // Get PAGE price on Ethereum
  const ethPagePrice = await fetchEthereumPagePrice(ethPrice);
  console.log('Ethereum PAGE Price:', ethPagePrice);
  
  // Get PAGE price on Osmosis
  const osmosisPrice = await fetchOsmosisPrice();
  console.log('Osmosis PAGE Price:', osmosisPrice);
}
```

## API Reference

### Price Service

#### `fetchPagePrices(): Promise<PriceData>`

Fetches PAGE token prices from all supported chains.

**Returns:**
```typescript
interface PriceData {
  ethereum: number;  // PAGE price on Ethereum in USD
  optimism: number;  // PAGE price on Optimism in USD
  base: number;      // PAGE price on Base in USD
  osmosis: number;   // PAGE price on Osmosis in USD
  ethPrice: number;  // ETH price in USD
  timestamp: number; // Timestamp of when the data was fetched
}
```

**Example:**
```typescript
const prices = await fetchPagePrices();
console.log(`PAGE on Ethereum: $${prices.ethereum.toFixed(6)}`);
console.log(`PAGE on Optimism: $${prices.optimism.toFixed(6)}`);
console.log(`PAGE on Base: $${prices.base.toFixed(6)}`);
console.log(`PAGE on Osmosis: $${prices.osmosis.toFixed(6)}`);
```

#### `fetchEthPrice(): Promise<number>`

Fetches the current ETH price in USD from a Uniswap V3 pool on Base.

**Returns:** ETH price in USD as a number.

**Example:**
```typescript
const ethPrice = await fetchEthPrice();
console.log(`Current ETH price: $${ethPrice.toFixed(2)}`);
```

#### `fetchEthereumPagePrice(ethPrice: number): Promise<number>`

Fetches PAGE token price on Ethereum.

**Parameters:**
- `ethPrice`: Current ETH price in USD

**Returns:** PAGE price in USD on Ethereum.

#### `fetchOptimismPagePrice(ethPrice: number): Promise<number>`

Fetches PAGE token price on Optimism.

**Parameters:**
- `ethPrice`: Current ETH price in USD

**Returns:** PAGE price in USD on Optimism.

#### `fetchBasePagePrice(ethPrice: number): Promise<number>`

Fetches PAGE token price on Base.

**Parameters:**
- `ethPrice`: Current ETH price in USD

**Returns:** PAGE price in USD on Base.

#### `fetchOsmosisPrice(): Promise<number>`

Fetches PAGE token price on Osmosis.

**Returns:** PAGE price in USD on Osmosis.

### TVL Service

#### `fetchAllTVL(priceData: PriceData): Promise<TvlData>`

Fetches Total Value Locked (TVL) for all networks.

**Parameters:**
- `priceData`: Price data object from `fetchPagePrices()`

**Returns:**
```typescript
interface TvlData {
  ethereum: number;  // TVL on Ethereum in USD
  optimism: number;  // TVL on Optimism in USD
  base: number;      // TVL on Base in USD
  osmosis: number;   // TVL on Osmosis in USD
  timestamp: number; // Timestamp of when the data was fetched
}
```

**Example:**
```typescript
const prices = await fetchPagePrices();
const tvlData = await fetchAllTVL(prices);
console.log(`Total TVL: $${(
  tvlData.ethereum + 
  tvlData.optimism + 
  tvlData.base + 
  tvlData.osmosis
).toLocaleString()}`);
```

#### `calculateTVLWeights(tvlData: TvlData): TvlWeights`

Calculates the weight distribution based on TVL across networks.

**Parameters:**
- `tvlData`: TVL data object from `fetchAllTVL()`

**Returns:**
```typescript
interface TvlWeights {
  ethereum: number;  // Ethereum's proportion of total TVL (0-1)
  optimism: number;  // Optimism's proportion of total TVL (0-1)
  base: number;      // Base's proportion of total TVL (0-1)
  osmosis: number;   // Osmosis's proportion of total TVL (0-1)
}
```

**Example:**
```typescript
const tvlData = await fetchAllTVL(prices);
const weights = calculateTVLWeights(tvlData);
console.log(`Ethereum weight: ${(weights.ethereum * 100).toFixed(2)}%`);
console.log(`Optimism weight: ${(weights.optimism * 100).toFixed(2)}%`);
console.log(`Base weight: ${(weights.base * 100).toFixed(2)}%`);
console.log(`Osmosis weight: ${(weights.osmosis * 100).toFixed(2)}%`);
```

### Blockchain Provider

#### `getProvider(chain: string): Promise<ethers.providers.JsonRpcProvider>`

Gets an ethers.js provider for the specified chain with automatic fallback capability.

**Parameters:**
- `chain`: Chain name ('ethereum', 'optimism', 'base')

**Returns:** A working ethers.js JsonRpcProvider.

**Example:**
```typescript
import { getProvider } from '@pagedao/core';

async function getBlockNumber() {
  const provider = await getProvider('ethereum');
  const blockNumber = await provider.getBlockNumber();
  console.log(`Current Ethereum block: ${blockNumber}`);
}
```

## Architecture

The library is organized into several modules:

- **Blockchain Module**: Handles connections to different blockchains with fallback mechanisms
- **Price Service**: Calculates token prices across different DEXes and chains
- **TVL Service**: Determines liquidity and calculates weights
- **Configuration**: Manages token addresses, RPC endpoints, and other constants

## Supported Chains

| Chain | Network | DEX Type | Pool Address |
|-------|---------|----------|-------------|
| Ethereum | Mainnet | Uniswap V2 | 0x9a25d21e204f10177738edb0c3345bd88478aaa2 |
| Optimism | Mainnet | Uniswap V2 | 0x5421DA31D54640b58355d8D16D78af84D34D2405 |
| Base | Mainnet | Uniswap V3 | 0xb05113fbB5f2551Dc6f10EF3C4EfFB9C03C0E3E9 |
| Osmosis | Mainnet | Osmosis Pool | Pool ID: 1344 |

## Caching

The library implements caching to minimize RPC calls:

- Price data is cached for 5 minutes by default
- TVL data is cached for 5 minutes by default
- Provider instances are cached for the duration of the session

## Error Handling

The library implements robust error handling:

- Automatic fallback to backup RPC endpoints when primary endpoints fail
- Detailed error messages with specific failure reasons
- Graceful degradation when certain chains are unavailable

## License

MIT
