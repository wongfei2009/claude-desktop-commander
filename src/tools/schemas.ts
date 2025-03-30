import { z } from "zod";

// Terminal tools schemas
export const ExecuteCommandArgsSchema = z.object({
  command: z.string(),
  timeout_ms: z.number().optional(),
});

export const ReadOutputArgsSchema = z.object({
  pid: z.number(),
});

export const ForceTerminateArgsSchema = z.object({
  pid: z.number(),
});

export const ListSessionsArgsSchema = z.object({});

export const KillProcessArgsSchema = z.object({
  pid: z.number(),
});

export const BlockCommandArgsSchema = z.object({
  command: z.string(),
});

export const UnblockCommandArgsSchema = z.object({
  command: z.string(),
});

// Filesystem tools schemas
export const ReadFileArgsSchema = z.object({
  path: z.string(),
});

export const ReadMultipleFilesArgsSchema = z.object({
  paths: z.array(z.string()),
});

export const WriteFileArgsSchema = z.object({
  path: z.string(),
  content: z.string(),
});

export const CreateDirectoryArgsSchema = z.object({
  path: z.string(),
});

export const ListDirectoryArgsSchema = z.object({
  path: z.string(),
});

export const MoveFileArgsSchema = z.object({
  source: z.string(),
  destination: z.string(),
});

export const SearchFilesArgsSchema = z.object({
  path: z.string(),
  pattern: z.string(),
});

export const GetFileInfoArgsSchema = z.object({
  path: z.string(),
});

// Edit tools schemas
export const EditBlockArgsSchema = z.object({
  blockContent: z.string(),
});

// Multi-block editing schema
export const MultiEditBlocksArgsSchema = z.object({
  edits: z.array(
    z.object({
      filepath: z.string(),
      operations: z.array(
        z.object({
          type: z.enum(['replace', 'insertBefore', 'insertAfter', 'prepend', 'append']),
          search: z.string().optional(),
          replace: z.string().optional(),
          lineNumber: z.number().optional(),
          content: z.string().optional(),
        })
      )
    })
  ),
  options: z.object({
    dryRun: z.boolean().optional().default(false),
    caseSensitive: z.boolean().optional().default(true),
    allOccurrences: z.boolean().optional().default(false),
  }).optional(),
});