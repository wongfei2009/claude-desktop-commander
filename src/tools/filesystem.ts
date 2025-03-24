import fs from "fs/promises";
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
    const isAllowed = allowedDirectories.some(dir => normalizedRequested.startsWith(normalizePath(dir)));
    if (!isAllowed) {
        throw new Error(`Access denied - path outside allowed directories: ${absolute}`);
    }

    // Handle symlinks by checking their real path
    try {
        const realPath = await fs.realpath(absolute);
        const normalizedReal = normalizePath(realPath);
        const normalizedDesktop = normalizePath(path.join(os.homedir(), 'Desktop'));
        
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
            const normalizedDesktop = normalizePath(path.join(os.homedir(), 'Desktop'));
            
            // Check if parent directory is Desktop
            if (normalizedParent.startsWith(normalizedDesktop)) {
                throw new Error("Access denied - parent directory is restricted Desktop folder");
            }
            
            const isParentAllowed = allowedDirectories.some(dir => normalizedParent.startsWith(normalizePath(dir)));
            if (!isParentAllowed) {
                throw new Error("Access denied - parent directory outside allowed directories");
            }
            return absolute;
        } catch {
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
