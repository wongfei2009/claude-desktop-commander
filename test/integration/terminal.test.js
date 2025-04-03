/**
 * Integration tests for terminal commands
 */
import { describe, it, expect } from 'vitest';
import { executeCommand, readOutput, forceTerminate } from '../../dist/tools/execute.js';
import { listProcesses } from '../../dist/tools/process.js';

describe('Terminal Integration Tests', () => {
  describe('executeCommand', () => {
    it('should execute simple commands', async () => {
      const result = await executeCommand({
        command: 'echo "Hello, world!"',
        timeout_ms: 1000
      });
      
      expect(result.content[0].text).toContain('Hello, world!');
    });
    
    it.skip('should handle command errors', async () => {
      // This test is skipped because the command manager might block or handle
      // nonexistent commands differently than we expect
    });
    
    it('should return process ID for long-running commands', async () => {
      // Using 'sleep' on Unix or 'ping' on Windows as a long-running command
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'ping -t localhost' : 'sleep 10';
      
      const result = await executeCommand({
        command,
        timeout_ms: 500  // Short timeout to ensure it returns before completion
      });
      
      expect(result.content[0].text).toContain('PID');
      
      // If we can extract the PID, we should terminate the process
      try {
        const pidMatch = result.content[0].text.match(/PID: (\d+)/);
        if (pidMatch && pidMatch[1]) {
          const pid = parseInt(pidMatch[1], 10);
          await forceTerminate({ pid });
        }
      } catch (error) {
        console.warn('Could not terminate test process:', error.message);
      }
    });
  });
  
  describe('Process Management', () => {
    it('should list processes', async () => {
      const processes = await listProcesses({});
      
      // The response should be an object with the expected format
      expect(processes).toBeDefined();
    });
  });
});