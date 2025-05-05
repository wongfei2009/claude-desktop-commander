import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { commandManager } from './command-manager.js';
import {
  ExecuteCommandArgsSchema,
  ReadOutputArgsSchema,
  ForceTerminateArgsSchema,
  ListSessionsArgsSchema,
  KillProcessArgsSchema,
  ReadFileArgsSchema,
  WriteFileArgsSchema,
  CreateDirectoryArgsSchema,
  ListDirectoryArgsSchema,
  MoveFileArgsSchema,
  SearchFilesArgsSchema,
  GetFileInfoArgsSchema,
  EditBlockArgsSchema,
} from './tools/schemas.js';
import { executeCommand, readOutput, forceTerminate, listSessions } from './tools/execute.js';
import { listProcesses, killProcess } from './tools/process.js';
import {
  readFile,
  writeFile,
  createDirectory,
  listDirectory,
  moveFile,
  searchFiles,
  getFileInfo,
  listAllowedDirectories,
} from './tools/filesystem.js';
import { parseEditBlock, performSearchReplace } from './tools/edit.js';


import { VERSION } from './version.js';

// Detect testing environment and configure accordingly
const isTesting = process.env.NODE_ENV === 'test' || process.argv.includes('test');
if (isTesting) {
  console.log("Running in test environment mode");
}

