# Filesystem Tools

This document covers the filesystem-related tools provided by Claude Desktop Commander.

## Available Tools

### read_file
Read the contents of a file.

**Usage:**
```javascript
read_file({ path: "/path/to/file.txt" })
```

**Parameters:**
- `path` (string): Path to the file to read

**Returns:**
- File contents as a string

### write_file
Write contents to a file (creates or overwrites).

**Usage:**
```javascript
write_file({ path: "/path/to/file.txt", content: "New file content" })
```

**Parameters:**
- `path` (string): Path to the file
- `content` (string): Content to write

### create_directory
Create a new directory.

**Usage:**
```javascript
create_directory({ path: "/path/to/new/directory" })
```

**Parameters:**
- `path` (string): Path to the directory to create

### list_directory
List files and directories in a specified path.

**Usage:**
```javascript
list_directory({ path: "/path/to/directory" })
```

**Parameters:**
- `path` (string): Path to list

**Returns:**
- Array of file and directory entries, marked with [FILE] and [DIR] prefixes

### move_file
Move or rename files and directories.

**Usage:**
```javascript
move_file({ source: "/path/to/source.txt", destination: "/path/to/destination.txt" })
```

**Parameters:**
- `source` (string): Source path
- `destination` (string): Destination path

### search_files
Search for files matching a pattern.

**Usage:**
```javascript
search_files({ path: "/path/to/search", pattern: "*.js" })
```

**Parameters:**
- `path` (string): Base path to search from
- `pattern` (string): Search pattern (glob format)

**Returns:**
- List of matching files and directories

### get_file_info
Get detailed information about a file or directory.

**Usage:**
```javascript
get_file_info({ path: "/path/to/file.txt" })
```

**Parameters:**
- `path` (string): Path to get information about

**Returns:**
- Detailed file metadata (size, creation time, modification time, etc.)

## Security Considerations

- Always validate paths before performing operations
- Consider restricting operations to specific directories
- Avoid exposing sensitive system files
