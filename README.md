# Claude Desktop Commander

[![npm version](https://img.shields.io/npm/v/@wongfei2009/claude-desktop-commander)](https://www.npmjs.com/package/@wongfei2009/claude-desktop-commander)
[![npm downloads](https://img.shields.io/npm/dw/@wongfei2009/claude-desktop-commander)](https://www.npmjs.com/package/@wongfei2009/claude-desktop-commander)
[![GitHub](https://img.shields.io/github/license/wongfei2009/claude-desktop-commander)](https://github.com/wongfei2009/claude-desktop-commander/blob/main/LICENSE)

A powerful MCP server that enables the Claude Desktop app to execute terminal commands and perform diff-based file editing on your computer.

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Terminal Commands](#terminal-commands)
  - [File Operations](#file-operations)
  - [Code Editing](#code-editing)
- [Handling Long-Running Commands](#handling-long-running-commands)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

This server allows Claude desktop app to execute terminal commands on your computer and manage processes through Model Context Protocol (MCP). It builds on top of [MCP Filesystem Server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) to provide additional search and replace file editing capabilities.

## Features

- **Terminal Integration**
  - Execute terminal commands with output streaming
  - Command timeout and background execution support
  - Process management (list and kill processes)
  - Session management for long-running commands

- **Filesystem Operations**
  - Read/write files
  - Create/list directories
  - Move files/directories
  - Search files
  - Get file metadata

- **Code Editing Capabilities**
  - Surgical text replacements for small changes
  - Full file rewrites for major changes
  - Multiple file support
  - Pattern-based replacements

## Installation

### Install from Source
1. Clone and build:
```bash
git clone https://github.com/wongfei2009/claude-desktop-commander.git
cd claude-desktop-commander
npm run setup
```
2. Restart Claude if it's running.

For more detailed installation instructions, see the [installation guide](./docs/installation.md).

## Usage

The server provides three main categories of tools:

### Terminal Commands

Ask Claude to run terminal commands directly:

```
Please run 'ls -la' on my computer.
```

```
Can you check how much disk space I have available with 'df -h'?
```

For a comprehensive list of terminal commands, see the [Terminal Tools documentation](./docs/terminal-tools.md).

### File Operations

Ask Claude to perform file operations:

```
Please list all JavaScript files in my current project.
```

```
Can you create a new directory named 'backup' and move all my log files there?
```

For all available file operations, see the [Filesystem Tools documentation](./docs/filesystem-tools.md).

### Code Editing

Claude can make targeted changes to your code files:

```
Please update the greeting message in src/main.js to say "Welcome to the application!" instead of the current message.
```

For edit commands and best practices, see the [Edit Tools documentation](./docs/edit-tools.md).

## Handling Long-Running Commands

For commands that may take a while:

1. `execute_command` returns after timeout with initial output
2. Command continues in background
3. Use `read_output` with PID to get new output
4. Use `force_terminate` to stop if needed

Example dialogue:
```
You: Can you run a long-running command like 'find / -name "*.js" 2>/dev/null'?

Claude: I'll run that command for you. It might take some time because it's searching the entire file system...
[Initial output appears]
The command is still running in the background with PID 12345. I can check for more output if you ask.

You: Can you check if there are more results?

Claude: Here are the additional results that have come in since last time...
```

## Security

Claude Desktop Commander includes several security features:

- **Command Blacklisting**: Block potentially destructive commands
- **Path Validation**: Prevent access to sensitive directories
- **Permission Controls**: Run with minimal required permissions

For secure usage:
1. Use the command blacklist to prevent dangerous commands
2. Avoid running as root/administrator unless necessary
3. Keep the package updated for security patches

## Troubleshooting

### Common Issues

1. **Command Not Found**
   - Ensure the command is installed on your system
   - Check your PATH environment variable

2. **Permission Denied**
   - Commands are run with your user permissions
   - Some operations may require elevated privileges

3. **Claude Can't Access Files**
   - Verify file paths are correct
   - Check file permissions
   - Ensure you're not trying to access restricted locations

For more troubleshooting tips, see the [installation guide](./docs/installation.md#troubleshooting).

## Contributing

If you find this project useful, please consider giving it a ⭐ star on GitHub! This helps others discover the project and encourages further development.

Contributions are welcome! Whether you've found a bug, have a feature request, or want to contribute code, here's how you can help:

- **Found a bug?** Open an issue at [github.com/wongfei2009/claude-desktop-commander/issues](https://github.com/wongfei2009/claude-desktop-commander/issues)
- **Have a feature idea?** Submit a feature request in the issues section
- **Want to contribute code?** Fork the repository, create a branch, and submit a pull request

All contributions, big or small, are greatly appreciated!

## License

MIT