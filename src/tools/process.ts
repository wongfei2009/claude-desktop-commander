
import { promisify } from 'util';
import { exec } from 'child_process';
import psList from 'ps-list'; // Import ps-list package
import { ProcessInfo } from '../types.js';
import { KillProcessArgsSchema } from './schemas.js';

const execAsync = promisify(exec);

/**
 * Lists running processes using cross-platform ps-list library
 */
export async function listProcesses(): Promise<{content: Array<{type: string, text: string}>}> {
  try {
    // Use ps-list to get processes in a cross-platform manner
    const processList = await psList();
    
    // Convert to our ProcessInfo format
    const processes = processList.map(proc => {
      return {
        pid: proc.pid,
        command: proc.name || '[unknown]', // Ensure command name is never undefined
        cpu: proc.cpu?.toString() || 'N/A',
        memory: proc.memory?.toString() || 'N/A'
      } as ProcessInfo;
    });

    return {
      content: [{
        type: "text",
        text: processes.map(p =>
          `PID: ${p.pid}, Command: ${p.command}, CPU: ${p.cpu}, Memory: ${p.memory}`
        ).join('\n')
      }],
    };
  } catch (error) {
    console.error('Process listing error:', error);
    throw new Error(`Failed to list processes: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function killProcess(args: unknown) {
  const parsed = KillProcessArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for kill_process: ${parsed.error}`);
  }

  try {
    process.kill(parsed.data.pid);
    return {
      content: [{ type: "text", text: `Successfully terminated process ${parsed.data.pid}` }],
    };
  } catch (error) {
    throw new Error(`Failed to kill process: ${error instanceof Error ? error.message : String(error)}`);
  }
}
