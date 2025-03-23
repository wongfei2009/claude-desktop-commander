# Installation Guide

This guide covers the installation and setup of Claude Desktop Commander.

## Prerequisites

- Node.js 16 or higher
- Claude Desktop app installed
- npm or yarn package manager

## Installation Methods

### Option 1: Install using npm

The simplest way to install is using npm:
```bash
npm install -g @wongfei2009/claude-desktop-commander
npx @wongfei2009/claude-desktop-commander
```

This will automatically:
- Install the package globally
- Configure Claude's desktop app

### Option 2: Install from Source

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

### Option 3: Manual Configuration

If you prefer to manually configure Claude Desktop, follow these steps:

1. Install the package globally:
```bash
npm install -g @wongfei2009/claude-desktop-commander
```

2. Locate your Claude Desktop configuration file:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

3. Edit the configuration file to add the MCP server:
```json
{
  "mcpServers": {
    "desktop-commander": {
      "command": "npx",
      "args": [
        "@wongfei2009/claude-desktop-commander"
      ]
    }
  }
}
```

4. If the file doesn't exist, create it with the content above (and any other required settings).

5. Restart Claude Desktop app to apply the changes.

## Verifying Installation

To verify the installation:

1. Restart Claude if it's running
2. Open Claude Desktop app
3. Execute a simple command like:
   ```
   Can you list the files in my current directory?
   ```
4. Claude should be able to execute this command through the Desktop Commander

## Troubleshooting

### Common Installation Issues

1. **Claude can't find or execute commands**
   - Make sure the package is installed globally (`npm install -g @wongfei2009/claude-desktop-commander`)
   - Check that the configuration file has the correct path to the command

2. **Configuration file issues**
   - Ensure the JSON syntax in your configuration file is valid
   - Make sure you have the correct permissions to edit the configuration file
   - The configuration file should be in UTF-8 encoding

3. **Manual configuration errors**
   - If you've manually configured Claude, ensure you've correctly specified the command and args
   - Check for typos in the server name ("desktop-commander")
   - Verify that any existing configuration isn't being overwritten

4. **Path issues with npx**
   - Ensure npx is in your PATH
   - Try using the full path to npx if needed

### Getting Help

If you encounter issues not covered in this guide:

- Check the [GitHub issues](https://github.com/wongfei2009/claude-desktop-commander/issues) to see if others have experienced the same problem
- Open a new issue with details about your environment and the specific error
