/**
 * Integration tests for filesystem operations
 */
import { strict as assert } from 'assert';
import { readFile, writeFile, createDirectory, listDirectory, moveFile, searchFiles, getFileInfo } from '../../dist/tools/filesystem.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up test directory path
const TEST_DIR = join(__dirname, 'test-fs');

// Test runner array
const suites = [];

// Test runner simulation functions
function describe(name, fn) {
  const suite = { name, tests: [] };
  suites.push(suite);
  fn();
}

function it(name, fn) {
  if (suites.length > 0) {
    const currentSuite = suites[suites.length - 1];
    currentSuite.tests.push({ name, fn });
  }
}

// Define tests
describe('Filesystem Integration Tests', () => {
  // Setup and cleanup functions
  async function setupTestDirectory() {
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

      assert.equal(result, testContent);
      
      await cleanupTestDirectory();
    });

    it('should handle non-existent files', async () => {
      await setupTestDirectory();
      
      const nonExistentFile = join(TEST_DIR, 'nonexistent.txt');

      try {
        await readFile(nonExistentFile);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error.message.includes('ENOENT') || 
                 error.message.includes('no such file'));
      }
      
      await cleanupTestDirectory();
    });

    it('should get file info', async () => {
      await setupTestDirectory();
      
      const testFile = join(TEST_DIR, 'info-test.txt');
      await writeFile(testFile, 'File info test');

      const info = await getFileInfo(testFile);

      assert.ok(info);
      assert.equal(info.isFile, true);
      assert.equal(info.isDirectory, false);
      assert.ok(info.size > 0);
      assert.ok(info.created);
      assert.ok(info.modified);
      
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
      
      assert.ok(Array.isArray(listing));
      
      // Verify our subdirectory and file are listed
      const dirEntry = listing.find(item => item.includes('subdir'));
      const fileEntry = listing.find(item => item.includes('list-test.txt'));
      
      assert.ok(dirEntry);
      assert.ok(fileEntry);
      assert.ok(dirEntry.includes('[DIR]'));
      assert.ok(fileEntry.includes('[FILE]'));
      
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
      try {
        await fs.access(sourceFile);
        assert.fail('Source file should not exist after moving');
      } catch (error) {
        assert.equal(error.code, 'ENOENT');
      }
      
      // Verify destination file exists and has correct content
      const content = await readFile(destFile);
      assert.equal(content, 'This file will be moved');
      
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
      
      assert.ok(Array.isArray(textFiles));
      assert.equal(textFiles.length, 1);
      assert.ok(textFiles[0].includes('file1.txt'));
      
      // Search for all files - use an empty pattern to match everything
      const allFiles = await searchFiles(TEST_DIR, '');
      
      assert.equal(allFiles.length, 3);
      
      await cleanupTestDirectory();
    });
  });
});

// Run tests
async function runTests() {
  try {
    console.log('Running Filesystem Integration tests...');
    
    for (const suite of suites) {
      console.log(`\n${suite.name}`);
      for (const test of suite.tests) {
        try {
          await test.fn();
          console.log(`  ✓ ${test.name}`);
        } catch (error) {
          console.log(`  ✗ ${test.name}`);
          console.error(`    Error: ${error.message}`);
          throw error;
        }
      }
    }
    
    console.log('\nAll tests passed! 🎉');
  } catch (error) {
    console.error('Tests failed:', error);
    process.exit(1);
  }
}

// Run the tests when this module is executed directly
if (import.meta.url === process.argv[1]) {
  runTests();
}

export { runTests };
