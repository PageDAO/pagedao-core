import axios from 'axios';

// Use the API base URL from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10);
const API_RETRY_COUNT = parseInt(process.env.REACT_APP_API_RETRY_COUNT || '2', 10);
const API_RETRY_DELAY = parseInt(process.env.REACT_APP_API_RETRY_DELAY || '1000', 10);
/**
 * Fetch current PAGE token prices across all networks
 * @returns {Promise<Object>} Price and TVL data
 */
export async function fetchPagePrices() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/token-prices`);
    return response.data;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    throw error;
  }
}

/**
 * Fetch historical price data for specified chain and period
 * @param {string} chain - Chain name or 'all' for all chains
 * @param {string} period - Time period ('24h', '7d', '30d')
 * @returns {Promise<Object>} Historical price data
 */
export async function fetchHistoricalData(chain = 'all', period = '24h') {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/historical-data`, {
      params: { chain, period }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    throw error;
  }
}
