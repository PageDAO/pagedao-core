// src/services/api.js
import axios from 'axios';

// API base URL - change this to your deployed API URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8888/.netlify/functions';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token prices API
export const fetchTokenPrices = async () => {
  try {
    const response = await api.get('/token-prices');
    return response.data;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    throw error;
  }
};

// Historical data API
export const fetchHistoricalData = async (chain = 'all', period = '24h') => {
  try {
    const response = await api.get('/historical-data', {
      params: { chain, period }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    throw error;
  }
};

// Network comparison API
export const fetchNetworkComparison = async () => {
  try {
    const response = await api.get('/network-comparison');
    return response.data;
  } catch (error) {
    console.error('Error fetching network comparison:', error);
    throw error;
  }
};
