import axios from 'axios';
import { TOKEN_DECIMALS } from '../../constants';

// Logger setup
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[TVL-OSMOSIS:INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[TVL-OSMOSIS:WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[TVL-OSMOSIS:ERROR] ${message}`, data ? data : '');
  }
};

// Constants for Osmosis
const OSMOSIS_LCD = "https://lcd.osmosis.zone";
const OSMOSIS_PAGE_DENOM = "ibc/23A62409E4AD8133116C249B1FA38EED30E500A115D7B153109462CD82C1CD99";
const OSMO_USDC_DENOM = "ibc/D189335C6E4A68B513C10AB227BF1C1D38C746766278BA3EEB4FB14124F1D858";
const PAGE_POOL_ID = "1344";
const OSMO_USDC_POOL_ID = "678";

/**
 * Interface for Osmosis pool data
 */
export interface OsmosisPoolData {
  pool_id: string;
  symbol: string;
  liquidity: number;
  price: number;
  volume_24h: number;
  volume_7d: number;
  fees: number;
  liquidity_atom: number;
  [key: string]: any; // For additional properties
}

/**
 * Interface for Osmosis pool assets
 */
export interface OsmosisPoolAsset {
  token: {
    denom: string;
    amount: string;
  };
  weight: string;
}

/**
 * Calculate TVL for an Osmosis pool
 * @param poolData The pool data from Osmosis API
 * @returns The total value locked in USD
 */
export async function calculateOsmosisTVL(poolData: OsmosisPoolData): Promise<number> {
  try {
    logger.info(`Calculating Osmosis pool TVL for pool ID ${poolData.pool_id}`);
    
    // Osmosis API directly provides liquidity in USD
    const tvl = poolData.liquidity;
    
    logger.info(`Osmosis pool TVL calculated: $${tvl.toFixed(2)}`);
    return tvl;
  } catch (error) {
    logger.error(`Failed to calculate Osmosis pool TVL`, error);
    throw new Error(`Osmosis pool TVL calculation failed: ${(error as Error).message}`);
  }
}

/**
 * Fetch Osmosis TVL directly from API
 * @param poolId The Osmosis pool ID
 * @returns The total value locked in USD
 */
export async function fetchOsmosisTVL(poolId: string = PAGE_POOL_ID): Promise<number> {
  try {
    logger.info(`Fetching Osmosis TVL for pool ID ${poolId}`);
    const response = await axios.get(`https://api-osmosis.imperator.co/pools/v2/${poolId}`);
    
    if (!response.data) {
      throw new Error(`Osmosis API returned empty response`);
    }
    
    const poolData = response.data as OsmosisPoolData;
    return calculateOsmosisTVL(poolData);
  } catch (error) {
    logger.error(`Failed to fetch Osmosis TVL for pool ID ${poolId}`, error);
    throw new Error(`Osmosis TVL fetch failed: ${(error as Error).message}`);
  }
}

/**
 * Fetch Osmosis pool data directly from LCD endpoint
 * This is an alternative to the Imperator API and provides more raw data
 * @param poolId The Osmosis pool ID
 * @returns Pool data from Osmosis LCD
 */
export async function fetchOsmosisPoolFromLCD(poolId: string = PAGE_POOL_ID): Promise<any> {
  try {
    logger.info(`Fetching Osmosis pool data from LCD for pool ID ${poolId}`);
    const response = await axios.get(`${OSMOSIS_LCD}/osmosis/gamm/v1beta1/pools/${poolId}`);
    
    if (!response.data || !response.data.pool) {
      throw new Error('Invalid pool data structure');
    }
    
    return response.data.pool;
  } catch (error) {
    logger.error(`Failed to fetch Osmosis pool from LCD for pool ID ${poolId}`, error);
    throw new Error(`Osmosis pool LCD fetch failed: ${(error as Error).message}`);
  }
}

/**
 * Calculate TVL from raw Osmosis LCD pool data
 * @param poolData Pool data from LCD
 * @param osmoPriceUsd The price of OSMO in USD
 * @param pagePriceUsd The price of PAGE in USD (optional, will be calculated if not provided)
 * @returns The total value locked in USD
 */
