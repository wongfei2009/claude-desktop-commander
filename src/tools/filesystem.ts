import * as fs from "fs/promises";
import { createReadStream, createWriteStream, readdirSync } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import os from 'os';

// Store allowed directories
const allowedDirectories: string[] = [
    process.cwd(), // Current working directory
];

// Add home directory subfolders but exclude Desktop
const homeDir = os.homedir();
const desktopDir = path.join(homeDir, 'Desktop');

// Function to add directory to allowed list
function addAllowedDirectory(dir: string) {
    // Normalize paths for consistent comparison
    const normalizedDir = normalizePath(dir);
    const normalizedDesktop = normalizePath(desktopDir);
    
    // Only add if it's not the Desktop folder
    if (!normalizedDir.startsWith(normalizedDesktop)) {
        allowedDirectories.push(dir);
    }
}

// Add home directory to allowed directories
addAllowedDirectory(homeDir);

// For testing, add temp directory and any directories created for tests
addAllowedDirectory(os.tmpdir());

// Also add subdirectories of the temp directory (for tests)
const isTesting = process.env.NODE_ENV === 'test' || process.argv.includes('test');

// In test mode, we'll set up testing directories later using setupTestTempDirectories()
// This separation keeps config logic out of the validation function
if (isTesting) {
  console.log("Running in test mode - use setupTestTempDirectories() to configure test directories");
}

// Helper function for tests to add allowed directories dynamically
export function addTestDirectory(dir: string) {
  // Normalize the directory path
  const expandedPath = expandHome(dir);
  const absolute = path.isAbsolute(expandedPath)
    ? path.resolve(expandedPath)
    : path.resolve(process.cwd(), expandedPath);
    
  // Ensure both the directory and any parent directories are allowed
  // This is essential for tests that create nested directories
  addAllowedDirectory(absolute);
  
  // Also add parent directory for tests
  const parentDir = path.dirname(absolute);
  console.log(`Also adding parent test directory: ${parentDir}`);
  addAllowedDirectory(parentDir);
  
  // Special handling for temp directories with 'claude-desktop-commander'
  if (absolute.includes(os.tmpdir()) && absolute.includes('claude-desktop-commander')) {
    console.log(`Adding test temp directory: ${absolute}`);
    
    // Check if temp dir parent path needs to be added too
    const tmpDir = os.tmpdir();
    if (!allowedDirectories.includes(tmpDir)) {
      console.log(`Adding temp directory to allowed list: ${tmpDir}`);
      addAllowedDirectory(tmpDir);
    }
  }
  
  // Check if this directory is already in our allowed list in some form
  const normalizedDir = normalizePath(absolute);
  const isAlreadyTracked = allowedDirectories.some(
    allowed => normalizedDir.startsWith(normalizePath(allowed))
  );
  
  if (!isAlreadyTracked) {
    console.error(`Warning: Directory ${absolute} is not within any allowed directory`);
  }
  
  // Log current allowed directories for debugging
  console.log(`Added test directory: ${absolute}`);
  console.log(`Current allowed directories: ${allowedDirectories.join(', ')}`);
}

/**
 * Adds all test directories that match a specific pattern within the temp directory.
 * This should be called during test setup to ensure all test directories are properly allowed.
 */
