import { terminalManager } from '../terminal-manager.js';
import { commandManager } from '../command-manager.js';
import { ExecuteCommandArgsSchema, ReadOutputArgsSchema, ForceTerminateArgsSchema, ListSessionsArgsSchema } from './schemas.js';

export async function executeCommand(args: unknown) {
  const parsed = ExecuteCommandArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for execute_command: ${parsed.error}`);
  }

  try {
    // Validate the command
    if (!commandManager.validateCommand(parsed.data.command)) {
      throw new Error(`Command not allowed: ${parsed.data.command}`);
    }

    // Execute the command with optimized output handling
    const result = await terminalManager.executeCommand(
      parsed.data.command,
      parsed.data.timeout_ms
    );

    // Format response for user
    let responseText = `Command started with PID ${result.pid}\n`;
    
    if (result.output.trim()) {
      responseText += `Initial output:\n${result.output}\n`;
    } else {
      responseText += 'No initial output available.\n';
    }
    
    if (result.isBlocked) {
      responseText += 'Command is still running. Use desktop_cmd_output to get more output.';
    }

    return {
      content: [{
        type: "text",
        text: responseText
      }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: "text",
        text: `Error executing command: ${errorMessage}`
      }],
      isError: true
    };
  }
}

export async function readOutput(args: unknown) {
  const parsed = ReadOutputArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for read_output: ${parsed.error}`);
  }

  try {
    const pid = parsed.data.pid;
    const output = terminalManager.getNewOutput(pid);
    
    if (output === null) {
      return {
        content: [{
          type: "text",
          text: `No session found for PID ${pid}`
        }],
      };
    }
    
    // Don't return an empty string if there's no new output
    const responseText = output.trim() ? output : 'No new output available';
    
    return {
      content: [{
        type: "text",
        text: responseText
      }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: "text",
        text: `Error reading output: ${errorMessage}`
      }],
      isError: true
    };
  }
}

export async function forceTerminate(args: unknown) {
  const parsed = ForceTerminateArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for force_terminate: ${parsed.error}`);
  }

  try {
    const pid = parsed.data.pid;
    const success = terminalManager.forceTerminate(pid);
    
    return {
      content: [{
        type: "text",
        text: success
          ? `Successfully initiated termination of session ${pid}`
          : `No active session found for PID ${pid}`
      }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: "text",
        text: `Error terminating process: ${errorMessage}`
      }],
      isError: true
    };
  }
}

export async function listSessions() {
  try {
    const sessions = terminalManager.listActiveSessions();
    
    if (sessions.length === 0) {
      return {
        content: [{
          type: "text",
          text: 'No active sessions'
        }],
      };
    }
    
    // Format active sessions with more detailed information
    const formattedSessions = sessions.map(s => {
      const runtimeSeconds = Math.round(s.runtime / 1000);
      const minutes = Math.floor(runtimeSeconds / 60);
      const seconds = runtimeSeconds % 60;
      const formattedRuntime = minutes > 0 
        ? `${minutes}m ${seconds}s` 
        : `${seconds}s`;
      
      return `PID: ${s.pid}, Status: ${s.isBlocked ? 'Running (blocked)' : 'Running'}, Runtime: ${formattedRuntime}`;
    }).join('\n');
    
    return {
      content: [{
        type: "text",
        text: formattedSessions
      }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: "text",
        text: `Error listing sessions: ${errorMessage}`
      }],
      isError: true
    };
  }
}
