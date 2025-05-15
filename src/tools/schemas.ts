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

// Simplified WriteFileArgsSchema - removed nested options object
export const WriteFileArgsSchema = z.object({
  path: z.string(),
  content: z.string(),
});

// Schema for chunked file writing to handle large files
export const WriteFileChunkArgsSchema = z.object({
  path: z.string(),
  chunk: z.string(),
  chunkIndex: z.number(),
  totalChunks: z.number(),
  isAppend: z.boolean().optional().default(true),
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

// Updated Edit tools schemas with support for expected replacements
export const EditBlockArgsSchema = z.object({
  blockContent: z.string(),
  expectedReplacements: z.number().optional(),
});

// Bulk file operations schemas removed