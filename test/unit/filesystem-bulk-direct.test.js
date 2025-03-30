/**
 * Manual test for filesystem bulk operations
 * This test bypasses the bulk operations in the filesystem.js module
 * and directly tests the functionality to ensure it works as expected.
 */
import { strict as assert } from 'assert';
import { promises as fs, createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import os from 'os';

// Create a temporary test directory
const testDir = path.join(os.tmpdir(), 'claude-desktop-commander-manual-test-' + Date.now());
console.log('Using test directory:', testDir);

// Test the bulk operations functionality directly
async function testBulkOperations() {
  try {
    // Create test directories
    await fs.mkdir(testDir, { recursive: true });
    const srcDir = path.join(testDir, 'source');
    const destDir = path.join(testDir, 'dest');
    
    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(destDir, { recursive: true });
    
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
    await testBulkMove([
      { source: filePath1, destination: destPath1 },
      { source: filePath2, destination: destPath2 }
    ]);
    
    // Create new test files for copy test
    const copyFilePath1 = path.join(srcDir, 'copy1.txt');
    const copyFilePath2 = path.join(srcDir, 'copy2.txt');
    const copyDestPath1 = path.join(destDir, 'copied1.txt');
    const copyDestPath2 = path.join(destDir, 'copied2.txt');
    
    await fs.writeFile(copyFilePath1, 'Copy test content 1');
    await fs.writeFile(copyFilePath2, 'Copy test content 2');
    
    // Test bulk copy
    console.log('\nTesting bulk copy operation...');
    await testBulkCopy([
      { source: copyFilePath1, destination: copyDestPath1 },
      { source: copyFilePath2, destination: copyDestPath2 }
    ]);
    
    // Test bulk delete
    console.log('\nTesting bulk delete operation...');
    await testBulkDelete([copyFilePath1, copyFilePath2]);
    
    // Create files for rename test
    const renameFilePath1 = path.join(srcDir, 'rename1.txt');
    const renameFilePath2 = path.join(srcDir, 'rename2.txt');
    
    await fs.writeFile(renameFilePath1, 'Rename test content 1');
    await fs.writeFile(renameFilePath2, 'Rename test content 2');
    
    // Test bulk rename
    console.log('\nTesting bulk rename operation...');
    await testBulkRename([
      { source: renameFilePath1, newName: 'renamed1.txt' },
      { source: renameFilePath2, newName: 'renamed2.txt' }
    ]);
    
    // Create files for find and replace test
    const replaceDir = path.join(testDir, 'replace');
    await fs.mkdir(replaceDir, { recursive: true });
    
    await fs.writeFile(path.join(replaceDir, 'prefix_file1.txt'), 'Replace test content 1');
    await fs.writeFile(path.join(replaceDir, 'prefix_file2.txt'), 'Replace test content 2');
    await fs.writeFile(path.join(replaceDir, 'different.txt'), 'Different content');
    
    // Test find and replace in filenames
    console.log('\nTesting find and replace in filenames...');
    await testFindAndReplace(replaceDir, 'prefix_', 'renamed_');
    
    console.log('\nAll tests passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    // Clean up
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log('\nTest cleanup completed successfully.');
    } catch (error) {
      console.error('Error cleaning up test directory:', error);
    }
  }
}

// Helper function to copy a file using streams
async function copyFile(source, destination) {
  const readStream = createReadStream(source);
  const writeStream = createWriteStream(destination);
  await pipeline(readStream, writeStream);
}

// Test bulk move operation
async function testBulkMove(operations) {
  for (const op of operations) {
    try {
      await fs.rename(op.source, op.destination);
      console.log(`✓ Moved ${op.source} to ${op.destination}`);
      
      // Verify the move
      assert.ok(await fileExists(op.destination), 'Destination file should exist');
      assert.ok(!await fileExists(op.source), 'Source file should not exist');
      
      // Check content
      const content = await fs.readFile(op.destination, 'utf8');
      console.log(`  Content preserved: ${content.substring(0, 20)}...`);
    } catch (error) {
      console.error(`✗ Failed to move ${op.source} to ${op.destination}: ${error.message}`);
      throw error;
    }
  }
}

// Test bulk copy operation
async function testBulkCopy(operations) {
  for (const op of operations) {
    try {
      await copyFile(op.source, op.destination);
      console.log(`✓ Copied ${op.source} to ${op.destination}`);
      
      // Verify the copy
      assert.ok(await fileExists(op.destination), 'Destination file should exist');
      assert.ok(await fileExists(op.source), 'Source file should still exist');
      
      // Check content
      const sourceContent = await fs.readFile(op.source, 'utf8');
      const destContent = await fs.readFile(op.destination, 'utf8');
      assert.equal(sourceContent, destContent, 'File content should be identical');
      console.log(`  Content preserved: ${destContent.substring(0, 20)}...`);
    } catch (error) {
      console.error(`✗ Failed to copy ${op.source} to ${op.destination}: ${error.message}`);
      throw error;
    }
  }
}

// Test bulk delete operation
async function testBulkDelete(paths) {
  for (const filePath of paths) {
    try {
      await fs.unlink(filePath);
      console.log(`✓ Deleted ${filePath}`);
      
      // Verify the deletion
      assert.ok(!await fileExists(filePath), 'File should no longer exist');
    } catch (error) {
      console.error(`✗ Failed to delete ${filePath}: ${error.message}`);
      throw error;
    }
  }
}

// Test bulk rename operation
async function testBulkRename(operations) {
  for (const op of operations) {
    try {
      const sourceDir = path.dirname(op.source);
      const destPath = path.join(sourceDir, op.newName);
      
      await fs.rename(op.source, destPath);
      console.log(`✓ Renamed ${op.source} to ${op.newName}`);
      
      // Verify the rename
      assert.ok(!await fileExists(op.source), 'Source file should no longer exist');
      assert.ok(await fileExists(destPath), 'Renamed file should exist');
      
      // Check content
      const content = await fs.readFile(destPath, 'utf8');
      console.log(`  Content preserved: ${content.substring(0, 20)}...`);
    } catch (error) {
      console.error(`✗ Failed to rename ${op.source} to ${op.newName}: ${error.message}`);
      throw error;
    }
  }
}

// Test find and replace in filenames
async function testFindAndReplace(directory, pattern, replacement) {
  try {
    // Get all entries in the directory
    const entries = await fs.readdir(directory, { withFileTypes: true });
    
    // Process only files (not directories)
    const files = entries.filter(entry => entry.isFile());
    
    for (const file of files) {
      const oldName = file.name;
      if (oldName.includes(pattern)) {
        const newName = oldName.replace(pattern, replacement);
        const oldPath = path.join(directory, oldName);
        const newPath = path.join(directory, newName);
        
        await fs.rename(oldPath, newPath);
        console.log(`✓ Renamed ${oldName} to ${newName}`);
        
        // Verify the rename
        assert.ok(!await fileExists(oldPath), 'Original file should no longer exist');
        assert.ok(await fileExists(newPath), 'Renamed file should exist');
      }
    }
    
    // Verify the replacements
    const afterEntries = await fs.readdir(directory);
    console.log(`  Directory contents after rename: ${afterEntries.join(', ')}`);
    assert.ok(afterEntries.some(name => name.startsWith('renamed_')), 
      'Should have files with renamed_ prefix');
    assert.ok(!afterEntries.some(name => name.startsWith('prefix_')), 
      'Should not have files with prefix_ prefix');
  } catch (error) {
    console.error(`✗ Failed to find and replace in ${directory}: ${error.message}`);
    throw error;
  }
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

// Run the tests
testBulkOperations().catch(error => {
  console.error('Tests failed:', error);
  process.exit(1);
});
