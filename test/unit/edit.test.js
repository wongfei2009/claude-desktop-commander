/**
 * Unit tests for the edit tools
 */
import { parseEditBlock, performSearchReplace } from '../../dist/tools/edit.js';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';

// Test file path
const testFilePath = 'test/unit/test-file.txt';

describe('Edit Tools', () => {
  describe('parseEditBlock', () => {
    it('should correctly parse a valid edit block', async () => {
      const testBlock = `test.txt
<<<<<<< SEARCH
old content
=======
new content
>>>>>>> REPLACE`;

      const parsed = await parseEditBlock(testBlock);
      
      expect(parsed.filePath).toBe('test.txt');
      expect(parsed.searchReplace.search).toBe('old content');
      expect(parsed.searchReplace.replace).toBe('new content');
    });

    it('should handle multiline content', async () => {
      const testBlock = `test.txt
<<<<<<< SEARCH
line 1
line 2
line 3
=======
new line 1
new line 2
>>>>>>> REPLACE`;

      const parsed = await parseEditBlock(testBlock);
      
      expect(parsed.filePath).toBe('test.txt');
      expect(parsed.searchReplace.search).toBe('line 1\nline 2\nline 3');
      expect(parsed.searchReplace.replace).toBe('new line 1\nnew line 2');
    });

    it('should throw an error for invalid block format', async () => {
      const invalidBlock = `test.txt
<<< SEARCH
content
=======
new
>>>>>>> REPLACE`;

      await expect(parseEditBlock(invalidBlock)).rejects.toThrow('Invalid edit block format');
    });
  });

  describe('performSearchReplace', () => {
    // Setup and cleanup using Vitest hooks
    beforeEach(async () => {
      // Create a test file before each test
      await fs.writeFile(testFilePath, 'This is old content to replace\nAnd another line');
    });

    afterEach(async () => {
      // Cleanup after each test
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // File might not exist, which is fine
      }
    });

    it('should replace content in a file', async () => {
      await performSearchReplace(testFilePath, {
        search: 'old content',
        replace: 'new content'
      });

      const result = await fs.readFile(testFilePath, 'utf8');
      expect(result).toContain('new content');
      expect(result).not.toContain('old content');
    });

    it('should handle multiple occurrences', async () => {
      await fs.writeFile(testFilePath, 'Replace this. Replace this again.');
      
      await performSearchReplace(testFilePath, {
        search: 'Replace this',
        replace: 'Changed'
      });

      const result = await fs.readFile(testFilePath, 'utf8');
      // The function only replaces the first occurrence
      expect(result).toBe('Changed. Replace this again.');
    });

    // This test needs to be updated since our new implementation returns an object with success: false
    // rather than throwing an exception
    it('should indicate failure when the search text is not found', async () => {
      const result = await performSearchReplace(testFilePath, {
        search: 'non-existent content',
        replace: 'new content'
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    // Tests for the enhanced version of performSearchReplace that returns a result object
    it('should return success status and match count', async () => {
      // This test is for the enhanced version that returns a result object
      const result = await performSearchReplace(testFilePath, {
        search: 'old content',
        replace: 'new content'
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully applied edit');
      expect(result.matchCount).toBeDefined();
      expect(result.matchCount).toBeGreaterThanOrEqual(1);

      // Verify the file was actually modified
      const fileContent = await fs.readFile(testFilePath, 'utf8');
      expect(fileContent).toContain('new content');
    });

    it('should return failure status when search text is not found', async () => {
      // This test is for the enhanced version that returns a result object
      const result = await performSearchReplace(testFilePath, {
        search: 'non-existent content',
        replace: 'new content'
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle and report errors during file operations', async () => {
      // Test with a non-existent file
      const result = await performSearchReplace('non-existent-file.txt', {
        search: 'some content',
        replace: 'new content'
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Error');
    });
  });
});