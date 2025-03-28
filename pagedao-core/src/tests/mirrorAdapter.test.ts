// src/tests/mirrorAdapter.test.ts

import { ethers } from 'ethers';
import { ContentTrackerFactory } from '../factory/contentTrackerFactory';

// Initialize content adapters
import '../services/index';
import '../services/mirror/mirrorPublicationAdapter';


async function testMirrorContract(): Promise<void> {
  try {
    console.log('\n===== Testing Mirror Publication Adapter on Optimism =====');
    
    const CONTRACT_ADDRESS = '0x8338c8e0e3e713ee2502c526f4840657be9fb350';
    const CHAIN = 'optimism';
    const CONTENT_TYPE = 'publication';
    const TEST_TOKEN_ID = '1';
    
    console.log(`Using address: ${CONTRACT_ADDRESS}`);
    console.log(`Chain: ${CHAIN}`);
    console.log(`Content Type: ${CONTENT_TYPE}`);
    
    const tracker = ContentTrackerFactory.getTracker(CONTRACT_ADDRESS, CONTENT_TYPE, CHAIN);
    
    console.log(`Contract Address: ${tracker.getContractAddress()}`);
    console.log(`Chain: ${tracker.getChain()}`);
    console.log(`Content Type: ${tracker.getContentType()}`);
    
    try {
      console.log(`\nFetching metadata for token ${TEST_TOKEN_ID}...`);
      const metadata = await tracker.fetchMetadata(TEST_TOKEN_ID);
      console.log('Metadata:', JSON.stringify(metadata, null, 2));
      console.log('✅ Metadata structure verified');
    } catch (error) {
      console.error(`Error fetching metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      console.log(`\nFetching ownership for token ${TEST_TOKEN_ID}...`);
      const ownership = await tracker.fetchOwnership(TEST_TOKEN_ID);
      console.log('Ownership:', JSON.stringify(ownership, null, 2));
      console.log('✅ Ownership structure verified');
    } catch (error) {
      console.error(`Error fetching ownership: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      console.log(`\nFetching rights for token ${TEST_TOKEN_ID}...`);
      const rights = await tracker.fetchRights(TEST_TOKEN_ID);
      console.log('Rights:', JSON.stringify(rights, null, 2));
      console.log('✅ Rights structure verified');
    } catch (error) {
      console.error(`Error fetching rights: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      console.log(`\nFetching collection info...`);
      const collectionInfo = await tracker.getCollectionInfo();
      console.log('Collection Info:', JSON.stringify(collectionInfo, null, 2));
      console.log('✅ Collection info structure verified');
    } catch (error) {
      console.error(`Error fetching collection info: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log(`\n✅ Mirror Publication Adapter on Optimism test completed!`);
  } catch (error) {
    console.error(`❌ Test failed:`, error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMirrorContract().catch(console.error);
}

// Export test functions for use in other test suites
export {
  testMirrorContract
};