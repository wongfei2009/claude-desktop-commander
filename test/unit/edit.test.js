/**
 * Unit tests for the edit tools
 */
import { parseEditBlock, performSearchReplace } from '../../dist/tools/edit.js';
import { strict as assert } from 'assert';
import { promises as fs } from 'fs';

// Test file path
const testFilePath = 'test/unit/test-file.txt';

// Test runner array to collect test cases
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
      
      assert.equal(parsed.filePath, 'test.txt');
      assert.equal(parsed.searchReplace.search, 'old content');
      assert.equal(parsed.searchReplace.replace, 'new content');
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
      
      assert.equal(parsed.filePath, 'test.txt');
      assert.equal(parsed.searchReplace.search, 'line 1\nline 2\nline 3');
      assert.equal(parsed.searchReplace.replace, 'new line 1\nnew line 2');
    });

    it('should throw an error for invalid block format', async () => {
      const invalidBlock = `test.txt
<<< SEARCH
content
=======
new
>>>>>>> REPLACE`;

      try {
        await parseEditBlock(invalidBlock);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error.message.includes('Invalid edit block format'));
      }
    });
  });

  describe('performSearchReplace', () => {
    // Setup and cleanup functions as proper functions
    async function setupTestFile() {
      // Create a test file before each test
      await fs.writeFile(testFilePath, 'This is old content to replace\nAnd another line');
    }

    async function cleanupTestFile() {
      // Cleanup after each test
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // File might not exist, which is fine
      }
    }

    it('should replace content in a file', async () => {
      await setupTestFile();
      
      await performSearchReplace(testFilePath, {
        search: 'old content',
        replace: 'new content'
      });

      const result = await fs.readFile(testFilePath, 'utf8');
      assert.ok(result.includes('new content'));
      assert.ok(!result.includes('old content'));
      
      await cleanupTestFile();
    });

    it('should handle multiple occurrences', async () => {
      await fs.writeFile(testFilePath, 'Replace this. Replace this again.');
      
      await performSearchReplace(testFilePath, {
        search: 'Replace this',
        replace: 'Changed'
      });

      const result = await fs.readFile(testFilePath, 'utf8');
      // The function only replaces the first occurrence
      assert.equal(result, 'Changed. Replace this again.');
      
      await cleanupTestFile();
    });

    it('should throw an error when the search text is not found', async () => {
      await setupTestFile();
      
      try {
        await performSearchReplace(testFilePath, {
          search: 'non-existent content',
          replace: 'new content'
        });
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error.message.includes('not found'));
      }
      
      await cleanupTestFile();
    });
  });
});

// Run tests
async function runTests() {
  try {
    console.log('Running Edit Tools tests...');
    
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
