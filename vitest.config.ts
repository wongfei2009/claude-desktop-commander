import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Enable global test APIs like describe, it, etc.
    globals: true,
    
    // Environment to run the tests in
    environment: 'node',
    
    // Include files with these extensions
    include: ['test/**/*.test.js', 'test/**/*.test.ts'],
    
    // Exclude files
    exclude: ['node_modules', '.git', 'dist'],
    
    // Configure coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/']
    },
    
    // Setup timeouts
    testTimeout: 10000,
    
    // Allow tests to access the node.js APIs
    deps: {
      interopDefault: true
    }
  },
});