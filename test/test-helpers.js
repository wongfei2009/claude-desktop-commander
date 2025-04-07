/**
 * Common test helper functions and utilities
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { setupTestTempDirectories, addTestDirectory } from '../dist/tools/filesystem.js';

/**
 * Creates a unique temporary test directory and registers it
 * @param {string} prefix - Prefix for the directory name
 * @returns {Promise<string>} Path to the created test directory
 */
export async function createTestDirectory(prefix = 'claude-desktop-commander-test') {
  // Set NODE_ENV to test
  process.env.NODE_ENV = 'test';
  
  // Initialize test temp directories
  setupTestTempDirectories();
  
  // Create a unique test directory
  const testDir = path.join(os.tmpdir(), `${prefix}-${Date.now()}`);
  
  // Create the directory
  await fs.mkdir(testDir, { recursive: true });
  
  // Register the directory and its parent
  addTestDirectory(testDir);
  addTestDirectory(os.tmpdir());
  
  console.log(`Created test directory: ${testDir}`);
  return testDir;
}

/**
 * Removes a test directory and all its contents
 * @param {string} testDir - Path to the test directory to clean up
 */
export async function cleanupTestDirectory(testDir) {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
    console.log(`Cleaned up test directory: ${testDir}`);
  } catch (error) {
    console.warn(`Warning: Could not clean up test directory ${testDir}: ${error.message}`);
  }
}

/**
 * Checks if a file exists
 * @param {string} filePath - Path to the file to check
 * @returns {Promise<boolean>} True if the file exists, false otherwise
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a file with content
 * @param {string} filePath - Path to create the file at
 * @param {string} content - Content to write to the file
 */
export async function createTestFile(filePath, content) {
  await fs.writeFile(filePath, content);
  return filePath;
}

/**
 * Creates multiple test files within a directory
 * @param {string} directory - Directory to create the files in
 * @param {Object[]} files - Array of {name, content} objects
 * @returns {Promise<string[]>} Array of file paths that were created
 */
export async function createTestFiles(directory, files) {
  const filePaths = [];
  
  for (const file of files) {
    const filePath = path.join(directory, file.name);
    await fs.writeFile(filePath, file.content);
    filePaths.push(filePath);
  }
  
  return filePaths;
}

/**
 * Creates test directory structure
 * @param {string} baseDir - Base directory
 * @param {Object} structure - Directory structure as nested objects of format:
 *                            { name: "dir1", type: "directory", children: [
 *                                { name: "file1.txt", type: "file", content: "content" }
 *                            ]}
 * @returns {Promise<void>}
 */
export async function createTestStructure(baseDir, structure) {
  if (structure.type === 'directory') {
    const dirPath = path.join(baseDir, structure.name);
    await fs.mkdir(dirPath, { recursive: true });
    
    // Register the directory
    addTestDirectory(dirPath);
    
    if (structure.children && Array.isArray(structure.children)) {
      for (const child of structure.children) {
        await createTestStructure(dirPath, child);
      }
    }
  } else if (structure.type === 'file') {
    const filePath = path.join(baseDir, structure.name);
    await fs.writeFile(filePath, structure.content || '');
  }
}