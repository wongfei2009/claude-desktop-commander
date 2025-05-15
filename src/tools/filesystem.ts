import * as fs from "fs/promises";
import { readdirSync, existsSync } from "fs";
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
            throw new Error(`Directory does not exist: ${parentDir}. Create it first.`);
        }
    }
}

/**
 * Recursively validates parent directories until it finds a valid one
 * 
 * @param directoryPath The path to validate
 * @returns Promise<boolean> True if a valid parent directory was found
 */
async function validateParentDirectories(directoryPath: string): Promise<boolean> {
    const parentDir = path.dirname(directoryPath);
    
    // Base case: we've reached the root or the same directory
    if (parentDir === directoryPath || parentDir === path.dirname(parentDir)) {
        return false;
    }

    try {
        // Check if the parent directory exists
        if (existsSync(parentDir)) {
            return true;
        }
        // Parent doesn't exist, recursively check its parent
        return validateParentDirectories(parentDir);
    } catch {
        // Error checking parent, recursively check its parent
        return validateParentDirectories(parentDir);
    }
}

// File operation tools
export async function readFile(filePath: string): Promise<string> {
    const validPath = await validatePath(filePath);
    return fs.readFile(validPath, "utf-8");
}

import { randomUUID } from 'crypto';

/**
 * Writes content to a file with improved error handling
 * Parent directories are automatically created if they don't exist
 * 
 * @param filePath Path to the file to write
 * @param content Content to write to the file
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
    try {
        const validPath = await validatePath(filePath);
        const directory = path.dirname(validPath);
        
        // Check if directory exists
        if (!existsSync(directory)) {
            // Try to find a valid parent directory
            const hasValidParent = await validateParentDirectories(directory);
            
            if (hasValidParent) {
                // Create the necessary directories
                await fs.mkdir(directory, { recursive: true });
            } else {
                throw new Error(`Could not find any valid parent directory for ${filePath}`);
            }
        }
        
        // Use atomic write pattern
        const tempPath = path.join(directory, `.${randomUUID()}.tmp`);
        
        try {
            // Write to a temporary file first
            await fs.writeFile(tempPath, content, "utf-8");
            
            // Rename the temporary file to the target file
            await fs.rename(tempPath, validPath);
        } catch (error) {
            // Clean up temp file if it exists
            try {
                await fs.unlink(tempPath);
            } catch {
                // Ignore errors during cleanup
            }
            
            // Provide more specific error messages based on error type
            if (error instanceof Error) {
                if (error.message.includes('ENOSPC')) {
                    throw new Error(`Not enough disk space to write file: ${filePath}`);
                } else if (error.message.includes('EACCES')) {
                    throw new Error(`Permission denied: Cannot write to ${filePath}`);
                } else if (error.message.includes('EROFS')) {
                    throw new Error(`File system is read-only: Cannot write to ${filePath}`);
                } else {
                    throw error; // Re-throw original error for other cases
                }
            } else {
                throw error;
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`Unknown error writing file: ${filePath}`);
    }
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

import { glob } from 'glob';

export async function searchFiles(
    rootPath: string, 
    pattern: string
): Promise<string[]> {
    const validPath = await validatePath(rootPath);
    const results: string[] = [];
    
    try {
        // Create a glob pattern for case-insensitive search
        // For case-insensitive search on filesystems that are case-sensitive,
        // we use a two-step approach for better performance:
        // 1. Use a broader pattern with the lowercase pattern
        // 2. Then filter results with JavaScript string operations
        const globPattern = `**/*${pattern.toLowerCase()}*`;
        
        // Get files matching the glob pattern
        const matches = await glob(globPattern, {
            cwd: validPath,
            dot: true,                      // Include dotfiles
            absolute: true,                 // Return absolute paths
            nodir: false,                   // Include directories
            follow: false,                  // Don't follow symlinks for security
            ignore: ['**/node_modules/**'], // Common exclusion
            nocase: true,                   // Always use case-insensitive search
        });
        
        // Pre-process the pattern for case-insensitive search
        const lowerPattern = pattern.toLowerCase();
        
        // Filter results and validate each path
        for (const match of matches) {
            try {
                // Validate the path is allowed
                await validatePath(match);
                const filename = path.basename(match);
                
                // Case-insensitive match (ensure it actually contains the pattern)
                const isMatch = filename.toLowerCase().includes(lowerPattern);
                
                if (isMatch) {
                    results.push(match);
                }
            } catch (error) {
                // Skip this file if validation fails
                continue;
            }
        }
    } catch (error) {
        // Log the error but return empty results
        console.error(`Error searching files: ${error instanceof Error ? error.message : String(error)}`);
    }
    
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

// Bulk operations removed for code maintainability