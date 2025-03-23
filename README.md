# Claude Desktop Commander

[![npm version](https://img.shields.io/npm/v/@wongfei2009/claude-desktop-commander)](https://www.npmjs.com/package/@wongfei2009/claude-desktop-commander)
[![npm downloads](https://img.shields.io/npm/dw/@wongfei2009/claude-desktop-commander)](https://www.npmjs.com/package/@wongfei2009/claude-desktop-commander)
[![GitHub](https://img.shields.io/github/license/wongfei2009/claude-desktop-commander)](https://github.com/wongfei2009/claude-desktop-commander/blob/main/LICENSE)

A powerful MCP server that enables the Claude Desktop app to execute terminal commands and perform diff-based file editing on your computer.

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Handling Long-Running Commands](#handling-long-running-commands)
- [Work in Progress and TODOs](#work-in-progress-and-todos)
- [Resources](#resources)
- [Feedback](#feedback)
- [Contributing](#contributing)
- [License](#license)

This server allows Claude desktop app to execute long-running terminal commands on your computer and manage processes through Model Context Protocol (MCP). It builds on top of [MCP Filesystem Server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) to provide additional search and replace file editing capabilities.

## Features

- Execute terminal commands with output streaming
- Command timeout and background execution support
- Process management (list and kill processes)
- Session management for long-running commands
- Full filesystem operations:
  - Read/write files
  - Create/list directories
  - Move files/directories
  - Search files
  - Get file metadata
  - Code editing capabilities:
  - Surgical text replacements for small changes
  - Full file rewrites for major changes
  - Multiple file support
  - Pattern-based replacements

## Installation
First, ensure you've downloaded and installed the [Claude Desktop app](https://claude.ai/download) and you have [npm installed](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

### Option 1: Install via NPX
Run this command in your terminal:
```bash
npx @wongfei2009/claude-desktop-commander setup
```
Restart Claude if it's running.

### Option 2: Add to claude_desktop_config manually
Add this entry to your claude_desktop_config.json:
- On Mac: `~/Library/Application\ Support/Claude/claude_desktop_config.json`
- On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "claude-desktop-commander": {
      "command": "npx",
      "args": [
        "-y",
        "@wongfei2009/claude-desktop-commander"
      ]
    }
  }
}
```
Restart Claude if it's running.

### Option 3: Install from source
1. Clone and build:
```bash
git clone https://github.com/wongfei2009/claude-desktop-commander.git
cd claude-desktop-commander
npm run setup
```
Restart Claude if it's running.

The setup command will:
- Install dependencies
- Build the server
- Configure Claude's desktop app
- Add MCP servers to Claude's config if needed

## Usage

The server provides these tool categories:

### Terminal Tools
- `execute_command`: Run commands with configurable timeout
- `read_output`: Get output from long-running commands
- `force_terminate`: Stop running command sessions
- `list_sessions`: View active command sessions
- `list_processes`: View system processes
- `kill_process`: Terminate processes by PID
- `block_command`/`unblock_command`: Manage command blacklist

### Filesystem Tools
- `read_file`/`write_file`: File operations
- `create_directory`/`list_directory`: Directory management  
- `move_file`: Move/rename files
- `search_files`: Pattern-based file search
- `get_file_info`: File metadata

### Edit Tools
- `edit_block`: Apply surgical text replacements (best for changes <20% of file size)
- `write_file`: Complete file rewrites (best for large changes >20% or when edit_block fails)

Search/Replace Block Format:
```
filepath.ext
<<<<<<< SEARCH
existing code to replace
=======
new code to insert
>>>>>>> REPLACE
```

Example:
```
src/main.js
<<<<<<< SEARCH
console.log("old message");
=======
console.log("new message");
>>>>>>> REPLACE
```

## Handling Long-Running Commands

For commands that may take a while:

1. `execute_command` returns after timeout with initial output
2. Command continues in background
3. Use `read_output` with PID to get new output
4. Use `force_terminate` to stop if needed

## Model Context Protocol Integration

This project extends the MCP Filesystem Server to enable:
- Local server support in Claude Desktop
- Full system command execution
- Process management
- File operations
- Code editing with search/replace blocks

## Work in Progress and TODOs

The following features are currently being developed or planned:

- **Better code search** - Enhanced code exploration with context-aware results
- **Better configurations** - Improved settings for allowed paths, commands and shell environment
- **Cross-platform improvements** - Better support for Windows, Linux, and macOS
- **Support for WSL** - Windows Subsystem for Linux integration
- **Support for SSH** - Remote server command execution
- **Installation troubleshooting guide** - Comprehensive help for setup issues
- **Security enhancements** - Improved security controls and permissions

## Resources

### Getting Started Guide
- Coming soon: A comprehensive guide to using Claude Desktop Commander effectively

### Video Tutorials
- Coming soon: Video tutorials for setup and usage

### Related Projects
- [Original project by Eduard Ruzga](https://github.com/wonderwhy-er/ClaudeComputerCommander)

## Feedback

Have you used Claude Desktop Commander? Your feedback would be valuable! Please consider:

1. Opening an issue with your experience
2. Submitting a pull request with improvements
3. Starring the repository if you find it useful

Future testimonials from users will be featured here.

## Contributing

If you find this project useful, please consider giving it a ⭐ star on GitHub! This helps others discover the project and encourages further development.

Contributions are welcome! Whether you've found a bug, have a feature request, or want to contribute code, here's how you can help:

- **Found a bug?** Open an issue at [github.com/wongfei2009/claude-desktop-commander/issues](https://github.com/wongfei2009/claude-desktop-commander/issues)
- **Have a feature idea?** Submit a feature request in the issues section
- **Want to contribute code?** Fork the repository, create a branch, and submit a pull request
- **Questions or discussions?** Start a discussion in the GitHub Discussions tab

All contributions, big or small, are greatly appreciated!

## License

MIT