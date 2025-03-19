// pagedao-hub/packages/dashboard/src/state/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  ChainId, 
  TokenPrice, 
  PriceHistoryPoint, 
  PoolData, 
  TokenSupply 
} from '@pagedao/core';
import { 
  fetchTokenPrices, 
  fetchPriceHistory, 
  fetchTokenSupply, 
  fetchLiquidityData 
} from '../api';

// Define state interfaces
interface TokenState {
  prices: Record<ChainId, TokenPrice>;
  weightedPrice: number;
  weightedPriceChange24h: number;
  priceHistory: {
    timeframe: '24h' | '7d' | '30d' | '90d' | '1y';
    data: Record<ChainId, PriceHistoryPoint[]>;
    aggregated: PriceHistoryPoint[];
    lastUpdated: number;
  };
  supply: TokenSupply;
  loading: {
    prices: boolean;
    history: boolean;
    supply: boolean;
  };
  error: {
    prices: string | null;
    history: string | null;
    supply: string | null;
  };
}

interface LiquidityState {
  totalTvl: number;
  tvlByChain: Record<ChainId, number>;
  pools: Record<ChainId, PoolData[]>;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

interface UIState {
  theme: 'light' | 'dark';
  selectedTimeframe: '24h' | '7d' | '30d' | '90d' | '1y';
  selectedChains: ChainId[];
  dashboardView: 'overview' | 'prices' | 'liquidity' | 'governance';
}

interface AppState {
  token: TokenState;
  liquidity: LiquidityState;
  ui: UIState;
}

// Define action interfaces
interface TokenActions {
  fetchTokenPrices: () => Promise<void>;
  fetchPriceHistory: (timeframe?: '24h' | '7d' | '30d' | '90d' | '1y') => Promise<void>;
  fetchTokenSupply: () => Promise<void>;
}

interface LiquidityActions {
  fetchLiquidityData: () => Promise<void>;
}

interface UIActions {
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setSelectedTimeframe: (timeframe: '24h' | '7d' | '30d' | '90d' | '1y') => void;
  setSelectedChains: (chains: ChainId[]) => void;
  setDashboardView: (view: 'overview' | 'prices' | 'liquidity' | 'governance') => void;
}

interface AppActions {
  refreshAllData: () => Promise<void>;
}

// Initial state
const initialState: AppState = {
  token: {
    prices: {},
    weightedPrice: 0,
    weightedPriceChange24h: 0,
    priceHistory: {
      timeframe: '24h',
      data: {},
      aggregated: [],
      lastUpdated: 0
    },
    supply: {
      circulating: 0,
      total: 0,
      lastUpdated: 0
    },
    loading: {
      prices: false,
      history: false,
      supply: false
    },
    error: {
      prices: null,
      history: null,
      supply: null
    }
  },
  liquidity: {
    totalTvl: 0,
    tvlByChain: {},
    pools: {},
    loading: false,
    error: null,
    lastUpdated: 0
  },
  ui: {
    theme: 'dark',
    selectedTimeframe: '24h',
    selectedChains: ['ethereum', 'optimism', 'base', 'osmosis'],
    dashboardView: 'overview'
  }
};

// Create store with all state and actions
export const useStore = create<
  AppState & TokenActions & LiquidityActions & UIActions & AppActions
>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Token actions
      fetchTokenPrices: async () => {
        set(state => ({
          token: {
            ...state.token,
            loading: { ...state.token.loading, prices: true },
            error: { ...state.token.error, prices: null }
          }
        }));

        try {
          const data = await fetchTokenPrices();
          
          set(state => ({
            token: {
              ...state.token,
              prices: data.prices,
              weightedPrice: data.weightedPrice,
              weightedPriceChange24h: data.weightedPriceChange24h,
              loading: { ...state.token.loading, prices: false }
            }
          }));
        } catch (error) {
          set(state => ({
            token: {
              ...state.token,
              loading: { ...state.token.loading, prices: false },
              error: { ...state.token.error, prices: error.message }
            }
          }));
        }
      },

      fetchPriceHistory: async (timeframe = '24h') => {
        set(state => ({
          token: {
            ...state.token,
            loading: { ...state.token.loading, history: true },
            error: { ...state.token.error, history: null }
          }
        }));

        try {
          const data = await fetchPriceHistory(timeframe);
          
          set(state => ({
            token: {
              ...state.token,
              priceHistory: {
                timeframe,
                data: data.byChain,
                aggregated: data.aggregated,
                lastUpdated: Date.now()
              },
              loading: { ...state.token.loading, history: false }
            }
          }));
        } catch (error) {
          set(state => ({
            token: {
              ...state.token,
              loading: { ...state.token.loading, history: false },
              error: { ...state.token.error, history: error.message }
            }
          }));
        }
      },

      fetchTokenSupply: async () => {
        set(state => ({
          token: {
            ...state.token,
            loading: { ...state.token.loading, supply: true },
            error: { ...state.token.error, supply: null }
          }
        }));

        try {
          const data = await fetchTokenSupply();
          
          set(state => ({
            token: {
              ...state.token,
              supply: {
                ...data,
                lastUpdated: Date.now()
              },
              loading: { ...state.token.loading, supply: false }
            }
          }));
        } catch (error) {
          set(state => ({
            token: {
              ...state.token,
              loading: { ...state.token.loading, supply: false },
              error: { ...state.token.error, supply: error.message }
            }
          }));
        }
      },

      // Liquidity actions
      fetchLiquidityData: async () => {
        set(state => ({
          liquidity: {
            ...state.liquidity,
            loading: true,
            error: null
          }
        }));

        try {
          const data = await fetchLiquidityData();
          
          set(state => ({
            liquidity: {
              ...data,
              loading: false,
              error: null,
              lastUpdated: Date.now()
            }
          }));
        } catch (error) {
          set(state => ({
            liquidity: {
              ...state.liquidity,
              loading: false,
              error: error.message
            }
          }));
        }
      },

      // UI actions
      setTheme: (theme) => {
        set(state => ({
          ui: {
            ...state.ui,
            theme
          }
        }));
      },

      toggleTheme: () => {
        set(state => ({
          ui: {
            ...state.ui,
            theme: state.ui.theme === 'light' ? 'dark' : 'light'
          }
        }));
      },

      setSelectedTimeframe: (timeframe) => {
        set(state => ({
          ui: {
            ...state.ui,
            selectedTimeframe: timeframe
          }
        }));
        
        // Fetch new price history when timeframe changes
        get().fetchPriceHistory(timeframe);
      },

      setSelectedChains: (chains) => {
        set(state => ({
          ui: {
            ...state.ui,
            selectedChains: chains
          }
        }));
      },

      setDashboardView: (view) => {
        set(state => ({
          ui: {
            ...state.ui,
            dashboardView: view
          }
        }));
      },

      // App actions
      refreshAllData: async () => {
        // Fetch all data in parallel
        await Promise.all([
          get().fetchTokenPrices(),
          get().fetchPriceHistory(get().ui.selectedTimeframe),
          get().fetchTokenSupply(),
          get().fetchLiquidityData()
        ]);
      }
    }),
    {
      name: 'pagedao-hub-storage',
      partialize: (state) => ({
        // Only persist UI preferences
        ui: {
          theme: state.ui.theme,
          selectedTimeframe: state.ui.selectedTimeframe,
          selectedChains: state.ui.selectedChains,
          dashboardView: state.ui.dashboardView
        }
      })
    }
  )
);
