/**
 * Integration tests for the edit tools
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { addTestDirectory, setupTestTempDirectories, writeFile, readFile } from '../../dist/tools/filesystem.js';
import { parseEditBlock, performSearchReplace } from '../../dist/tools/edit.js';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up test directory and file paths
const TEST_DIR = path.join(__dirname, 'edit-test-dir');
const TEST_FILE = path.join(TEST_DIR, 'edit-test-file.txt');

describe('Edit Tools Integration Tests', () => {
  // Setup before tests
  beforeEach(async () => {
    // Add test directory to allowed directories list
    addTestDirectory(TEST_DIR);
    
    // Setup temp directories used in testing
    setupTestTempDirectories();
    
    // Create test directory
    try {
      await fs.mkdir(TEST_DIR, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
    
    // Create a test file with known content
    await writeFile(TEST_FILE, 
      'Line 1: This is a test file for edit operations.\n' +
      'Line 2: It contains multiple lines of text.\n' +
      'Line 3: This line will be modified by the tests.\n' +
      'Line 4: This line will remain unchanged.'
    );
  });
  
  // Cleanup after tests
  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      console.warn('Could not clean up test directory:', error);
    }
  });
  
  describe('edit tools functionality', () => {
    it('should successfully edit file content', async () => {
      // Create block content
      const blockContent = `${TEST_FILE}
<<<<<<< SEARCH
Line 3: This line will be modified by the tests.
=======
Line 3: This line has been successfully modified.
>>>>>>> REPLACE`;
      
      // Parse the block
      const { filePath, searchReplace } = await parseEditBlock(blockContent);
      
      // Perform the search and replace
      const result = await performSearchReplace(filePath, searchReplace);
      
      // Verify the result
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully applied edit');
      
      // Verify the file was actually modified
      const fileContent = await readFile(TEST_FILE);
      expect(fileContent).toContain('Line 3: This line has been successfully modified.');
      expect(fileContent).not.toContain('Line 3: This line will be modified by the tests.');
    });
    
    it('should handle non-existent search text', async () => {
      // Create block content with text that doesn't exist
      const blockContent = `${TEST_FILE}
<<<<<<< SEARCH
This text does not exist in the file
=======
Replacement text
>>>>>>> REPLACE`;
      
      // Parse the block
      const { filePath, searchReplace } = await parseEditBlock(blockContent);
      
      // Perform the search and replace
      const result = await performSearchReplace(filePath, searchReplace);
      
      // Verify the result
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
      
      // Verify the file was not modified
      const originalContent = 
        'Line 1: This is a test file for edit operations.\n' +
        'Line 2: It contains multiple lines of text.\n' +
        'Line 3: This line will be modified by the tests.\n' +
        'Line 4: This line will remain unchanged.';
      
      const fileContent = await readFile(TEST_FILE);
      expect(fileContent).toBe(originalContent);
    });
    
    it('should handle invalid block format', async () => {
      // Create an invalid block format
      const invalidBlock = `${TEST_FILE}
<<< INVALID MARKER
Some content
=======
New content
>>>>>>> REPLACE`;
      
      // Verify that parseEditBlock throws an error
      await expect(parseEditBlock(invalidBlock)).rejects.toThrow('Invalid edit block format');
    });
    
    it('should report correct match count in successful response', async () => {
      // Add duplicate lines to test file
      await writeFile(TEST_FILE, 
        'Duplicate line: test\n' +
        'Duplicate line: test\n' +
        'Duplicate line: test\n' +
        'Unique line: keep me'
      );
      
      // Create block content
      const blockContent = `${TEST_FILE}
<<<<<<< SEARCH
Duplicate line: test
=======
Changed line
>>>>>>> REPLACE`;
      
      // Parse the block
      const { filePath, searchReplace } = await parseEditBlock(blockContent);
      
      // Perform the search and replace
      const result = await performSearchReplace(filePath, searchReplace);
      
      // Verify the result
      expect(result.success).toBe(true);
      expect(result.matchCount).toBe(3); // Should find 3 occurrences total
      
      // Verify only the first occurrence was replaced
      const fileContent = await readFile(TEST_FILE);
      expect(fileContent).toContain('Changed line');
      expect(fileContent).toContain('Duplicate line: test');
      
      // Count the remaining occurrences (should be 2)
      const matches = fileContent.match(/Duplicate line: test/g);
      expect(matches).toHaveLength(2);
    });
  });
});