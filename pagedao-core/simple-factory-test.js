// simple-factory-test.js

// First, let's examine what's actually in the dist folder
const fs = require('fs');
console.log('Checking dist directory contents:');
try {
  const files = fs.readdirSync('./dist');
  console.log('Files in dist:', files);
  
  // If there are subdirectories, check services
  if (fs.existsSync('./dist/services')) {
    const serviceFiles = fs.readdirSync('./dist/services');
    console.log('Files in dist/services:', serviceFiles);
    
    // Check content directory if it exists
    if (fs.existsSync('./dist/services/content')) {
      const contentFiles = fs.readdirSync('./dist/services/content');
      console.log('Files in dist/services/content:', contentFiles);
    }
  }
} catch (error) {
  console.error('Error checking directories:', error.message);
}

// Now try to load the factory module
console.log('\nAttempting to load factory module:');
try {
  // First try the index
  const indexModule = require('./dist/index');
  console.log('Index module loaded successfully');
  console.log('Index exports:', Object.keys(indexModule));
  
  // Check if factory exists in the exports
  if (indexModule.ContentTrackerFactory) {
    console.log('ContentTrackerFactory found in exports!');
    
    // Run a simple test
    const factory = indexModule.ContentTrackerFactory.getInstance();
    console.log('Factory instance created successfully');
    console.log('Registered types:', factory.getRegisteredTypes());
  }
} catch (error) {
  console.error('Error loading module:', error.message);
}