export async function calculateTVLFromLCDData(
  poolData: any,
  osmoPriceUsd: number,
  pagePriceUsd?: number
): Promise<{tvl: number, pagePrice: number}> {
  try {
    if (!poolData || !poolData.pool_assets) {
      throw new Error('Invalid pool data structure');
    }
    
    const assets = poolData.pool_assets as OsmosisPoolAsset[];
    
    // Find PAGE and OSMO in pool assets
    const pageAsset = assets.find(asset => 
      asset.token.denom === OSMOSIS_PAGE_DENOM
    );
    
    const osmoAsset = assets.find(asset => 
      asset.token.denom === 'uosmo'
    );
    
    if (!pageAsset || !osmoAsset) {
      throw new Error('Could not identify tokens in pool');
    }
    
    // Calculate amounts
    const pageAmount = Number(pageAsset.token.amount) / Math.pow(10, TOKEN_DECIMALS.PAGE);
    const osmoAmount = Number(osmoAsset.token.amount) / Math.pow(10, TOKEN_DECIMALS.OSMO);
    
    // Calculate PAGE price if not provided
    const calculatedPagePrice = pagePriceUsd || (osmoAmount * osmoPriceUsd) / pageAmount;
    
    // Calculate TVL
    const osmoTVL = osmoAmount * osmoPriceUsd;
    const pageTVL = pageAmount * calculatedPagePrice;
    const totalTVL = osmoTVL + pageTVL;
    
    logger.info(`Osmosis Pool TVL calculation from LCD data:`);
    logger.info(`- ${pageAmount.toFixed(2)} PAGE at $${calculatedPagePrice.toFixed(6)} = $${pageTVL.toFixed(2)}`);
    logger.info(`- ${osmoAmount.toFixed(2)} OSMO at $${osmoPriceUsd.toFixed(6)} = $${osmoTVL.toFixed(2)}`);
    logger.info(`- Total TVL: $${totalTVL.toFixed(2)}`);
    
    return {
      tvl: totalTVL,
      pagePrice: calculatedPagePrice
    };
  } catch (error) {
    logger.error(`Failed to calculate TVL from LCD data`, error);
    throw new Error(`LCD TVL calculation failed: ${(error as Error).message}`);
  }
}

/**
 * Fetch OSMO price in USD
 * @returns The price of OSMO in USD
 */
export async function fetchOsmoPrice(): Promise<number> {
  try {
    logger.info('Fetching OSMO price...');
    
    // Get OSMO/USDC pool data from Imperator API
    const response = await axios.get(`https://api-osmosis.imperator.co/tokens/v2/price/OSMO`);
    
    if (!response.data || !response.data.price) {
      throw new Error('Invalid OSMO price data');
    }
    
    const osmoPrice = response.data.price;
    logger.info(`OSMO price: $${osmoPrice}`);
    
    return osmoPrice;
  } catch (error) {
    logger.error(`Failed to fetch OSMO price`, error);
    throw new Error(`OSMO price fetch failed: ${(error as Error).message}`);
  }
}

/**
 * Calculate PAGE price from Osmosis pool
 * @returns The price of PAGE in USD
 */
export async function calculatePagePriceFromOsmosis(): Promise<number> {
  try {
    logger.info('Calculating PAGE price from Osmosis pool...');
    
    // First get OSMO price in USD
    const osmoPrice = await fetchOsmoPrice();
    
    // Then get PAGE/OSMO pool data
    const poolData = await fetchOsmosisPoolFromLCD(PAGE_POOL_ID);
    
    // Calculate TVL and PAGE price
    const result = await calculateTVLFromLCDData(poolData, osmoPrice);
    
    return result.pagePrice;
  } catch (error) {
    logger.error(`Failed to calculate PAGE price from Osmosis`, error);
    throw new Error(`PAGE price calculation failed: ${(error as Error).message}`);
  }
}

/**
 * Comprehensive function to fetch all Osmosis data in one call
 * @returns Object with PAGE price, OSMO price, TVL, and pool data
 */
export async function fetchOsmosisData(): Promise<{
  pagePrice: number;
  osmoPrice: number;
  tvl: number;
  poolData: any;
}> {
  try {
    logger.info('Fetching comprehensive Osmosis data...');
    
    // Run requests in parallel
    const [osmoPrice, poolData] = await Promise.all([
      fetchOsmoPrice(),
      fetchOsmosisPoolFromLCD(PAGE_POOL_ID)
    ]);
    
    // Calculate TVL and PAGE price
    const { tvl, pagePrice } = await calculateTVLFromLCDData(poolData, osmoPrice);
    
    return {
      pagePrice,
      osmoPrice,
      tvl,
      poolData
    };
  } catch (error) {
    logger.error(`Failed to fetch comprehensive Osmosis data`, error);
    throw new Error(`Osmosis data fetch failed: ${(error as Error).message}`);
  }
}

export default {
  calculateOsmosisTVL,
  fetchOsmosisTVL,
  fetchOsmosisPoolFromLCD,
  calculateTVLFromLCDData,
  fetchOsmoPrice,
  calculatePagePriceFromOsmosis,
  fetchOsmosisData
};