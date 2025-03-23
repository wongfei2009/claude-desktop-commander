/**
 * Main test runner for Claude Desktop Commander
 * 
 * This file orchestrates running all tests in the appropriate order.
 */

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test categories and their paths
const TEST_CATEGORIES = [
  { name: 'Unit Tests', path: join(__dirname, 'unit') },
  { name: 'Integration Tests', path: join(__dirname, 'integration') }
];

/**
 * Run all tests in a directory
 * @param {string} directory - Directory containing test files
 */
async function runTestsInDirectory(directory) {
  try {
    // List all test files
    const files = await fs.readdir(directory);
    const testFiles = files.filter(file => file.endsWith('.test.js'));
    
    if (testFiles.length === 0) {
      console.log(`No test files found in ${directory}`);
      return;
    }
    
    // Run each test file
    for (const file of testFiles) {
      const testPath = join(directory, file);
      console.log(`\nRunning tests in ${file}:`);
      
      try {
        // Import and run the test file
        const module = await import(testPath);
        if (typeof module.runTests === 'function') {
          await module.runTests();
        } else {
          console.warn(`Warning: ${file} doesn't export a runTests function`);
        }
      } catch (error) {
        console.error(`Error running tests in ${file}:`, error);
        throw error;  // Re-throw to fail the entire test run
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`Directory not found: ${directory}`);
    } else {
      throw error;
    }
  }
}

/**
 * Run a specific test file
 * @param {string} testFile - Path to test file
 */
async function runSpecificTest(testFile) {
  try {
    console.log(`\nRunning specific test: ${testFile}`);
    const module = await import(testFile);
    if (typeof module.runTests === 'function') {
      await module.runTests();
    } else {
      console.warn(`Warning: ${testFile} doesn't export a runTests function`);
    }
  } catch (error) {
    console.error(`Error running test ${testFile}:`, error);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('Starting Claude Desktop Commander Tests');
  
  try {
    // Check if a specific test was requested
    const args = process.argv.slice(2);
    if (args.length > 0) {
      const testFile = args[0];
      await runSpecificTest(join(process.cwd(), testFile));
    } else {
      // Run all tests by category
      for (const category of TEST_CATEGORIES) {
        console.log(`\n=== ${category.name} ===`);
        await runTestsInDirectory(category.path);
      }
    }
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Tests failed');
    process.exit(1);
  }
}

// Run the tests
runTests();
