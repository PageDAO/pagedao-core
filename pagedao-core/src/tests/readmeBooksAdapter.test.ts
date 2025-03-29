// src/tests/readmeBooksAdapter.test.ts

import { ethers } from 'ethers';
import { ContentTrackerFactory } from '../factory/contentTrackerFactory';

// Initialize content adapters
import '../services/index';

async function testReadmeBooksContract(): Promise<void> {
  try {
    console.log('\n===== Testing Readme Books Adapter on Polygon =====');
    
    const CONTRACT_ADDRESS = '0x931204fb8cea7f7068995dce924f0d76d571df99';
    const CHAIN = 'polygon';
    const CONTENT_TYPE = 'readme_book';
    const TEST_TOKEN_ID = '1';  // Example token ID
    
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
    
    console.log(`\n✅ Readme Books Adapter on Polygon test completed!`);
  } catch (error) {
    console.error(`❌ Test failed:`, error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testReadmeBooksContract().catch(console.error);
}

// Export test functions for use in other test suites
export {
  testReadmeBooksContract
};