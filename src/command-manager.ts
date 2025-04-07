import fs from 'fs/promises';
import { CONFIG_FILE } from './config.js';

// Default blocked commands for security when config file cannot be loaded
const DEFAULT_BLOCKED_COMMANDS = [
  'format', 'mount', 'umount', 'mkfs', 'fdisk', 'dd',
  'sudo', 'su', 'passwd', 'adduser', 'useradd', 'usermod', 'groupadd'
];

class CommandManager {
  private blockedCommands: Set<string> = new Set();

  async loadBlockedCommands(): Promise<void> {
    try {
      const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(configData);
      
      if (!config.blockedCommands || !Array.isArray(config.blockedCommands)) {
        const errorMsg = `Error: Invalid blockedCommands format in ${CONFIG_FILE}`;
        process.stderr.write(JSON.stringify({
          type: 'error',
          timestamp: new Date().toISOString(),
          message: errorMsg
        }) + '\n');
        
        // Fall back to default blocked commands
        this.blockedCommands = new Set(DEFAULT_BLOCKED_COMMANDS);
        process.stderr.write(JSON.stringify({
          type: 'warning',
          timestamp: new Date().toISOString(),
          message: `Using default blocked commands list as fallback`
        }) + '\n');
        return;
      }
      
      this.blockedCommands = new Set(config.blockedCommands);
      process.stderr.write(JSON.stringify({
        type: 'info',
        timestamp: new Date().toISOString(),
        message: `Successfully loaded ${this.blockedCommands.size} blocked commands from config`
      }) + '\n');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      process.stderr.write(JSON.stringify({
        type: 'error',
        timestamp: new Date().toISOString(),
        message: `Failed to load blocked commands from ${CONFIG_FILE}: ${errorMessage}`
      }) + '\n');
      
      // Fall back to default blocked commands
      this.blockedCommands = new Set(DEFAULT_BLOCKED_COMMANDS);
      process.stderr.write(JSON.stringify({
        type: 'warning',
        timestamp: new Date().toISOString(),
        message: `Using default blocked commands list as fallback`
      }) + '\n');
    }
  }

  async saveBlockedCommands(): Promise<void> {
    try {
      const config = {
        blockedCommands: Array.from(this.blockedCommands)
      };
      await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      // Handle error if needed
    }
  }

  validateCommand(command: string): boolean {
    const baseCommand = command.split(' ')[0].toLowerCase().trim();
    return !this.blockedCommands.has(baseCommand);
  }

  async blockCommand(command: string): Promise<boolean> {
    command = command.toLowerCase().trim();
    if (this.blockedCommands.has(command)) {
      return false;
    }
    this.blockedCommands.add(command);
    await this.saveBlockedCommands();
    return true;
  }

  async unblockCommand(command: string): Promise<boolean> {
    command = command.toLowerCase().trim();
    if (!this.blockedCommands.has(command)) {
      return false;
    }
    this.blockedCommands.delete(command);
    await this.saveBlockedCommands();
    return true;
  }

  listBlockedCommands(): string[] {
    return Array.from(this.blockedCommands).sort();
  }
}

export const commandManager = new CommandManager();
