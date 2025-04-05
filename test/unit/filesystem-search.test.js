import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import os from 'os';

// Import the functions to test
import { 
  searchFiles, 
  createDirectory, 
  writeFile, 
  setupTestTempDirectories,
  addTestDirectory
} from '../../dist/tools/filesystem.js';

// Set NODE_ENV to test to enable test mode
process.env.NODE_ENV = 'test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a unique test directory
const testDir = path.join(os.tmpdir(), `claude-desktop-commander-test-search-${Date.now()}`);

describe('Filesystem Search Tests', () => {
  // Setup before tests
  beforeAll(async () => {
    // Make sure test mode is enabled
    setupTestTempDirectories();
    
    try {
      // Create test directory
      await fs.mkdir(testDir, { recursive: true });
      
      // Add test directory and ALL parent directories to allowed list
      let currentDir = testDir;
      while (currentDir !== '/') {
        addTestDirectory(currentDir);
        currentDir = path.dirname(currentDir);
      }
      
      // Create test files with different casing
      await fs.writeFile(path.join(testDir, 'test_file.txt'), 'This is a test file');
      await fs.writeFile(path.join(testDir, 'TEST_FILE_UPPER.txt'), 'This is a test file with uppercase name');
      await fs.writeFile(path.join(testDir, 'test_file_mixed.TXT'), 'This is a test file with mixed case extension');
      
      // Create a subdirectory with more test files
      const subDir = path.join(testDir, 'subdir');
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(subDir, 'test_subfile.txt'), 'This is a test file in a subdirectory');
      await fs.writeFile(path.join(subDir, 'TEST_SUBFILE_UPPER.txt'), 'This is a test file with uppercase name in subdirectory');
      
      // Add subdir to allowed directories
      addTestDirectory(subDir);
    } catch (error) {
      console.error('Error setting up test environment:', error);
      throw error;
    }
  });
  
  // Cleanup after tests
  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Warning: Could not clean up test directory: ${error.message}`);
    }
  });
  
  // Test case-insensitive search (default behavior)
  it('should find files case-insensitively by default', async () => {
    const results = await searchFiles(testDir, 'test');
    
    // The searchFiles function returns paths, not just filenames
    expect(results.length).toBeGreaterThan(0);
    
    // Extract just the filenames from the full paths
    const fileNames = results.map(filePath => path.basename(filePath));
    
    // Verify we have the expected files
    expect(fileNames).toContain('test_file.txt');
    expect(fileNames).toContain('TEST_FILE_UPPER.txt');
  });
  
  // Note: caseSensitive option has been removed from searchFiles
  it('should always perform case-insensitive searches (case-sensitive option removed)', async () => {
    const resultsLowercase = await searchFiles(testDir, 'test');
    const resultsUppercase = await searchFiles(testDir, 'TEST');
    
    // Both searches should return the same results since case-insensitive
    expect(resultsLowercase.length).toBeGreaterThan(0);
    expect(resultsUppercase.length).toBeGreaterThan(0);
    
    // Extract filenames from paths
    const fileNamesLowercase = resultsLowercase.map(filePath => path.basename(filePath));
    const fileNamesUppercase = resultsUppercase.map(filePath => path.basename(filePath));
    
    // Both should contain both lower and uppercase filenames
    expect(fileNamesLowercase).toContain('test_file.txt');
    expect(fileNamesLowercase).toContain('TEST_FILE_UPPER.txt');
    
    expect(fileNamesUppercase).toContain('test_file.txt');
    expect(fileNamesUppercase).toContain('TEST_FILE_UPPER.txt');
  });
  
  // Test recursive search
  it('should search recursively through subdirectories', async () => {
    const results = await searchFiles(testDir, 'subfile');
    
    // We should find the files in the subdirectory
    expect(results.length).toBeGreaterThan(0);
    
    // All results should contain 'subdir' in their path
    for (const result of results) {
      expect(result).toContain('subdir');
    }
  });
  
  // Test searching for file extension
  it('should find files by extension', async () => {
    const results = await searchFiles(testDir, '.txt');
    
    // We should find multiple files with .txt extension
    expect(results.length).toBeGreaterThan(0);
  });
});