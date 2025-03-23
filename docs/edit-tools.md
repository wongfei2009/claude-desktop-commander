# Edit Tools

This document covers the code editing tools provided by Claude Desktop Commander.

## Available Tools

### edit_block
Apply surgical text replacements to files. Best for small changes (<20% of file size).

**Usage:**
```javascript
edit_block({
  blockContent: `filepath.ext
<<<<<<< SEARCH
existing code to replace
=======
new code to insert
>>>>>>> REPLACE`
})
```

**Parameters:**
- `blockContent` (string): A specially formatted block that contains:
  - The file path on the first line
  - A search section marked by `<<<<<<< SEARCH` and `=======`
  - A replace section marked by `=======` and `>>>>>>> REPLACE`

**Example:**
```
src/main.js
<<<<<<< SEARCH
console.log("old message");
=======
console.log("new message");
>>>>>>> REPLACE
```

**Best Practices:**
- Use for small, targeted changes (less than 20% of file size)
- Ensure the search text is unique within the file
- Include sufficient context around the changes
- Multiple blocks can be used for separate changes

### write_file
Complete file rewrites. Best for large changes (>20% of file) or when edit_block fails.

**Usage:**
```javascript
write_file({ path: "/path/to/file.txt", content: "Complete new file content" })
```

**Parameters:**
- `path` (string): Path to the file
- `content` (string): New content for the entire file

**Best Practices:**
- Use for major changes or complete rewrites
- Consider backing up files before overwriting
- Prefer edit_block for small changes to reduce risk

## Common Edit Patterns

### Adding a New Function
```
src/utils.js
<<<<<<< SEARCH
// End of utility functions
=======
// New function
function parseData(input) {
  return JSON.parse(input);
}

// End of utility functions
>>>>>>> REPLACE
```

### Modifying Configuration
```
config.json
<<<<<<< SEARCH
  "timeout": 5000,
=======
  "timeout": 10000,
>>>>>>> REPLACE
```

## Error Handling

The edit tools will verify changes after application and report:
- If the search text wasn't found
- If multiple instances of the search text were found
- If the file couldn't be written
