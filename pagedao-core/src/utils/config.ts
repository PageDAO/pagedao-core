// Token configuration types
export interface TokenConfig {
    chainId: number;
    address: string;
    decimals: number;
    symbol: string;
    name: string;
    logoURI: string;
    lpAddress: string;
    dexUrl: string;
    tokenIsToken0: boolean;
    poolType: 'v2' | 'v3';
    poolId?: number;
    feeTier?: number;
  }
  
  export interface CosmosTokenConfig {
    chainId: string;
    denom: string;
    decimals: number;
    symbol: string;
    name: string;
    logoURI: string;
    osmosisPoolId: string;
    dexUrl: string;
  }
  
  export interface EthUsdcPairConfig {
    address: string;
    token0IsETH: boolean;
    poolType: 'v2' | 'v3';
    decimals: {
      ETH: number;
      USDC: number;
    };
  }
  
  // Configuration for the PAGE token across different chains
  export const PAGE_TOKEN_CONFIG: TokenConfig[] = [
    {
      chainId: 1, // mainnet
      address: '0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e',
      decimals: 8,
      symbol: 'PAGE',
      name: 'Page',
      logoURI: '/images/page-token-logo.png',
      lpAddress: '0x9a25d21e204f10177738edb0c3345bd88478aaa2',
      dexUrl: 'https://app.uniswap.org/#/swap?outputCurrency=0x60e683C6514Edd5F758A55b6f393BeBBAfaA8d5e',
      tokenIsToken0: true,
      poolType: 'v2'
    },
    {
      chainId: 10, // optimism
      address: '0xe67E77c47a37795c0ea40A038F7ab3d76492e803',
      decimals: 8,
      symbol: 'PAGE',
      name: 'Page',
      logoURI: '/images/page-token-logo.png',
      lpAddress: '0x5421DA31D54640b58355d8D16D78af84D34D2405',
      dexUrl: 'https://app.uniswap.org/#/swap?outputCurrency=0xe67E77c47a37795c0ea40A038F7ab3d76492e803&chain=optimism',
      tokenIsToken0: false,
      poolType: 'v2'
    },
    {
      chainId: 8453, // base
      address: '0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE',
      decimals: 8,
      symbol: 'PAGE',
      name: 'Page',
      logoURI: '/images/page-token-logo.png',
      lpAddress: '0xb05113fbB5f2551Dc6f10EF3C4EfFB9C03C0E3E9',
      dexUrl: 'https://app.uniswap.org/positions/v3/base/2376403',
      tokenIsToken0: false,
      poolType: 'v3',
      poolId: 2376403,
      feeTier: 10000 // 1% fee tier
    }
  ];
  
  // Cosmos PAGE token configuration
  export const COSMOS_PAGE_TOKEN: CosmosTokenConfig = {
    chainId: 'osmosis-1',
    denom: 'ibc/23A62409E4AD8133116C249B1FA38EED30E500A115D7B153109462CD82C1CD99',
    decimals: 8,
    symbol: 'PAGE',
    name: 'Page',
    logoURI: '/images/page-token-logo.png',
    osmosisPoolId: '1344',
    dexUrl: 'https://app.osmosis.zone/pools/1344',
  };
  
  // RPC URLs
export const RPC_URLS: { [key: string]: string } = {
  ethereum: process.env.ETH_RPC_URL || 'https://eth.drpc.org',
  optimism: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
  base: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  zora: process.env.ZORA_RPC_URL || 'https://rpc.zora.energy',
  polygon: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  osmosis: process.env.OSMOSIS_PRIMARY_RPC || 'https://api.kyve.network/osmosis'
};

  // Backup RPC URLs
export const BACKUP_RPC_URLS: { [key: string]: string } = {
  ethereum: process.env.ETH_BACKUP_RPC_URL || 'https://eth.llamarpc.com',
  optimism: process.env.OPTIMISM_BACKUP_RPC_URL || 'https://optimism.llamarpc.com',
  base: process.env.BASE_BACKUP_RPC_URL || 'https://base.publicnode.com',
  zora: process.env.ZORA_BACKUP_RPC_URL || 'https://rpc.ankr.com/zora',
  polygon: process.env.POLYGON_BACKUP_RPC_URL || 'https://polygon.llamarpc.com',
  osmosis: process.env.OSMOSIS_BACKUP_RPC || 'https://lcd.osmosis.zone'
};
  
  // Osmosis constants
  export const OSMOSIS = {
    LCD: "https://lcd.osmosis.zone",
    CHAIN_ID: 'osmosis-1',
    PAGE_DENOM: "ibc/23A62409E4AD8133116C249B1FA38EED30E500A115D7B153109462CD82C1CD99",
    USDC_DENOM: "ibc/D189335C6E4A68B513C10AB227BF1C1D38C746766278BA3EEB4FB14124F1D858",
    POOL_ID: "1344",
    OSMO_USDC_POOL_ID: "678",
    TOKEN_DECIMALS: {
      PAGE: 8,
      OSMO: 6,
      USDC: 6
    }
  };
  
  // Cache duration in milliseconds (5 minutes)
  export const CACHE_DURATION = parseInt(process.env.CACHE_DURATION || '300000', 10);
  
  // ETH/USDC Uniswap pair on Base for ETH price oracle
  export const ETH_USDC_PAIR: EthUsdcPairConfig = {
    address: '0xd0b53D9277642d899DF5C87A3966A349A798F224', // ETH/USDC pair on Base
    token0IsETH: false, // USDC is token0, ETH is token1
    poolType: 'v3',
    decimals: {
      ETH: 18,
      USDC: 6
    }
  };
  