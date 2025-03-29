// test-readme-books-ts.js
const { spawnSync } = require('child_process');

console.log('Running Readme Books adapter test...');
const result = spawnSync('npx', [
  'ts-node',
  '--project', 'tsconfig-commonjs.json',
  'src/tests/readmeBooksAdapter.test.ts'
], { 
  stdio: 'inherit'
});

if (result.error) {
  console.error('Failed to run tests:', result.error);
  process.exit(1);
}

process.exit(result.status);