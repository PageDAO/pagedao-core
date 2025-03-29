// test-zora-nft-ts.js
const { spawnSync } = require('child_process');

console.log('Running Zora NFT adapter test...');
const result = spawnSync('npx', [
  'ts-node',
  '--project', 'tsconfig-commonjs.json',
  'src/tests/zoraNftAdapter.test.ts'
], { 
  stdio: 'inherit'
});

if (result.error) {
  console.error('Failed to run tests:', result.error);
  process.exit(1);
}

process.exit(result.status);