// Fix for the file src/tests/contentAdapters.test.ts

import { ContentTrackerFactory } from '../factory/contentTrackerFactory';
import { 
  ContentMetadata, 
  Ownership, 
  ContentRights,
  CollectionInfo
} from '../interfaces/content';

// Initialize content adapters
// Initialize content adapters
import '../services/index';

// Test constants
const TEST_ADDRESSES = {
  // These should be replaced with actual contract addresses for testing
  ALEXANDRIA_BOOK: '0x3d7e7b0bD812C9BD119830F91d1fc6E1943A3fF2',
  MIRROR_PUBLICATION: '0x4b5922ABf25858d012d12bb1184e5d3d0B6D6BE4',
  ZORA_NFT: '0x7d256d82b32D8003d1ca6dA3Bf67B65A8004E896',
};

const TEST_TOKEN_ID = '1'; // Use a token ID that exists on all test contracts
const TEST_WALLET = '0x1234567890123456789012345678901234567890'; // Replace with a test wallet

/**
 * Test a specific adapter by content type
 */
async function testAdapter(
  name: string,
  address: string,
  contentType: string,
  chain: string
): Promise<void> {
  console.log(`\n===== Testing ${name} Adapter =====`);
  
  try {
    // Create tracker via factory
    const tracker = ContentTrackerFactory.getTracker(address, contentType, chain);
    
    // Test getters
    console.log(`Contract Address: ${tracker.getContractAddress()}`);
    console.log(`Chain: ${tracker.getChain()}`);
    console.log(`Content Type: ${tracker.getContentType()}`);
    
    // Test metadata fetching
    try {
      console.log(`\nFetching metadata for token ${TEST_TOKEN_ID}...`);
      const metadata = await tracker.fetchMetadata(TEST_TOKEN_ID);
      console.log('Metadata:', JSON.stringify(metadata, null, 2));
      
      // Verify metadata structure
      verifyMetadataStructure(metadata);
    } catch (error) {
      // Fix: Add type assertion for error
      const err = error as Error;
      console.error(`Error fetching metadata: ${err.message}`);
    }
    
    // Test ownership fetching
    try {
      console.log(`\nFetching ownership for token ${TEST_TOKEN_ID}...`);
      const ownership = await tracker.fetchOwnership(TEST_TOKEN_ID);
      console.log('Ownership:', JSON.stringify(ownership, null, 2));
      
      // Verify ownership structure
      verifyOwnershipStructure(ownership);
    } catch (error) {
      // Fix: Add type assertion
      const err = error as Error;
      console.error(`Error fetching ownership: ${err.message}`);
    }
    
    // Test rights fetching
    try {
      console.log(`\nFetching rights for token ${TEST_TOKEN_ID}...`);
      const rights = await tracker.fetchRights(TEST_TOKEN_ID);
      console.log('Rights:', JSON.stringify(rights, null, 2));
      
      // Verify rights structure
      verifyRightsStructure(rights);
    } catch (error) {
      // Fix: Add type assertion
      const err = error as Error;
      console.error(`Error fetching rights: ${err.message}`);
    }
    
    // Test collection info fetching
    try {
      console.log(`\nFetching collection info...`);
      const collectionInfo = await tracker.getCollectionInfo();
      console.log('Collection Info:', JSON.stringify(collectionInfo, null, 2));
      
      // Verify collection info structure
      verifyCollectionInfoStructure(collectionInfo);
    } catch (error) {
      // Fix: Add type assertion
      const err = error as Error;
      console.error(`Error fetching collection info: ${err.message}`);
    }
    
    // Test ownership check
    try {
      console.log(`\nChecking if token ${TEST_TOKEN_ID} is owned by ${TEST_WALLET}...`);
      const isOwned = await tracker.isOwnedBy(TEST_TOKEN_ID, TEST_WALLET);
      console.log(`Owned by test wallet: ${isOwned}`);
    } catch (error) {
      // Fix: Add type assertion
      const err = error as Error;
      console.error(`Error checking ownership: ${err.message}`);
    }
    
    console.log(`\n✅ ${name} Adapter tests completed!`);
  } catch (error) {
    console.error(`❌ ${name} Adapter tests failed:`, error);
  }
}

// Verification helpers - fix dynamic property access
function verifyMetadataStructure(metadata: ContentMetadata): void {
  // Ensure required fields are present
  const requiredFields = ['id', 'chain', 'contractAddress'];
  for (const field of requiredFields) {
    // Fix: Type-safe property access
    if (!hasProperty(metadata, field)) {
      throw new Error(`Missing required field in metadata: ${field}`);
    }
  }
  console.log('✅ Metadata structure verified');
}

function verifyOwnershipStructure(ownership: Ownership): void {
  // Ensure required fields are present
  const requiredFields = ['owner', 'tokenId'];
  for (const field of requiredFields) {
    // Fix: Type-safe property access
    if (!hasProperty(ownership, field)) {
      throw new Error(`Missing required field in ownership: ${field}`);
    }
  }
  console.log('✅ Ownership structure verified');
}

function verifyRightsStructure(rights: ContentRights): void {
  // Ensure required fields are present
  const requiredFields = ['transferable', 'commercial'];
  for (const field of requiredFields) {
    // Fix: Type-safe property access
    if (!hasDefinedProperty(rights, field)) {
      throw new Error(`Missing required field in rights: ${field}`);
    }
  }
  console.log('✅ Rights structure verified');
}

function verifyCollectionInfoStructure(info: CollectionInfo): void {
  // Ensure required fields are present
  const requiredFields = ['name', 'contractAddress', 'chain'];
  for (const field of requiredFields) {
    // Fix: Type-safe property access
    if (!hasProperty(info, field)) {
      throw new Error(`Missing required field in collection info: ${field}`);
    }
  }
  console.log('✅ Collection info structure verified');
}

// Helper functions for type-safe property access
function hasProperty<T extends object>(obj: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key) && (obj as any)[key] !== null && (obj as any)[key] !== undefined;
}

function hasDefinedProperty<T extends object>(obj: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key) && (obj as any)[key] !== undefined;
}

/**
 * Run all adapter tests
 */
async function runAllTests(): Promise<void> {
  try {
    console.log('Starting content adapter tests...');
    
    // Test Alexandria Book adapter
    await testAdapter(
      'Alexandria Book',
      TEST_ADDRESSES.ALEXANDRIA_BOOK,
      'book',
      'base'
    );
    
    // Test Mirror Publication adapter
    await testAdapter(
      'Mirror Publication',
      TEST_ADDRESSES.MIRROR_PUBLICATION,
      'publication',
      'ethereum'
    );
    
    // Test Zora NFT adapter
    await testAdapter(
      'Zora NFT',
      TEST_ADDRESSES.ZORA_NFT,
      'nft',
      'zora'
    );
    
    console.log('\n🎉 All adapter tests completed!');
  } catch (error) {
    console.error('❌ Test runner error:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

// Export test functions for use in other test suites
export {
  testAdapter,
  runAllTests
};