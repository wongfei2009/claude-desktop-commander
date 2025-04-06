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
  BlockCommandArgsSchema,
  UnblockCommandArgsSchema,
  ReadFileArgsSchema,
  ReadMultipleFilesArgsSchema,
  WriteFileArgsSchema,
  CreateDirectoryArgsSchema,
  ListDirectoryArgsSchema,
  MoveFileArgsSchema,
  SearchFilesArgsSchema,
  GetFileInfoArgsSchema,
  EditBlockArgsSchema,
  BulkMoveFilesArgsSchema,
  BulkCopyFilesArgsSchema,
  BulkDeleteFilesArgsSchema,
  BulkRenameFilesArgsSchema,
  FindAndReplaceFilenamesArgsSchema,
} from './tools/schemas.js';
import { executeCommand, readOutput, forceTerminate, listSessions } from './tools/execute.js';
import { listProcesses, killProcess } from './tools/process.js';
import {
  readFile,
  readMultipleFiles,
  writeFile,
  createDirectory,
  listDirectory,
  moveFile,
  searchFiles,
  getFileInfo,
  listAllowedDirectories,
  bulkMoveFiles,
  bulkCopyFiles,
  bulkDeleteFiles,
  bulkRenameFiles,
  findAndReplaceFilenames,
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
      {
        name: "desktop_cmd_block",
        description:
          "Add a command to the blacklist. Once blocked, the command cannot be executed until unblocked. " +
          "Useful for preventing potentially dangerous commands from being run. Example: {\"command\": \"rm -rf\"}",
        inputSchema: zodToJsonSchema(BlockCommandArgsSchema),
      },
      {
        name: "desktop_cmd_unblock",
        description:
          "Remove a command from the blacklist. Once unblocked, the command can be executed normally. " +
          "Use this to restore functionality for commands that were previously blocked. Example: {\"command\": \"rm -rf\"}",
        inputSchema: zodToJsonSchema(UnblockCommandArgsSchema),
      },
      {
        name: "desktop_cmd_list_blocked",
        description:
          "List all currently blocked commands. Returns a newline-separated list of commands " +
          "that have been blocked using desktop_cmd_block. Useful for reviewing " +
          "security restrictions before executing commands.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
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
        name: "desktop_fs_read_batch",
        description:
          "[Filesystem] Read the contents of multiple files simultaneously. " +
          "Each file's content is returned with its path as a reference. " +
          "Failed reads for individual files won't stop the entire operation. " +
          "More efficient than multiple individual reads for analyzing multiple files. " +
          "Only works within allowed directories. Example: {\"paths\": [\"/home/user/file1.txt\", \"/home/user/file2.txt\"]}",
        inputSchema: zodToJsonSchema(ReadMultipleFilesArgsSchema),
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
            "Verifies changes succeeded after application and provides detailed results. " +
            "\n\nFormat requirements:\n" +
            "1. First line: Full path to the file\n" +
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
            "- IMPORTANT: Neither the search nor replace text should contain the marker strings (<<<<<<< SEARCH, =======, >>>>>>> REPLACE)\n" +
            "- Always verify the file after edits to ensure no markers were accidentally left in the file",
        inputSchema: zodToJsonSchema(EditBlockArgsSchema),
      },
      // Bulk file operations tools
      {
        name: "desktop_fs_move_batch",
        description:
          "[Filesystem] Move or rename multiple files in a single operation. More efficient than individual move operations " +
          "for handling many files. Supports error handling (with skipErrors option), automatic directory " +
          "creation, and detailed reporting. Both source and destination paths must be within allowed directories. " +
          "Example: {\"operations\": [{\"source\": \"/path1\", \"destination\": \"/newpath1\"}, " +
          "{\"source\": \"/path2\", \"destination\": \"/newpath2\"}]}",
        inputSchema: zodToJsonSchema(BulkMoveFilesArgsSchema),
      },
      {
        name: "desktop_fs_copy_batch",
        description:
          "[Filesystem] Copy multiple files in a single operation. Preserves original files while creating duplicates " +
          "at new locations. Supports error handling (with skipErrors option), automatic directory creation, " +
          "and detailed reporting. Both source and destination paths must be within allowed directories. " +
          "Example: {\"operations\": [{\"source\": \"/path1\", \"destination\": \"/newpath1\"}, " +
          "{\"source\": \"/path2\", \"destination\": \"/newpath2\"}]}",
        inputSchema: zodToJsonSchema(BulkCopyFilesArgsSchema),
      },
      {
        name: "desktop_fs_delete_batch",
        description:
          "[Filesystem] Delete multiple files in a single operation. USE WITH CAUTION as deleted files cannot be recovered. " +
          "Supports recursive deletion (for directories), error handling, and detailed reporting. " +
          "All paths must be within allowed directories. " +
          "Example: {\"paths\": [\"/path/to/file1.txt\", \"/path/to/file2.txt\"], \"options\": {\"recursive\": false, \"skipErrors\": true}}",
        inputSchema: zodToJsonSchema(BulkDeleteFilesArgsSchema),
      },
      {
        name: "desktop_fs_rename_batch",
        description:
          "[Filesystem] Rename multiple files in a single operation. Changes filenames while keeping files in " +
          "their original directories. Supports error handling, file extension preservation (by default), " +
          "and detailed reporting. All files must be within allowed directories. " +
          "Example: {\"operations\": [{\"source\": \"/path/file1.txt\", \"newName\": \"newfile1.txt\"}]}",
        inputSchema: zodToJsonSchema(BulkRenameFilesArgsSchema),
      },
      {
        name: "desktop_fs_rename_pattern",
        description:
          "[Filesystem] Search and replace text in multiple filenames. Useful for batch renaming files with " +
          "similar naming patterns. Supports recursive directory traversal, regex patterns, case sensitivity, " +
          "and dry runs (to preview changes before applying). All operations within allowed directories. " +
          "Example: {\"directory\": \"/home/photos\", \"pattern\": \"IMG_\", \"replacement\": \"Vacation2023_\"}",
        inputSchema: zodToJsonSchema(FindAndReplaceFilenamesArgsSchema),
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
      case "desktop_cmd_block": {
        const parsed = BlockCommandArgsSchema.parse(args);
        const blockResult = await commandManager.blockCommand(parsed.command);
        return {
          content: [{ type: "text", text: blockResult }],
        };
      }
      case "desktop_cmd_unblock": {
        const parsed = UnblockCommandArgsSchema.parse(args);
        const unblockResult = await commandManager.unblockCommand(parsed.command);
        return {
          content: [{ type: "text", text: unblockResult }],
        };
      }
      case "desktop_cmd_list_blocked": {
        const blockedCommands = await commandManager.listBlockedCommands();
        return {
          content: [{ type: "text", text: blockedCommands.join('\n') }],
        };
      }
      
      // Filesystem tools
      case "desktop_fs_edit_block": {
        const parsed = EditBlockArgsSchema.parse(args);
        const { filePath, searchReplace } = await parseEditBlock(parsed.blockContent);
        const result = await performSearchReplace(filePath, searchReplace);
        
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
      case "desktop_fs_read_batch": {
        const parsed = ReadMultipleFilesArgsSchema.parse(args);
        const results = await readMultipleFiles(parsed.paths);
        return {
          content: [{ type: "text", text: results.join("\n---\n") }],
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
      
      // Bulk file operations tools
      case "desktop_fs_move_batch": {
        const parsed = BulkMoveFilesArgsSchema.parse(args);
        const result = await bulkMoveFiles(parsed.operations, parsed.options);
        
        const summary = `Bulk move operation ${result.success ? 'completed successfully' : 'completed with errors'}
Total: ${result.totalOperations}
Successful: ${result.successfulOperations}
Failed: ${result.failedOperations}

Details:
${result.details.join('\n')}`;
        
        return {
          content: [{ type: "text", text: summary }],
          isError: !result.success,
        };
      }
      
      case "desktop_fs_copy_batch": {
        const parsed = BulkCopyFilesArgsSchema.parse(args);
        const result = await bulkCopyFiles(parsed.operations, parsed.options);
        
        const summary = `Bulk copy operation ${result.success ? 'completed successfully' : 'completed with errors'}
Total: ${result.totalOperations}
Successful: ${result.successfulOperations}
Failed: ${result.failedOperations}

Details:
${result.details.join('\n')}`;
        
        return {
          content: [{ type: "text", text: summary }],
          isError: !result.success,
        };
      }
      
      case "desktop_fs_delete_batch": {
        const parsed = BulkDeleteFilesArgsSchema.parse(args);
        const result = await bulkDeleteFiles(parsed.paths, parsed.options);
        
        const summary = `Bulk delete operation ${result.success ? 'completed successfully' : 'completed with errors'}
Total: ${result.totalOperations}
Successful: ${result.successfulOperations}
Failed: ${result.failedOperations}

Details:
${result.details.join('\n')}`;
        
        return {
          content: [{ type: "text", text: summary }],
          isError: !result.success,
        };
      }
      
      case "desktop_fs_rename_batch": {
        const parsed = BulkRenameFilesArgsSchema.parse(args);
        const result = await bulkRenameFiles(parsed.operations, parsed.options);
        
        const summary = `Bulk rename operation ${result.success ? 'completed successfully' : 'completed with errors'}
Total: ${result.totalOperations}
Successful: ${result.successfulOperations}
Failed: ${result.failedOperations}

Details:
${result.details.join('\n')}`;
        
        return {
          content: [{ type: "text", text: summary }],
          isError: !result.success,
        };
      }
      
      case "desktop_fs_rename_pattern": {
        const parsed = FindAndReplaceFilenamesArgsSchema.parse(args);
        const result = await findAndReplaceFilenames(
          parsed.directory,
          parsed.pattern,
          parsed.replacement,
          parsed.options
        );
        
        const summary = `Find and replace filename operation ${result.success ? 'completed successfully' : 'completed with errors'}${parsed.options?.dryRun ? ' (DRY RUN)' : ''}
Total: ${result.totalOperations}
Successful: ${result.successfulOperations}
Failed: ${result.failedOperations}

Details:
${result.details.join('\n')}`;
        
        return {
          content: [{ type: "text", text: summary }],
          isError: !result.success,
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