# Multi-Block Edit Feature

This document explains how to use the new `multi_edit_blocks` tool in Claude Desktop Commander, which allows making multiple edits across multiple files in a single operation.

## Overview

The multi-block edit feature enhances your ability to perform complex code refactoring and file edits without needing multiple back-and-forth interactions. It enables you to:

- Make multiple changes to multiple files in a single operation
- Use different types of operations (replace, insert, append, etc.)
- Preview changes with dry run mode
- Get detailed results of all operations

## Operation Types

The tool supports five operation types:

1. **replace** - Replace text that matches a search pattern
2. **insertBefore** - Insert content before a specific line number
3. **insertAfter** - Insert content after a specific line number
4. **prepend** - Add content at the beginning of a file
5. **append** - Add content at the end of a file

## Input Format

The tool accepts a structured input with the following format:

```json
{
  "edits": [
    {
      "filepath": "/path/to/file1.js",
      "operations": [
        {
          "type": "replace",
          "search": "oldText",
          "replace": "newText"
        },
        {
          "type": "insertAfter",
          "lineNumber": 10,
          "content": "// New content after line 10"
        }
      ]
    },
    {
      "filepath": "/path/to/file2.js",
      "operations": [
        {
          "type": "prepend",
          "content": "// Header comment\n"
        }
      ]
    }
  ],
  "options": {
    "dryRun": false,
    "caseSensitive": true,
    "allOccurrences": false
  }
}
```

## Options

- **dryRun** (boolean, default: false) - If true, will simulate the edits without actually changing files
- **caseSensitive** (boolean, default: true) - If false, case-insensitive search for replace operations
- **allOccurrences** (boolean, default: false) - If true, replaces all occurrences of search text instead of just the first

## Required Parameters for Each Operation Type

Each operation type requires specific parameters:

### replace
- **search** (string, required) - Text to search for
- **replace** (string, required) - Text to replace the search text with

### insertBefore / insertAfter
- **lineNumber** (number, required) - Line number to insert content before/after (0-based)
- **content** (string, required) - Content to insert

### prepend / append
- **content** (string, required) - Content to add to beginning/end of file

## Example Usage with Claude

Here's how to use the multi-block edit feature with Claude:

```
I need to refactor some JavaScript files:

1. In file /path/to/test-claude-integration.js:
   - Rename testFunction to calculateSum
   - Change the environment from 'development' to 'production'
   - Add a comment "// Debug logging" before the console.log statements

2. In file /path/to/test-claude-integration-2.js:
   - Update the function call from testFunction to calculateSum
   - Add a new item at the beginning of the items array
   - Prepend a file description comment at the top of the file
```

Claude will then use the `multi_edit_blocks` tool to perform all these operations in a single call, which might look like:

```javascript
{
  "edits": [
    {
      "filepath": "/path/to/test-claude-integration.js",
      "operations": [
        {
          "type": "replace",
          "search": "function testFunction",
          "replace": "function calculateSum"
        },
        {
          "type": "replace",
          "search": "environment: 'development'",
          "replace": "environment: 'production'"
        },
        {
          "type": "insertBefore",
          "lineNumber": 11,
          "content": "// Debug logging"
        }
      ]
    },
    {
      "filepath": "/path/to/test-claude-integration-2.js",
      "operations": [
        {
          "type": "replace",
          "search": "testFunction",
          "replace": "calculateSum"
        },
        {
          "type": "insertAfter",
          "lineNumber": 5,
          "content": "  { id: 0, name: 'Zero item' },"
        },
        {
          "type": "prepend",
          "content": "/**\n * Integration test file 2\n * Used for testing multi-block edits\n */\n"
        }
      ]
    }
  ],
  "options": {
    "dryRun": false,
    "caseSensitive": true,
    "allOccurrences": true
  }
}
```

## Output Format

The tool returns detailed results about each operation:

```json
{
  "success": true,
  "editResults": [
    {
      "filepath": "/path/to/file1.js",
      "success": true,
      "operationResults": [
        {
          "index": 0,
          "success": true,
          "matchCount": 1
        },
        {
          "index": 1,
          "success": true,
          "matchCount": 1
        }
      ]
    },
    {
      "filepath": "/path/to/file2.js",
      "success": true,
      "operationResults": [
        {
          "index": 0,
          "success": true,
          "matchCount": 3
        }
      ]
    }
  ],
  "dryRun": false
}
```

The output includes:
- Overall success status
- Success status for each file
- Success status for each operation
- Match count for each operation
- Error messages for any failed operations
- Whether the operation was a dry run

## Error Handling

The tool continues to process all operations even if some fail. This allows you to get as many changes applied as possible in a single operation. Detailed error messages are provided for any operations that fail.

## Best Practices

1. **Use dry run first**: Set `"dryRun": true` to preview changes before applying them
2. **Operation order matters**: Operations are applied in sequence, so later operations will see the results of earlier ones
3. **Line numbers can change**: Be careful with line numbers when doing multiple insert operations, as they can shift
4. **Be specific with search text**: Use enough context in search strings to ensure you match the right text
5. **Use replace with caution**: The default behavior replaces only the first occurrence; use `"allOccurrences": true` to replace all instances

## Limitations

- Line numbers are 0-based (the first line is line 0)
- Large files may take longer to process
- The tool cannot handle binary files
