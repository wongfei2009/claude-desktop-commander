import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import os from 'os';

const require = createRequire(import.meta.url);
const assert = require('assert');

// Import the functions to test
import { 
  searchFiles, 
  createDirectory, 
  writeFile, 
  setupTestTempDirectories,
  addTestDirectory
} from '../../dist/tools/filesystem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a unique test directory
const testDir = path.join(os.tmpdir(), `claude-desktop-commander-test-search-${Date.now()}`);

describe('Filesystem Search Tests', function() {
  // Setup before tests
  before(async function() {
    // Make sure the test directory is registered as allowed
    setupTestTempDirectories();
    addTestDirectory(testDir);
    
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    
    // Create test files with different casing
    await fs.writeFile(path.join(testDir, 'test_file.txt'), 'This is a test file');
    await fs.writeFile(path.join(testDir, 'TEST_FILE_UPPER.txt'), 'This is a test file with uppercase name');
    await fs.writeFile(path.join(testDir, 'test_file_mixed.TXT'), 'This is a test file with mixed case extension');
    
    // Create a subdirectory with more test files
    const subDir = path.join(testDir, 'subdir');
    await fs.mkdir(subDir, { recursive: true });
    await fs.writeFile(path.join(subDir, 'test_subfile.txt'), 'This is a test file in a subdirectory');
    await fs.writeFile(path.join(subDir, 'TEST_SUBFILE_UPPER.txt'), 'This is a test file with uppercase name in subdirectory');
  });
  
  // Cleanup after tests
  after(async function() {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Warning: Could not clean up test directory: ${error.message}`);
    }
  });
  
  // Test case-insensitive search (default behavior)
  it('should find files case-insensitively by default', async function() {
    const results = await searchFiles(testDir, 'test');
    assert.strictEqual(results.length, 5, 'Should find all 5 test files');
    
    // Check that specific files are included
    const fileNames = results.map(path.basename);
    assert(fileNames.includes('test_file.txt'), 'Should find lowercase file');
    assert(fileNames.includes('TEST_FILE_UPPER.txt'), 'Should find uppercase file');
  });
  
  // Test case-sensitive search
  it('should respect case sensitivity when option is enabled', async function() {
    const results = await searchFiles(testDir, 'test', { caseSensitive: true });
    assert(results.length < 5, 'Should find fewer files when case-sensitive');
    
    // Check that only lowercase files are found
    const fileNames = results.map(path.basename);
    assert(fileNames.includes('test_file.txt'), 'Should find lowercase file');
    assert(!fileNames.includes('TEST_FILE_UPPER.txt'), 'Should not find uppercase file');
  });
  
  // Test search with uppercase pattern
  it('should find uppercase files when searching with uppercase pattern', async function() {
    const results = await searchFiles(testDir, 'TEST', { caseSensitive: true });
    assert(results.length > 0, 'Should find files with uppercase pattern');
    
    // Check that only uppercase files are found
    const fileNames = results.map(path.basename);
    assert(!fileNames.includes('test_file.txt'), 'Should not find lowercase file');
    assert(fileNames.includes('TEST_FILE_UPPER.txt'), 'Should find uppercase file');
  });
  
  // Test recursive search
  it('should search recursively through subdirectories', async function() {
    const results = await searchFiles(testDir, 'subfile');
    assert.strictEqual(results.length, 2, 'Should find both files in subdirectory');
    
    // All results should be from the subdirectory
    results.forEach(result => {
      assert(result.includes('subdir'), 'Results should include path to subdirectory');
    });
  });
  
  // Test searching for file extension
  it('should find files by extension', async function() {
    const results = await searchFiles(testDir, '.txt');
    assert.strictEqual(results.length, 5, 'Should find all files with .txt extension');
  });
});