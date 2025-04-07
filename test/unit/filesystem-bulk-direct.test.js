/**
 * Manual test for filesystem bulk operations
 * This test bypasses the bulk operations in the filesystem.js module
 * and directly tests the functionality to ensure it works as expected.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs, createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import os from 'os';

// Create a temporary test directory
const testDir = path.join(os.tmpdir(), 'claude-desktop-commander-manual-test-' + Date.now());
console.log('Using test directory:', testDir);

// Helper function to copy a file using streams
async function copyFile(source, destination) {
  const readStream = createReadStream(source);
  const writeStream = createWriteStream(destination);
  await pipeline(readStream, writeStream);
}

// Helper function to check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

describe('Filesystem Bulk Operations (Direct)', () => {
  let srcDir, destDir;
  
  // Setup test environment
  beforeAll(async () => {
    // Create test directories
    await fs.mkdir(testDir, { recursive: true });
    srcDir = path.join(testDir, 'source');
    destDir = path.join(testDir, 'dest');
    
    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(destDir, { recursive: true });
  });
  
  // Cleanup after tests
  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log('\nTest cleanup completed successfully.');
    } catch (error) {
      console.error('Error cleaning up test directory:', error);
    }
  });
  
  describe('Bulk Move Operations', () => {
    it('should move files and maintain content integrity', async () => {
      // Create test files
      const filePath1 = path.join(srcDir, 'file1.txt');
      const filePath2 = path.join(srcDir, 'file2.txt');
      const destPath1 = path.join(destDir, 'moved1.txt');
      const destPath2 = path.join(destDir, 'moved2.txt');
      
      await fs.writeFile(filePath1, 'Test content 1');
      await fs.writeFile(filePath2, 'Test content 2');
      
      console.log('Created test files:');
      console.log('- ' + filePath1);
      console.log('- ' + filePath2);
      
      // Test bulk move
      console.log('\nTesting bulk move operation...');
      
      // Move first file
      await fs.rename(filePath1, destPath1);
      console.log(`✓ Moved ${filePath1} to ${destPath1}`);
      
      // Verify the move
      expect(await fileExists(destPath1)).toBe(true);
      expect(await fileExists(filePath1)).toBe(false);
      
      // Check content
      const content1 = await fs.readFile(destPath1, 'utf8');
      console.log(`  Content preserved: ${content1.substring(0, 20)}...`);
      expect(content1).toBe('Test content 1');
      
      // Move second file
      await fs.rename(filePath2, destPath2);
      console.log(`✓ Moved ${filePath2} to ${destPath2}`);
      
      // Verify the move
      expect(await fileExists(destPath2)).toBe(true);
      expect(await fileExists(filePath2)).toBe(false);
      
      // Check content
      const content2 = await fs.readFile(destPath2, 'utf8');
      console.log(`  Content preserved: ${content2.substring(0, 20)}...`);
      expect(content2).toBe('Test content 2');
    });
  });
  
  describe('Bulk Copy Operations', () => {
    it('should copy files and maintain content integrity', async () => {
      // Create test files
      const copyFilePath1 = path.join(srcDir, 'copy1.txt');
      const copyFilePath2 = path.join(srcDir, 'copy2.txt');
      const copyDestPath1 = path.join(destDir, 'copied1.txt');
      const copyDestPath2 = path.join(destDir, 'copied2.txt');
      
      await fs.writeFile(copyFilePath1, 'Copy test content 1');
      await fs.writeFile(copyFilePath2, 'Copy test content 2');
      
      // Test bulk copy
      console.log('\nTesting bulk copy operation...');
      
      // Copy first file
      await copyFile(copyFilePath1, copyDestPath1);
      console.log(`✓ Copied ${copyFilePath1} to ${copyDestPath1}`);
      
      // Verify the copy
      expect(await fileExists(copyDestPath1)).toBe(true);
      expect(await fileExists(copyFilePath1)).toBe(true);
      
      // Check content
      const sourceContent1 = await fs.readFile(copyFilePath1, 'utf8');
      const destContent1 = await fs.readFile(copyDestPath1, 'utf8');
      expect(destContent1).toBe(sourceContent1);
      
      // Copy second file
      await copyFile(copyFilePath2, copyDestPath2);
      console.log(`✓ Copied ${copyFilePath2} to ${copyDestPath2}`);
      
      // Verify the copy
      expect(await fileExists(copyDestPath2)).toBe(true);
      expect(await fileExists(copyFilePath2)).toBe(true);
      
      // Check content
      const sourceContent2 = await fs.readFile(copyFilePath2, 'utf8');
      const destContent2 = await fs.readFile(copyDestPath2, 'utf8');
      expect(destContent2).toBe(sourceContent2);
    });
  });
  
  describe('Bulk Delete Operations', () => {
    it('should delete files properly', async () => {
      // Create test files
      const deleteFilePath1 = path.join(srcDir, 'delete1.txt');
      const deleteFilePath2 = path.join(srcDir, 'delete2.txt');
      
      await fs.writeFile(deleteFilePath1, 'Delete test content 1');
      await fs.writeFile(deleteFilePath2, 'Delete test content 2');
      
      // Verify files were created
      expect(await fileExists(deleteFilePath1)).toBe(true);
      expect(await fileExists(deleteFilePath2)).toBe(true);
      
      // Test bulk delete
      console.log('\nTesting bulk delete operation...');
      
      // Delete first file
      await fs.unlink(deleteFilePath1);
      console.log(`✓ Deleted ${deleteFilePath1}`);
      
      // Verify the deletion
      expect(await fileExists(deleteFilePath1)).toBe(false);
      
      // Delete second file
      await fs.unlink(deleteFilePath2);
      console.log(`✓ Deleted ${deleteFilePath2}`);
      
      // Verify the deletion
      expect(await fileExists(deleteFilePath2)).toBe(false);
    });
  });
  
  describe('Bulk Rename Operations', () => {
    it('should rename files properly', async () => {
      // Create files for rename test
      const renameFilePath1 = path.join(srcDir, 'rename1.txt');
      const renameFilePath2 = path.join(srcDir, 'rename2.txt');
      
      await fs.writeFile(renameFilePath1, 'Rename test content 1');
      await fs.writeFile(renameFilePath2, 'Rename test content 2');
      
      // Test bulk rename
      console.log('\nTesting bulk rename operation...');
      
      // Rename first file
      const destPath1 = path.join(srcDir, 'renamed1.txt');
      await fs.rename(renameFilePath1, destPath1);
      console.log(`✓ Renamed ${renameFilePath1} to renamed1.txt`);
      
      // Verify the rename
      expect(await fileExists(renameFilePath1)).toBe(false);
      expect(await fileExists(destPath1)).toBe(true);
      
      // Check content
      const content1 = await fs.readFile(destPath1, 'utf8');
      expect(content1).toBe('Rename test content 1');
      
      // Rename second file
      const destPath2 = path.join(srcDir, 'renamed2.txt');
      await fs.rename(renameFilePath2, destPath2);
      console.log(`✓ Renamed ${renameFilePath2} to renamed2.txt`);
      
      // Verify the rename
      expect(await fileExists(renameFilePath2)).toBe(false);
      expect(await fileExists(destPath2)).toBe(true);
      
      // Check content
      const content2 = await fs.readFile(destPath2, 'utf8');
      expect(content2).toBe('Rename test content 2');
    });
  });
  
  describe('Find and Replace in Filenames', () => {
    it('should find and replace patterns in filenames', async () => {
      // Create directory and files for find and replace test
      const replaceDir = path.join(testDir, 'replace');
      await fs.mkdir(replaceDir, { recursive: true });
      
      await fs.writeFile(path.join(replaceDir, 'prefix_file1.txt'), 'Replace test content 1');
      await fs.writeFile(path.join(replaceDir, 'prefix_file2.txt'), 'Replace test content 2');
      await fs.writeFile(path.join(replaceDir, 'different.txt'), 'Different content');
      
      // Test find and replace in filenames
      console.log('\nTesting find and replace in filenames...');
      
      // Get all entries in the directory
      const entries = await fs.readdir(replaceDir, { withFileTypes: true });
      
      // Process only files (not directories)
      const files = entries.filter(entry => entry.isFile());
      
      const pattern = 'prefix_';
      const replacement = 'renamed_';
      
      for (const file of files) {
        const oldName = file.name;
        if (oldName.includes(pattern)) {
          const newName = oldName.replace(pattern, replacement);
          const oldPath = path.join(replaceDir, oldName);
          const newPath = path.join(replaceDir, newName);
          
          await fs.rename(oldPath, newPath);
          console.log(`✓ Renamed ${oldName} to ${newName}`);
          
          // Verify the rename
          expect(await fileExists(oldPath)).toBe(false);
          expect(await fileExists(newPath)).toBe(true);
        }
      }
      
      // Verify the replacements
      const afterEntries = await fs.readdir(replaceDir);
      console.log(`  Directory contents after rename: ${afterEntries.join(', ')}`);
      
      // Check if we have renamed files
      expect(afterEntries.some(name => name.startsWith('renamed_'))).toBe(true);
      
      // Check if old prefixed files are gone
      expect(afterEntries.some(name => name.startsWith('prefix_'))).toBe(false);
      
      // The 'different.txt' file should still be there
      expect(afterEntries.includes('different.txt')).toBe(true);
    });
  });
});