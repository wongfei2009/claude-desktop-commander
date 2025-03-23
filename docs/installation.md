# Installation Guide

This guide covers the installation and setup of Claude Desktop Commander.

## Prerequisites

- Node.js 16 or higher
- Claude Desktop app installed
- npm or yarn package manager

## Installation Methods

### Install from Source

1. Clone the repository:
```bash
git clone https://github.com/wongfei2009/claude-desktop-commander.git
cd claude-desktop-commander
```

2. Run the setup command:
```bash
npm run setup
```

The setup command will:
- Install dependencies
- Build the server
- Configure Claude's desktop app
- Add MCP servers to Claude's config if needed

## Verifying Installation

To verify the installation:

1. Restart Claude if it's running
2. Open Claude Desktop app
3. Execute a simple command like:
   ```
   Can you list the files in my current directory?
   ```
4. Claude should be able to execute this command through the Desktop Commander

### Getting Help

If you encounter issues not covered in this guide:

- Check the [GitHub issues](https://github.com/wongfei2009/claude-desktop-commander/issues) to see if others have experienced the same problem
- Open a new issue with details about your environment and the specific error
