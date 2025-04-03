import { spawn } from 'child_process';
import { TerminalSession, CommandExecutionResult, ActiveSession } from './types.js';
import { DEFAULT_COMMAND_TIMEOUT } from './config.js';

// Constants for output management
const MAX_OUTPUT_SIZE = 20 * 1024 * 1024; // 10MB limit for stored output
const MAX_BUFFER_CHUNKS = 2000; // Maximum number of chunks to store

interface CompletedSession {
  pid: number;
  stdoutChunks: Buffer[];
  stderrChunks: Buffer[];
  exitCode: number | null;
  startTime: Date;
  endTime: Date;
  outputTruncated: boolean;
}

export class TerminalManager {
  private sessions: Map<number, TerminalSession> = new Map();
  private completedSessions: Map<number, CompletedSession> = new Map();
  private responseStdoutChunks: Map<number, Buffer[]> = new Map();
  private responseStderrChunks: Map<number, Buffer[]> = new Map();
  
  async executeCommand(command: string, timeoutMs: number = DEFAULT_COMMAND_TIMEOUT): Promise<CommandExecutionResult> {
    const process = spawn(command, [], { shell: true });
    
    // Ensure process.pid is defined before proceeding
    if (!process.pid) {
      throw new Error('Failed to get process ID');
    }

    // Initialize buffer arrays for this process
    const responseStdout: Buffer[] = [];
    const responseStderr: Buffer[] = [];
    this.responseStdoutChunks.set(process.pid, responseStdout);
    this.responseStderrChunks.set(process.pid, responseStderr);
    
    const session: TerminalSession = {
      pid: process.pid,
      process,
      stdoutChunks: [],
      stderrChunks: [],
      isBlocked: false,
      startTime: new Date()
    };
    
    this.sessions.set(process.pid, session);

    return new Promise((resolve) => {
      // Handle stdout with buffers
      process.stdout?.on('data', (data) => {
        // Store copy in response buffer (what we'll return from this method)
        responseStdout.push(Buffer.from(data));
        
        // Store in session for future getNewOutput calls
        session.stdoutChunks.push(Buffer.from(data));
        
        // Limit number of chunks to prevent memory issues
        this.limitBufferSize(session.stdoutChunks);
      });

      // Handle stderr with buffers
      process.stderr?.on('data', (data) => {
        // Store copy in response buffer
        responseStderr.push(Buffer.from(data));
        
        // Store in session for future getNewOutput calls
        session.stderrChunks.push(Buffer.from(data));
        
        // Limit number of chunks
        this.limitBufferSize(session.stderrChunks);
      });

      // Handle timeout
      setTimeout(() => {
        session.isBlocked = true;
        
        // Combine stdout and stderr for the response
        const output = this.combineOutput(responseStdout, responseStderr);
        
        if (process.pid) {
          // Clean up response buffers
          if (process.pid) {
            this.responseStdoutChunks.delete(process.pid);
            this.responseStderrChunks.delete(process.pid);
          }
        }
        
        resolve({
          pid: process.pid!,
          output,
          isBlocked: true
        });
      }, timeoutMs);

      // Handle process exit
      process.on('exit', (code) => {
        if (process.pid) {
          // Get full output for the response
          const output = this.combineOutput(responseStdout, responseStderr);
          
          // Clean up response buffers
          this.responseStdoutChunks.delete(process.pid);
          this.responseStderrChunks.delete(process.pid);
          
          // Store completed session before removing active session
          const stdoutSize = this.getTotalBufferSize(session.stdoutChunks);
          const stderrSize = this.getTotalBufferSize(session.stderrChunks);
          const outputTruncated = (stdoutSize + stderrSize) > MAX_OUTPUT_SIZE;
            
          this.completedSessions.set(process.pid, {
            pid: process.pid,
            stdoutChunks: session.stdoutChunks,
            stderrChunks: session.stderrChunks,
            exitCode: code,
            startTime: session.startTime,
            endTime: new Date(),
            outputTruncated
          });
          
          // Keep only last 100 completed sessions
          if (this.completedSessions.size > 100) {
            const oldestKey = Array.from(this.completedSessions.keys())[0];
            this.completedSessions.delete(oldestKey);
          }
          
          this.sessions.delete(process.pid);
          
          resolve({
            pid: process.pid!,
            output,
            isBlocked: false
          });
        }
      });
    });
  }

  private limitBufferSize(buffers: Buffer[]): void {
    // Limit by number of chunks
    if (buffers.length > MAX_BUFFER_CHUNKS) {
      buffers.splice(0, buffers.length - MAX_BUFFER_CHUNKS);
    }
    
    // Also limit by total memory usage
    let totalSize = 0;
    for (let i = buffers.length - 1; i >= 0; i--) {
      totalSize += buffers[i].length;
      if (totalSize > MAX_OUTPUT_SIZE) {
        buffers.splice(0, i);
        break;
      }
    }
  }
  
  private getTotalBufferSize(buffers: Buffer[]): number {
    return buffers.reduce((total, buffer) => total + buffer.length, 0);
  }
  
  private combineOutput(stdoutChunks: Buffer[], stderrChunks: Buffer[]): string {
    const stdout = Buffer.concat(stdoutChunks).toString();
    const stderr = Buffer.concat(stderrChunks).toString();
    return stdout + stderr;
  }

  getNewOutput(pid: number): string | null {
    // First check active sessions
    const session = this.sessions.get(pid);
    if (session) {
      // Combine stdout and stderr chunks
      const output = this.combineOutput(session.stdoutChunks, session.stderrChunks);
      
      // Clear chunks after reading
      session.stdoutChunks = [];
      session.stderrChunks = [];
      
      return output || 'No new output available';
    }

    // Then check completed sessions
    const completedSession = this.completedSessions.get(pid);
    if (completedSession) {
      // Format completion message with exit code and runtime
      const runtime = (completedSession.endTime.getTime() - completedSession.startTime.getTime()) / 1000;
      
      // Combine all output
      const output = this.combineOutput(completedSession.stdoutChunks, completedSession.stderrChunks);
      
      // Build completion message
      let message = `Process completed with exit code ${completedSession.exitCode}\nRuntime: ${runtime.toFixed(2)}s\n`;
      
      if (completedSession.outputTruncated) {
        message += 'Warning: Output was truncated due to size limits.\n';
      }
      
      message += `Final output:\n${output}`;
      
      return message;
    }

    return null;
  }

  forceTerminate(pid: number): boolean {
    const session = this.sessions.get(pid);
    if (!session) {
      return false;
    }

    try {
      session.process.kill('SIGINT');
      setTimeout(() => {
        if (this.sessions.has(pid)) {
          session.process.kill('SIGKILL');
        }
      }, 1000);
      return true;
    } catch (error) {
      console.error(`Failed to terminate process ${pid}:`, error);
      return false;
    }
  }

  listActiveSessions(): ActiveSession[] {
    const now = new Date();
    return Array.from(this.sessions.values()).map(session => ({
      pid: session.pid,
      isBlocked: session.isBlocked,
      runtime: now.getTime() - session.startTime.getTime()
    }));
  }

  listCompletedSessions(): CompletedSession[] {
    return Array.from(this.completedSessions.values());
  }
}

export const terminalManager = new TerminalManager();