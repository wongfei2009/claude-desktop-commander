# Unit Tests for Claude Desktop Commander

This directory contains unit tests for the Claude Desktop Commander MCP server.

## Test Files

- `edit.test.js` - Tests for the edit operations (parseEditBlock, performSearchReplace)
- `filesystem-bulk.test.js` - Tests for bulk file operations:
  - bulkMoveFiles - Moving multiple files at once
  - bulkCopyFiles - Copying multiple files at once 
  - bulkDeleteFiles - Deleting multiple files at once
  - bulkRenameFiles - Renaming multiple files at once
  - findAndReplaceFilenames - Pattern-based filename changes

## Running Tests

To run all unit tests:

```bash
npm run test:unit
```

To run a specific test file:

```bash
# Run just the bulk filesystem tests
node test/test.js test/unit/filesystem-bulk.test.js
```

## Test Structure

Each test file follows a similar structure:

1. Import the functions to test
2. Define test cases using `describe` and `it` functions
3. Export a `runTests` function to be called by the main test runner

The filesystem bulk operations tests work by:

1. Creating a temporary test directory in the OS temp folder
2. Setting up files and directories for each test
3. Running the operations with different options
4. Verifying the results
5. Cleaning up the test directory when done

## Test Coverage

The bulk file operations tests cover:

- Basic functionality (move, copy, delete, rename)
- Error handling and the `skipErrors` option
- Directory creation with `createDirectories` option
- File extension preservation with `preserveExtension` option
- Pattern-based filename changes with regular expressions
- Dry run mode which simulates changes without actually performing them

## Adding New Tests

When adding new tests:

1. Follow the existing pattern with `describe` and `it` blocks
2. Make sure to clean up any test files or directories after tests
3. Export a `runTests` function
4. Handle both success and failure cases in your tests
