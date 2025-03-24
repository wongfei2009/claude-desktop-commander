// Test script to verify Desktop access restrictions

const { readFile, listDirectory, listAllowedDirectories } = require('../dist/tools/filesystem');
const path = require('path');
const os = require('os');

async function runTest() {
  console.log('=== Desktop Access Restriction Test ===');
  
  // List allowed directories
  console.log('\nAllowed Directories:');
  console.log(listAllowedDirectories());
  
  // Try to access home directory
  console.log('\nAttempting to access home directory:');
  try {
    const homeFiles = await listDirectory(os.homedir());
    console.log('Success - Access to home directory allowed');
  } catch (error) {
    console.error('Error accessing home directory:', error.message);
  }
  
  // Try to access Desktop directory
  console.log('\nAttempting to access Desktop directory:');
  try {
    const desktopFiles = await listDirectory(path.join(os.homedir(), 'Desktop'));
    console.log('Warning - Access to Desktop directory was allowed!');
    console.log('Files found:', desktopFiles.length);
  } catch (error) {
    console.log('Success - Desktop access properly restricted:', error.message);
  }
  
  // Try to access a file in the Desktop directory
  console.log('\nAttempting to access a file in Desktop directory:');
  try {
    const testFile = await readFile(path.join(os.homedir(), 'Desktop', 'test.txt'));
    console.log('Warning - Access to Desktop files was allowed!');
  } catch (error) {
    console.log('Success - Desktop file access properly restricted:', error.message);
  }
}

runTest().catch(error => {
  console.error('Test failed:', error);
});
