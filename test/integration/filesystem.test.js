/**
 * Integration tests for filesystem operations
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, writeFile, createDirectory, listDirectory, moveFile, searchFiles, getFileInfo, addTestDirectory, setupTestTempDirectories } from '../../dist/tools/filesystem.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up test directory path
const TEST_DIR = join(__dirname, 'test-fs');

describe('Filesystem Integration Tests', () => {
  // Setup and cleanup functions
  async function setupTestDirectory() {
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
  }

  async function cleanupTestDirectory() {
    // Clean up test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      console.warn('Could not clean up test directory:', error);
    }
  }

  describe('File Operations', () => {
    it('should write and read a file', async () => {
      await setupTestDirectory();
      
      const testFile = join(TEST_DIR, 'test.txt');
      const testContent = 'Hello, world!';

      // Write file
      await writeFile(testFile, testContent);

      // Read file
      const result = await readFile(testFile);

      expect(result).toBe(testContent);
      
      await cleanupTestDirectory();
    });

    it('should handle non-existent files', async () => {
      await setupTestDirectory();
      
      const nonExistentFile = join(TEST_DIR, 'nonexistent.txt');

      await expect(readFile(nonExistentFile)).rejects.toThrow();
      
      await cleanupTestDirectory();
    });

    it('should get file info', async () => {
      await setupTestDirectory();
      
      const testFile = join(TEST_DIR, 'info-test.txt');
      await writeFile(testFile, 'File info test');

      const info = await getFileInfo(testFile);

      expect(info).toBeDefined();
      expect(info.isFile).toBe(true);
      expect(info.isDirectory).toBe(false);
      expect(info.size).toBeGreaterThan(0);
      expect(info.created).toBeDefined();
      expect(info.modified).toBeDefined();
      
      await cleanupTestDirectory();
    });
  });

  describe('Directory Operations', () => {
    it('should create and list directories', async () => {
      await setupTestDirectory();
      
      const subDir = join(TEST_DIR, 'subdir');
      
      // Create subdirectory
      await createDirectory(subDir);
      
      // Create a file in the test directory
      const testFile = join(TEST_DIR, 'list-test.txt');
      await writeFile(testFile, 'Directory listing test');
      
      // List the directory
      const listing = await listDirectory(TEST_DIR);
      
      expect(Array.isArray(listing)).toBe(true);
      
      // Verify our subdirectory and file are listed
      const dirEntry = listing.find(item => item.includes('subdir'));
      const fileEntry = listing.find(item => item.includes('list-test.txt'));
      
      expect(dirEntry).toBeDefined();
      expect(fileEntry).toBeDefined();
      expect(dirEntry).toContain('[DIR]');
      expect(fileEntry).toContain('[FILE]');
      
      await cleanupTestDirectory();
    });
    
    it('should move files', async () => {
      await setupTestDirectory();
      
      // Create a file to move
      const sourceFile = join(TEST_DIR, 'source.txt');
      await writeFile(sourceFile, 'This file will be moved');
      
      // Create destination directory
      const destDir = join(TEST_DIR, 'dest');
      await createDirectory(destDir);
      
      // Move the file
      const destFile = join(destDir, 'moved.txt');
      await moveFile(sourceFile, destFile);
      
      // Verify source file doesn't exist
      const sourceExists = async () => {
        try {
          await fs.access(sourceFile);
          return true;
        } catch {
          return false;
        }
      };
      
      expect(await sourceExists()).toBe(false);
      
      // Verify destination file exists and has correct content
      const content = await readFile(destFile);
      expect(content).toBe('This file will be moved');
      
      await cleanupTestDirectory();
    });
    
    it('should search for files', async () => {
      await setupTestDirectory();
      
      // Create multiple files with different extensions
      await writeFile(join(TEST_DIR, 'file1.txt'), 'Text file');
      await writeFile(join(TEST_DIR, 'file2.md'), 'Markdown file');
      await writeFile(join(TEST_DIR, 'script.js'), 'console.log("JavaScript file");');
      
      // Search for text files
      const textFiles = await searchFiles(TEST_DIR, 'txt');
      
      expect(Array.isArray(textFiles)).toBe(true);
      expect(textFiles.length).toBeGreaterThan(0);
      expect(textFiles[0]).toContain('file1.txt');
      
      // Search for all files
      const allFiles = await searchFiles(TEST_DIR, '');
      
      expect(allFiles.length).toBeGreaterThanOrEqual(3);
      
      await cleanupTestDirectory();
    });
  });
});