export function setupTestTempDirectories() {
  const tempDir = os.tmpdir();
  console.log(`Setting up test directories in temp: ${tempDir}`);
  
  // Add temp directory itself
  addAllowedDirectory(tempDir);
  
  // List existing temp directories that might be test directories
  try {
    const tempContents = readdirSync(tempDir);
    const testDirs = tempContents.filter((name: string) => name.includes('claude-desktop-commander'));
    
    for (const dir of testDirs) {
      const fullPath = path.join(tempDir, dir);
      console.log(`Adding existing test directory: ${fullPath}`);
      addAllowedDirectory(fullPath);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error scanning temp directory: ${errorMessage}`);
  }
}

// Normalize all paths consistently
function normalizePath(p: string): string {
    return path.normalize(p).toLowerCase();
}

function expandHome(filepath: string): string {
    if (filepath.startsWith('~/') || filepath === '~') {
        return path.join(os.homedir(), filepath.slice(1));
    }
    return filepath;
}

// Security utilities
export async function validatePath(requestedPath: string): Promise<string> {
    const expandedPath = expandHome(requestedPath);
    const absolute = path.isAbsolute(expandedPath)
        ? path.resolve(expandedPath)
        : path.resolve(process.cwd(), expandedPath);
        
    const normalizedRequested = normalizePath(absolute);
    const normalizedDesktop = normalizePath(path.join(os.homedir(), 'Desktop'));

    // Explicitly check for Desktop folder access
    if (normalizedRequested.startsWith(normalizedDesktop)) {
        throw new Error(`Access denied - Desktop folder is restricted: ${absolute}`);
    }

    // Check if path is within allowed directories
    const isAllowed = allowedDirectories.some(dir => {
        const normalizedDir = normalizePath(dir);
        return normalizedRequested.startsWith(normalizedDir);
    });
    
    if (!isAllowed) {
        console.error(`Path validation failed: ${absolute}`);
        console.error(`Allowed directories: ${allowedDirectories.join(', ')}`);
        throw new Error(`Access denied - path outside allowed directories: ${absolute}`);
    }

    // Handle symlinks by checking their real path
    try {
        const realPath = await fs.realpath(absolute);
        const normalizedReal = normalizePath(realPath);
        
        // Check if symlink resolves to Desktop
        if (normalizedReal.startsWith(normalizedDesktop)) {
            throw new Error("Access denied - symlink target resolves to restricted Desktop folder");
        }
        
        const isRealPathAllowed = allowedDirectories.some(dir => normalizedReal.startsWith(normalizePath(dir)));
        if (!isRealPathAllowed) {
            throw new Error("Access denied - symlink target outside allowed directories");
        }
        return realPath;
    } catch (error) {
        // For new files that don't exist yet, verify parent directory
        const parentDir = path.dirname(absolute);
        try {
            const realParentPath = await fs.realpath(parentDir);
            const normalizedParent = normalizePath(realParentPath);
            
            // Check if parent directory is Desktop
            if (normalizedParent.startsWith(normalizedDesktop)) {
                throw new Error("Access denied - parent directory is restricted Desktop folder");
            }
            
            const isParentAllowed = allowedDirectories.some(dir => normalizedParent.startsWith(normalizePath(dir)));
            
            if (!isParentAllowed) {
                throw new Error("Access denied - parent directory outside allowed directories");
            }
            return absolute;
        } catch (error) {
            if (process.env.NODE_ENV === 'test' || process.argv.includes('test')) {
                // More detailed error for tests
                console.error(`Parent directory error: ${parentDir}`, error);
            }
            throw new Error(`Parent directory does not exist: ${parentDir}`);
        }
    }
}

// File operation tools
export async function readFile(filePath: string): Promise<string> {
    const validPath = await validatePath(filePath);
    return fs.readFile(validPath, "utf-8");
}

export async function writeFile(filePath: string, content: string): Promise<void> {
    const validPath = await validatePath(filePath);
    await fs.writeFile(validPath, content, "utf-8");
}

export async function readMultipleFiles(paths: string[]): Promise<string[]> {
    return Promise.all(
        paths.map(async (filePath: string) => {
            try {
                const validPath = await validatePath(filePath);
                const content = await fs.readFile(validPath, "utf-8");
                return `${filePath}:\n${content}\n`;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return `${filePath}: Error - ${errorMessage}`;
            }
        }),
    );
}

export async function createDirectory(dirPath: string): Promise<void> {
    const validPath = await validatePath(dirPath);
    await fs.mkdir(validPath, { recursive: true });
}

export async function listDirectory(dirPath: string): Promise<string[]> {
    const validPath = await validatePath(dirPath);
    const entries = await fs.readdir(validPath, { withFileTypes: true });
    return entries.map((entry) => `${entry.isDirectory() ? "[DIR]" : "[FILE]"} ${entry.name}`);
}

export async function moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    const validSourcePath = await validatePath(sourcePath);
    const validDestPath = await validatePath(destinationPath);
    await fs.rename(validSourcePath, validDestPath);
}

export async function searchFiles(rootPath: string, pattern: string): Promise<string[]> {
    const results: string[] = [];

    async function search(currentPath: string) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            
            try {
                await validatePath(fullPath);

                if (entry.name.toLowerCase().includes(pattern.toLowerCase())) {
                    results.push(fullPath);
                }

                if (entry.isDirectory()) {
                    await search(fullPath);
                }
            } catch (error) {
                continue;
            }
        }
    }

    const validPath = await validatePath(rootPath);
    await search(validPath);
    return results;
}

export async function getFileInfo(filePath: string): Promise<Record<string, any>> {
    const validPath = await validatePath(filePath);
    const stats = await fs.stat(validPath);
    
    return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        permissions: stats.mode.toString(8).slice(-3),
    };
}

export function listAllowedDirectories(): string[] {
    return [
        ...allowedDirectories,
        `RESTRICTED: ${path.join(os.homedir(), 'Desktop')} (Desktop access is disabled)`
    ];
}

// Bulk operations result interface
interface BulkOperationResult {
  success: boolean;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  errors: Array<{ path: string; error: string }>;
  details: string[];
  options?: Record<string, any>;
}

// Copy implementation using streams for efficiency
async function copyFile(source: string, destination: string): Promise<void> {
  const readStream = createReadStream(source);
  const writeStream = createWriteStream(destination);
  await pipeline(readStream, writeStream);
}

// Bulk move files operation
export async function bulkMoveFiles(
  operations: Array<{ source: string; destination: string }>,
  options: { createDirectories?: boolean; skipErrors?: boolean; overwrite?: boolean } = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    totalOperations: operations.length,
    successfulOperations: 0,
    failedOperations: 0,
    errors: [],
    details: [],
  };

  for (const op of operations) {
    try {
      const validSourcePath = await validatePath(op.source);
      const validDestPath = await validatePath(op.destination);
      
      // Check if destination directory exists
      const destDir = path.dirname(validDestPath);
      let destDirExists = false;
      
      try {
        await fs.access(destDir);
        destDirExists = true;
      } catch {
        destDirExists = false;
      }
      
      // Create destination directory if needed
      if (!destDirExists && options.createDirectories) {
        await fs.mkdir(destDir, { recursive: true });
      }
      
      // Check if destination already exists
      let destExists = false;
      try {
        await fs.access(validDestPath);
        destExists = true;
      } catch {
        destExists = false;
      }
      
      // Handle existing destination
      if (destExists) {
        if (!options.overwrite) {
          throw new Error(`Destination already exists: ${op.destination}`);
        }
        
        // Remove the destination if overwriting
        await fs.unlink(validDestPath);
      }
      
      // Perform the move
      await fs.rename(validSourcePath, validDestPath);
      
      result.successfulOperations++;
      result.details.push(`✓ Moved ${op.source} to ${op.destination}`);
    } catch (error) {
      result.failedOperations++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({ path: op.source, error: errorMessage });
      result.details.push(`✗ Failed to move ${op.source} to ${op.destination}: ${errorMessage}`);
      
      if (!options.skipErrors) {
        result.success = false;
        break;
      }
    }
  }
  
  return result;
}

// Bulk copy files operation
export async function bulkCopyFiles(
  operations: Array<{ source: string; destination: string }>,
  options: { createDirectories?: boolean; skipErrors?: boolean; overwrite?: boolean } = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    totalOperations: operations.length,
    successfulOperations: 0,
    failedOperations: 0,
    errors: [],
    details: [],
  };

  for (const op of operations) {
    try {
      const validSourcePath = await validatePath(op.source);
      const validDestPath = await validatePath(op.destination);
      
      // Check if source is a directory
      const sourceStat = await fs.stat(validSourcePath);
      if (sourceStat.isDirectory()) {
        throw new Error(`Source is a directory: ${op.source}. Use bulkCopyDirectories for directories.`);
      }
      
      // Check if destination directory exists
      const destDir = path.dirname(validDestPath);
      let destDirExists = false;
      
      try {
        await fs.access(destDir);
        destDirExists = true;
      } catch {
        destDirExists = false;
      }
      
      // Create destination directory if needed
      if (!destDirExists && options.createDirectories) {
        await fs.mkdir(destDir, { recursive: true });
      }
      
      // Check if destination already exists
      let destExists = false;
      try {
        await fs.access(validDestPath);
        destExists = true;
      } catch {
        destExists = false;
      }
      
      // Handle existing destination
      if (destExists && !options.overwrite) {
        throw new Error(`Destination already exists: ${op.destination}`);
      }
      
      // Perform the copy
      await copyFile(validSourcePath, validDestPath);
      
      result.successfulOperations++;
      result.details.push(`✓ Copied ${op.source} to ${op.destination}`);
    } catch (error) {
      result.failedOperations++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({ path: op.source, error: errorMessage });
      result.details.push(`✗ Failed to copy ${op.source} to ${op.destination}: ${errorMessage}`);
      
      if (!options.skipErrors) {
        result.success = false;
        break;
      }
    }
  }
  
  return result;
}

// Bulk delete files operation
export async function bulkDeleteFiles(
  paths: string[],
  options: { recursive?: boolean; skipErrors?: boolean } = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    totalOperations: paths.length,
    successfulOperations: 0,
    failedOperations: 0,
    errors: [],
    details: [],
  };

  for (const filePath of paths) {
    try {
      const validPath = await validatePath(filePath);
      
      // Check if path is a directory
      const stat = await fs.stat(validPath);
      if (stat.isDirectory()) {
        if (!options.recursive) {
          throw new Error(`Path is a directory: ${filePath}. Set recursive option to delete directories.`);
        }
        await fs.rm(validPath, { recursive: true, force: true });
      } else {
        await fs.unlink(validPath);
      }
      
      result.successfulOperations++;
      result.details.push(`✓ Deleted ${filePath}`);
    } catch (error) {
      result.failedOperations++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({ path: filePath, error: errorMessage });
      result.details.push(`✗ Failed to delete ${filePath}: ${errorMessage}`);
      
      if (!options.skipErrors) {
        result.success = false;
        break;
      }
    }
  }
  
  return result;
}

// Bulk rename files operation
export async function bulkRenameFiles(
  operations: Array<{ source: string; newName: string }>,
  options: { skipErrors?: boolean; overwrite?: boolean, preserveExtension?: boolean } = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    totalOperations: operations.length,
    successfulOperations: 0,
    failedOperations: 0,
    errors: [],
    details: [],
  };

  for (const op of operations) {
    try {
      const validSourcePath = await validatePath(op.source);
      
      // Get source directory and create destination path
      const sourceDir = path.dirname(validSourcePath);
      let destName = op.newName;
      
      // Handle file extension preservation if needed
      if (options.preserveExtension !== false) {
        const sourceExt = path.extname(validSourcePath);
        const newNameExt = path.extname(op.newName);
        
        // If source has extension but new name doesn't, add the source extension
        if (sourceExt && !newNameExt) {
          destName = `${op.newName}${sourceExt}`;
        }
      }
      
      const destPath = path.join(sourceDir, destName);
      const validDestPath = await validatePath(destPath);
      
      // Check if destination already exists
      let destExists = false;
      try {
        await fs.access(validDestPath);
        destExists = true;
      } catch {
        destExists = false;
      }
      
      // Handle existing destination
      if (destExists && !options.overwrite) {
        throw new Error(`Destination already exists: ${destPath}`);
      }
      
      // Perform the rename
      await fs.rename(validSourcePath, validDestPath);
      
      result.successfulOperations++;
      result.details.push(`✓ Renamed ${op.source} to ${destName}`);
    } catch (error) {
      result.failedOperations++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({ path: op.source, error: errorMessage });
      result.details.push(`✗ Failed to rename ${op.source} to ${op.newName}: ${errorMessage}`);
      
      if (!options.skipErrors) {
        result.success = false;
        break;
      }
    }
  }
  
  return result;
}

// Find and replace in filenames
export async function findAndReplaceFilenames(
  directory: string,
  pattern: string,
  replacement: string,
  options: {
    recursive?: boolean;
    regex?: boolean;
    caseSensitive?: boolean;
    skipErrors?: boolean;
    overwrite?: boolean;
    dryRun?: boolean;
    preserveExtension?: boolean;
  } = {}
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    errors: [],
    details: [],
    options: options,
  };
  
  // Validate the directory path
  const validDirPath = await validatePath(directory);
  
  // Get all entries
  const entries = await fs.readdir(validDirPath, { withFileTypes: true });
  const renameOperations: Array<{ source: string; newName: string }> = [];
  
  // Process each entry
  for (const entry of entries) {
    const entryPath = path.join(validDirPath, entry.name);
    
    // Skip directories if not recursive
    if (entry.isDirectory() && !options.recursive) {
      continue;
    }
    
    // Process directory recursively if specified
    if (entry.isDirectory() && options.recursive) {
      const subDirResult = await findAndReplaceFilenames(
        entryPath,
        pattern,
        replacement,
        options
      );
      
      // Combine results
      result.totalOperations += subDirResult.totalOperations;
      result.successfulOperations += subDirResult.successfulOperations;
      result.failedOperations += subDirResult.failedOperations;
      result.errors.push(...subDirResult.errors);
      result.details.push(...subDirResult.details);
      
      continue;
    }
    
    // Process this entry's filename
    let newName: string;
    
    if (options.regex) {
      // Handle regex pattern
      const flags = options.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      newName = entry.name.replace(regex, replacement);
    } else {
      // Handle simple string replacement
      if (options.caseSensitive) {
        newName = entry.name.split(pattern).join(replacement);
      } else {
        const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedPattern, 'gi');
        newName = entry.name.replace(regex, replacement);
      }
    }
    
    // If name didn't change, skip
    if (newName === entry.name) {
      continue;
    }
    
    result.totalOperations++;
    
    // Add to rename operations
    renameOperations.push({
      source: entryPath,
      newName: newName,
    });
  }
  
  // If dry run, just return what would happen
  if (options.dryRun) {
    for (const op of renameOperations) {
      result.details.push(`[DRY RUN] Would rename ${path.basename(op.source)} to ${op.newName}`);
      result.successfulOperations++;
    }
    return result;
  }
  
  // Perform the actual renames
  if (renameOperations.length > 0) {
    const renameResult = await bulkRenameFiles(renameOperations, {
      skipErrors: options.skipErrors,
      overwrite: options.overwrite,
      preserveExtension: options.preserveExtension,
    });
    
    // Combine results
    result.successfulOperations = renameResult.successfulOperations;
    result.failedOperations = renameResult.failedOperations;
    result.errors = renameResult.errors;
    result.details = renameResult.details;
    result.success = renameResult.success;
  }
  
  return result;
}