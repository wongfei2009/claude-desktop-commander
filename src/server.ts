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
  MultiEditBlocksArgsSchema,
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
import { parseEditBlock, performSearchReplace, performMultiEdit } from './tools/edit.js';

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
        name: "execute_command",
        description:
          "Execute a terminal command with timeout. Command will continue running in background if it doesn't complete within timeout.",
        inputSchema: zodToJsonSchema(ExecuteCommandArgsSchema),
      },
      {
        name: "read_output",
        description:
          "Read new output from a running terminal session.",
        inputSchema: zodToJsonSchema(ReadOutputArgsSchema),
      },
      {
        name: "force_terminate",
        description:
          "Force terminate a running terminal session.",
        inputSchema: zodToJsonSchema(ForceTerminateArgsSchema),
      },
      {
        name: "list_sessions",
        description:
          "List all active terminal sessions.",
        inputSchema: zodToJsonSchema(ListSessionsArgsSchema),
      },
      {
        name: "list_processes",
        description:
          "List all running processes. Returns process information including PID, " +
          "command name, CPU usage, and memory usage.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "kill_process",
        description:
          "Terminate a running process by PID. Use with caution as this will " +
          "forcefully terminate the specified process.",
        inputSchema: zodToJsonSchema(KillProcessArgsSchema),
      },
      {
        name: "block_command",
        description:
          "Add a command to the blacklist. Once blocked, the command cannot be executed until unblocked.",
        inputSchema: zodToJsonSchema(BlockCommandArgsSchema),
      },
      {
        name: "unblock_command",
        description:
          "Remove a command from the blacklist. Once unblocked, the command can be executed normally.",
        inputSchema: zodToJsonSchema(UnblockCommandArgsSchema),
      },
      {
        name: "list_blocked_commands",
        description:
          "List all currently blocked commands.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      // Filesystem tools
      {
        name: "read_file",
        description:
          "Read the complete contents of a file from the file system. " +
          "Handles various text encodings and provides detailed error messages " +
          "if the file cannot be read. Only works within allowed directories.",
        inputSchema: zodToJsonSchema(ReadFileArgsSchema),
      },
      {
        name: "read_multiple_files",
        description:
          "Read the contents of multiple files simultaneously. " +
          "Each file's content is returned with its path as a reference. " +
          "Failed reads for individual files won't stop the entire operation. " +
          "Only works within allowed directories.",
        inputSchema: zodToJsonSchema(ReadMultipleFilesArgsSchema),
      },
      {
        name: "write_file",
        description:
          "Completely replace file contents. Best for large changes (>20% of file) or when edit_block fails. " +
          "Use with caution as it will overwrite existing files. Only works within allowed directories.",
        inputSchema: zodToJsonSchema(WriteFileArgsSchema),
      },
      {
        name: "create_directory",
        description:
          "Create a new directory or ensure a directory exists. Can create multiple " +
          "nested directories in one operation. Only works within allowed directories.",
        inputSchema: zodToJsonSchema(CreateDirectoryArgsSchema),
      },
      {
        name: "list_directory",
        description:
          "Get a detailed listing of all files and directories in a specified path. " +
          "Results distinguish between files and directories with [FILE] and [DIR] prefixes. " +
          "Only works within allowed directories.",
        inputSchema: zodToJsonSchema(ListDirectoryArgsSchema),
      },
      {
        name: "move_file",
        description:
          "Move or rename files and directories. Can move files between directories " +
          "and rename them in a single operation. Both source and destination must be " +
          "within allowed directories.",
        inputSchema: zodToJsonSchema(MoveFileArgsSchema),
      },
      {
        name: "search_files",
        description:
          "Recursively search for files and directories matching a pattern. " +
          "Searches through all subdirectories from the starting path. " +
          "Only searches within allowed directories.",
        inputSchema: zodToJsonSchema(SearchFilesArgsSchema),
      },
      {
        name: "get_file_info",
        description:
          "Retrieve detailed metadata about a file or directory including size, " +
          "creation time, last modified time, permissions, and type. " +
          "Only works within allowed directories.",
        inputSchema: zodToJsonSchema(GetFileInfoArgsSchema),
      },
      {
        name: "list_allowed_directories",
        description: 
          "Returns the list of directories that this server is allowed to access.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "edit_block",
        description:
            "Apply surgical text replacements to files. Best for small changes (<20% of file size). " +
            "Multiple blocks can be used for separate changes. Will verify changes after application. " +
            "Format: filepath, then <<<<<<< SEARCH, content to find, =======, new content, >>>>>>> REPLACE.",
        inputSchema: zodToJsonSchema(EditBlockArgsSchema),
      },
      {
        name: "multi_edit_blocks",
        description:
            "Apply multiple surgical text edits across multiple files in a single operation. " +
            "Supports different operation types: replace, insertBefore, insertAfter, prepend, append. " +
            "Provides detailed results including success status and match counts for each operation.",
        inputSchema: zodToJsonSchema(MultiEditBlocksArgsSchema),
      },
      // Bulk file operations tools
      {
        name: "bulk_move_files",
        description:
          "Move or rename multiple files in a single operation. Supports batch processing with error handling, " +
          "directory creation, and more. Both source and destination paths must be within allowed directories.",
        inputSchema: zodToJsonSchema(BulkMoveFilesArgsSchema),
      },
      {
        name: "bulk_copy_files",
        description:
          "Copy multiple files in a single operation. Supports batch processing with error handling, " +
          "directory creation, and more. Both source and destination paths must be within allowed directories.",
        inputSchema: zodToJsonSchema(BulkCopyFilesArgsSchema),
      },
      {
        name: "bulk_delete_files",
        description:
          "Delete multiple files in a single operation. Supports batch processing with recursive deletion, " +
          "error handling, and detailed reporting. All paths must be within allowed directories.",
        inputSchema: zodToJsonSchema(BulkDeleteFilesArgsSchema),
      },
      {
        name: "bulk_rename_files",
        description:
          "Rename multiple files in a single operation. Supports batch processing with error handling, " +
          "file extension preservation, and more. All files must be within allowed directories.",
        inputSchema: zodToJsonSchema(BulkRenameFilesArgsSchema),
      },
      {
        name: "find_and_replace_filenames",
        description:
          "Search and replace text in multiple filenames. Supports recursive directory traversal, " +
          "regex patterns, case sensitivity, and dry runs. All operations within allowed directories.",
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
      case "execute_command": {
        const parsed = ExecuteCommandArgsSchema.parse(args);
        return executeCommand(parsed);
      }
      case "read_output": {
        const parsed = ReadOutputArgsSchema.parse(args);
        return readOutput(parsed);
      }
      case "force_terminate": {
        const parsed = ForceTerminateArgsSchema.parse(args);
        return forceTerminate(parsed);
      }
      case "list_sessions":
        return listSessions();
      case "list_processes":
        return listProcesses();
      case "kill_process": {
        const parsed = KillProcessArgsSchema.parse(args);
        return killProcess(parsed);
      }
      case "block_command": {
        const parsed = BlockCommandArgsSchema.parse(args);
        const blockResult = await commandManager.blockCommand(parsed.command);
        return {
          content: [{ type: "text", text: blockResult }],
        };
      }
      case "unblock_command": {
        const parsed = UnblockCommandArgsSchema.parse(args);
        const unblockResult = await commandManager.unblockCommand(parsed.command);
        return {
          content: [{ type: "text", text: unblockResult }],
        };
      }
      case "list_blocked_commands": {
        const blockedCommands = await commandManager.listBlockedCommands();
        return {
          content: [{ type: "text", text: blockedCommands.join('\n') }],
        };
      }
      
      // Filesystem tools
      case "edit_block": {
        const parsed = EditBlockArgsSchema.parse(args);
        const { filePath, searchReplace } = await parseEditBlock(parsed.blockContent);
        await performSearchReplace(filePath, searchReplace);
        return {
          content: [{ type: "text", text: `Successfully applied edit to ${filePath}` }],
        };
      }
      case "read_file": {
        const parsed = ReadFileArgsSchema.parse(args);
        const content = await readFile(parsed.path);
        return {
          content: [{ type: "text", text: content }],
        };
      }
      case "read_multiple_files": {
        const parsed = ReadMultipleFilesArgsSchema.parse(args);
        const results = await readMultipleFiles(parsed.paths);
        return {
          content: [{ type: "text", text: results.join("\n---\n") }],
        };
      }
      case "write_file": {
        const parsed = WriteFileArgsSchema.parse(args);
        await writeFile(parsed.path, parsed.content);
        return {
          content: [{ type: "text", text: `Successfully wrote to ${parsed.path}` }],
        };
      }
      case "create_directory": {
        const parsed = CreateDirectoryArgsSchema.parse(args);
        await createDirectory(parsed.path);
        return {
          content: [{ type: "text", text: `Successfully created directory ${parsed.path}` }],
        };
      }
      case "list_directory": {
        const parsed = ListDirectoryArgsSchema.parse(args);
        const entries = await listDirectory(parsed.path);
        return {
          content: [{ type: "text", text: entries.join('\n') }],
        };
      }
      case "move_file": {
        const parsed = MoveFileArgsSchema.parse(args);
        await moveFile(parsed.source, parsed.destination);
        return {
          content: [{ type: "text", text: `Successfully moved ${parsed.source} to ${parsed.destination}` }],
        };
      }
      case "search_files": {
        const parsed = SearchFilesArgsSchema.parse(args);
        const results = await searchFiles(parsed.path, parsed.pattern);
        return {
          content: [{ type: "text", text: results.length > 0 ? results.join('\n') : "No matches found" }],
        };
      }
      case "get_file_info": {
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
      case "list_allowed_directories": {
        const directories = listAllowedDirectories();
        return {
          content: [{ 
            type: "text", 
            text: `Allowed directories:\n${directories.join('\n')}` 
          }],
        };
      }
      case "multi_edit_blocks": {
        const parsed = MultiEditBlocksArgsSchema.parse(args);
        const result = await performMultiEdit(parsed.edits, parsed.options);
        
        let detailedResults = '';
        for (const fileResult of result.editResults) {
          detailedResults += `File: ${fileResult.filepath} - ${fileResult.success ? 'Success' : 'Failed'}\n`;
          if (fileResult.error) {
            detailedResults += `  Error: ${fileResult.error}\n`;
          }
          
          for (const opResult of fileResult.operationResults) {
            detailedResults += `  Operation ${opResult.index}: ${opResult.success ? 'Success' : 'Failed'}`;
            if (opResult.matchCount) {
              detailedResults += ` (${opResult.matchCount} matches)`;
            }
            if (opResult.error) {
              detailedResults += ` - Error: ${opResult.error}`;
            }
            detailedResults += '\n';
          }
        }
        
        return {
          content: [{ 
            type: "text", 
            text: `Multi-edit operation ${result.success ? 'completed successfully' : 'completed with errors'}${result.dryRun ? ' (DRY RUN)' : ''}\n\n${detailedResults}` 
          }],
          isError: !result.success,
        };
      }
      
      // Bulk file operations tools
      case "bulk_move_files": {
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
      
      case "bulk_copy_files": {
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
      
      case "bulk_delete_files": {
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
      
      case "bulk_rename_files": {
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
      
      case "find_and_replace_filenames": {
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