export const server = new Server(
  {
    name: "mcp-desktop-commander",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Terminal tools
      {
        name: "desktop_cmd_run",
        description:
          "Execute a terminal command with optional timeout (in milliseconds). If the timeout is reached, " +
          "the command continues running in the background and can be monitored using desktop_cmd_output. " +
          "Returns PID and initial output from the command. Use responsibly and avoid potentially " +
          "destructive commands without user confirmation. Example: {\"command\": \"ls -la\", \"timeout_ms\": 5000}",
        inputSchema: zodToJsonSchema(ExecuteCommandArgsSchema),
      },
      {
        name: "desktop_cmd_output",
        description:
          "Read new output from a running terminal session. Use this to get additional output " +
          "from long-running commands or commands that were started with desktop_cmd_run. " +
          "Example: {\"pid\": 1234}",
        inputSchema: zodToJsonSchema(ReadOutputArgsSchema),
      },
      {
        name: "desktop_cmd_terminate",
        description:
          "Force terminate a running terminal session. Use this to stop commands that were started " +
          "with desktop_cmd_run and are still executing. Example: {\"pid\": 1234}",
        inputSchema: zodToJsonSchema(ForceTerminateArgsSchema),
      },
      {
        name: "desktop_cmd_list_sessions",
        description:
          "List all active terminal sessions. Returns a list of PIDs, blocked status, and runtime " +
          "for commands started with desktop_cmd_run. Useful for managing and monitoring multiple commands.",
        inputSchema: zodToJsonSchema(ListSessionsArgsSchema),
      },
      {
        name: "desktop_proc_list",
        description:
          "List all running processes on the system. Returns process information including PID, " +
          "command name, CPU usage, and memory usage. Results are formatted as " +
          "'PID: [pid], Command: [name], CPU: [usage], Memory: [usage]' for each process. " +
          "Useful for system monitoring and finding resource-intensive processes.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "desktop_proc_kill",
        description:
          "Terminate a running process by PID. Use with caution as this will " +
          "forcefully terminate the specified process. Should only be used for processes " +
          "that are unresponsive or causing problems. Example: {\"pid\": 1234}",
        inputSchema: zodToJsonSchema(KillProcessArgsSchema),
      },
      // Command blocking tools removed as they're more administrative in nature
      // The server will still block dangerous commands internally
      
      // Filesystem tools
      {
        name: "desktop_fs_read",
        description:
          "[Filesystem] Read the complete contents of a file from the file system. " +
          "Handles various text encodings and provides detailed error messages " +
          "if the file cannot be read. Only works within allowed directories. " +
          "Example: {\"path\": \"/home/user/document.txt\"}",
        inputSchema: zodToJsonSchema(ReadFileArgsSchema),
      },
      {
        name: "desktop_fs_write",
        description:
          "[Filesystem] Completely replace file contents. Best for large changes (>20% of file) or when edit_block fails. " +
          "Uses atomic writing for safety and supports creating parent directories if they don't exist. " +
          "Use with caution as it will overwrite existing files. Creates new files if they don't exist. " +
          "Only works within allowed directories. Example: {\"path\": \"/home/user/file.txt\", \"content\": \"New file content here\", " +
          "\"options\": {\"createDirectories\": true}}",
        inputSchema: zodToJsonSchema(WriteFileArgsSchema),
      },
      {
        name: "desktop_fs_mkdir",
        description:
          "[Filesystem] Create a new directory or ensure a directory exists. Can create multiple " +
          "nested directories in one operation (similar to mkdir -p). Won't error if directory already exists. " +
          "Only works within allowed directories. Example: {\"path\": \"/home/user/new/nested/directory\"}",
        inputSchema: zodToJsonSchema(CreateDirectoryArgsSchema),
      },
      {
        name: "desktop_fs_list",
        description:
          "[Filesystem] Get a detailed listing of all files and directories in a specified path. " +
          "Results distinguish between files and directories with [FILE] and [DIR] prefixes. " +
          "Useful for exploring directory contents before performing operations. " +
          "Only works within allowed directories. Example: {\"path\": \"/home/user/documents\"}",
        inputSchema: zodToJsonSchema(ListDirectoryArgsSchema),
      },
      {
        name: "desktop_fs_move",
        description:
          "[Filesystem] Move or rename files and directories. Can move files between directories " +
          "and rename them in a single operation. Both source and destination must be " +
          "within allowed directories. Example: {\"source\": \"/home/user/oldname.txt\", " +
          "\"destination\": \"/home/user/documents/newname.txt\"}",
        inputSchema: zodToJsonSchema(MoveFileArgsSchema),
      },
      {
        name: "desktop_fs_search",
        description:
          "[Filesystem] Recursively search for files and directories matching a pattern. " +
          "Searches through all subdirectories from the starting path. Useful for finding files " +
          "by name, extension, or partial text match. Returns absolute paths to all matches. " +
          "Only searches within allowed directories. Example: {\"path\": \"/home/user\", \"pattern\": \".txt\"}",
        inputSchema: zodToJsonSchema(SearchFilesArgsSchema),
      },
      {
        name: "desktop_fs_stat",
        description:
          "[Filesystem] Retrieve detailed metadata about a file or directory including size, " +
          "creation time, last modified time, permissions, and type. Useful for determining file " +
          "characteristics before performing operations. Returns formatted key-value pairs. " +
          "Only works within allowed directories. Example: {\"path\": \"/home/user/document.txt\"}",
        inputSchema: zodToJsonSchema(GetFileInfoArgsSchema),
      },
      {
        name: "desktop_fs_allowed_dirs",
        description: 
          "[Filesystem] Returns the list of directories that this server is allowed to access. " +
          "Use this to determine which locations are available for file operations before " +
          "attempting to access potentially restricted areas. Results include notes about restricted locations.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "desktop_fs_edit_block",
        description:
            "[Filesystem] Apply precise text replacements to files. Best for small to moderate changes (<20% of file size). " +
            "Verifies changes succeeded after application and provides detailed results. Now with enhanced fuzzy matching! " +
            "\n\nFormat requirements:\n" +
            "1. First line: Full path to the file, optionally followed by '::N' where N is the number of expected replacements\n" +
            "   Example: '/path/to/file.txt::3' means expect 3 replacements\n" +
            "2. Second line: The exact string <<<<<<< SEARCH\n" +
            "3. Next lines: The exact text to find (must match exactly, including whitespace)\n" +
            "4. Next line: The exact string =======\n" +
            "5. Next lines: The text to replace with\n" +
            "6. Last line: The exact string >>>>>>> REPLACE\n\n" +
            "Example: {\"blockContent\": \"/path/to/file.txt\\n<<<<<<< SEARCH\\nold text\\n=======\\nnew text\\n>>>>>>> REPLACE\"}" +
            "\n\nBest practices for LLMs:\n" +
            "- Use unique search strings that appear exactly once in the file\n" +
            "- Keep search blocks as short as possible while ensuring uniqueness\n" +
            "- Include enough context to ensure correct placement\n" +
            "- For multiple edits to the same file, use separate function calls to avoid errors\n" +
            "- IMPORTANT: Neither the search nor replace text should contain the marker strings\n" +
            "- Always verify the file after edits to ensure no markers were accidentally left in the file\n" +
            "- When text appears multiple times and you want to replace all instances, add the expected count (e.g., '/path/to/file.txt::5')\n" +
            "- For safety, the default behavior is to only replace when exactly one match is found\n" +
            "- If an exact match isn't found, the tool now provides better suggestions using fuzzy matching",
        inputSchema: zodToJsonSchema(EditBlockArgsSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      // Terminal tools
      case "desktop_cmd_run": {
        const parsed = ExecuteCommandArgsSchema.parse(args);
        return executeCommand(parsed);
      }
      case "desktop_cmd_output": {
        const parsed = ReadOutputArgsSchema.parse(args);
        return readOutput(parsed);
      }
      case "desktop_cmd_terminate": {
        const parsed = ForceTerminateArgsSchema.parse(args);
        return forceTerminate(parsed);
      }
      case "desktop_cmd_list_sessions":
        return listSessions();
      case "desktop_proc_list":
        return listProcesses();
      case "desktop_proc_kill": {
        const parsed = KillProcessArgsSchema.parse(args);
        return killProcess(parsed);
      }
      
      // Command blocking tools removed
      // Internal command validation still happens in executeCommand
      
      // Filesystem tools
      case "desktop_fs_edit_block": {
        const parsed = EditBlockArgsSchema.parse(args);
        const { filePath, searchReplace, expectedReplacements } = await parseEditBlock(parsed.blockContent);
        const result = await performSearchReplace(filePath, searchReplace, expectedReplacements);
        
        // Return more detailed information about the operation
        let responseText = result.message;
        if (result.success && result.matchCount) {
          responseText += `\nFound ${result.matchCount} ${result.matchCount === 1 ? 'occurrence' : 'occurrences'} of the search text.`;
        }
        
        return {
          content: [{ type: "text", text: responseText }],
          isError: !result.success
        };
      }
      case "desktop_fs_read": {
        const parsed = ReadFileArgsSchema.parse(args);
        const content = await readFile(parsed.path);
        return {
          content: [{ type: "text", text: content }],
        };
      }
      case "desktop_fs_write": {
        const parsed = WriteFileArgsSchema.parse(args);
        await writeFile(parsed.path, parsed.content, parsed.options);
        return {
          content: [{ type: "text", text: `Successfully wrote to ${parsed.path}` }],
        };
      }
      case "desktop_fs_mkdir": {
        const parsed = CreateDirectoryArgsSchema.parse(args);
        await createDirectory(parsed.path);
        return {
          content: [{ type: "text", text: `Successfully created directory ${parsed.path}` }],
        };
      }
      case "desktop_fs_list": {
        const parsed = ListDirectoryArgsSchema.parse(args);
        const entries = await listDirectory(parsed.path);
        return {
          content: [{ type: "text", text: entries.join('\n') }],
        };
      }
      case "desktop_fs_move": {
        const parsed = MoveFileArgsSchema.parse(args);
        await moveFile(parsed.source, parsed.destination);
        return {
          content: [{ type: "text", text: `Successfully moved ${parsed.source} to ${parsed.destination}` }],
        };
      }
      case "desktop_fs_search": {
        const parsed = SearchFilesArgsSchema.parse(args);
        const results = await searchFiles(parsed.path, parsed.pattern);
        return {
          content: [{ type: "text", text: results.length > 0 ? results.join('\n') : "No matches found" }],
        };
      }
      case "desktop_fs_stat": {
        const parsed = GetFileInfoArgsSchema.parse(args);
        const info = await getFileInfo(parsed.path);
        return {
          content: [{ 
            type: "text", 
            text: Object.entries(info)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n') 
          }],
        };
      }
      case "desktop_fs_allowed_dirs": {
        const directories = listAllowedDirectories();
        return {
          content: [{ 
            type: "text", 
            text: `Allowed directories:\n${directories.join('\n')}` 
          }],
        };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});