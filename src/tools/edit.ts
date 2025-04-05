import { readFile, writeFile } from './filesystem.js';

interface SearchReplace {
    search: string;
    replace: string;
}

export interface EditOperation {
  type: 'replace' | 'insertBefore' | 'insertAfter' | 'prepend' | 'append';
  search?: string;
  replace?: string;
  lineNumber?: number;
  content?: string;
}

export interface FileEdit {
  filepath: string;
  operations: EditOperation[];
}

export interface EditOptions {
  dryRun?: boolean;
  caseSensitive?: boolean;
  allOccurrences?: boolean;
}

export interface OperationResult {
  index: number;
  success: boolean;
  matchCount?: number;
  error?: string;
}

export interface FileEditResult {
  filepath: string;
  success: boolean;
  operationResults: OperationResult[];
  error?: string;
}

export interface MultiEditResult {
  success: boolean;
  editResults: FileEditResult[];
  dryRun: boolean;
}

/**
 * Performs a search and replace operation on a file.
 * This function:
 * 1. Reads the file content
 * 2. Finds the search text
 * 3. Replaces it with the new text
 * 4. Writes the file back
 * 5. Verifies the change was applied correctly
 * 
 * The function is tested in ./test/unit/edit.test.js and ./test/integration/edit.test.js
 * 
 * @param filePath Path to the file to edit
 * @param block Object containing search and replace strings
 * @returns Object containing:
 *   - success: Boolean indicating if the operation succeeded
 *   - message: Descriptive message about the result
 *   - matchCount: (Optional) Number of occurrences of the search text found
 */
export async function performSearchReplace(filePath: string, block: SearchReplace): Promise<{
    success: boolean;
    message: string;
    matchCount?: number;
}> {
    try {
        const content = await readFile(filePath);
        
        // Find first occurrence
        const searchIndex = content.indexOf(block.search);
        if (searchIndex === -1) {
            return {
                success: false,
                message: `Search content not found in ${filePath}`
            };
        }

        // Replace content
        const newContent = 
            content.substring(0, searchIndex) + 
            block.replace + 
            content.substring(searchIndex + block.search.length);

        // Count occurrences for informational purposes
        let count = 0;
        let pos = content.indexOf(block.search);
        while (pos !== -1) {
            count++;
            pos = content.indexOf(block.search, pos + 1);
        }

        await writeFile(filePath, newContent, { createDirectories: false });
        
        // Verify the change was successful
        const updatedContent = await readFile(filePath);
        const verifyIndex = updatedContent.indexOf(block.replace);
        
        if (verifyIndex === -1) {
            return {
                success: false,
                message: `Verification failed: replacement text not found in updated file ${filePath}`
            };
        }
        
        return {
            success: true,
            message: `Successfully applied edit to ${filePath}`,
            matchCount: count
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            message: `Error applying edit to ${filePath}: ${errorMessage}`
        };
    }
}

/**
 * Parses a block of text in the format expected by the desktop_fs_edit_block tool.
 * The format is:
 * - First line: file path
 * - Second line: <<<<<<< SEARCH
 * - Next N lines: text to search for
 * - Next line: =======
 * - Next M lines: text to replace with
 * - Last line: >>>>>>> REPLACE
 * 
 * @param blockContent The block of text to parse
 * @returns An object containing the file path and search/replace data
 */
export async function parseEditBlock(blockContent: string): Promise<{
    filePath: string;
    searchReplace: SearchReplace;
}> {
    const lines = blockContent.split('\n');
    
    // First line should be the file path
    const filePath = lines[0].trim();
    
    // Find the markers
    const searchStart = lines.indexOf('<<<<<<< SEARCH');
    const divider = lines.indexOf('=======');
    const replaceEnd = lines.indexOf('>>>>>>> REPLACE');
    
    if (searchStart === -1 || divider === -1 || replaceEnd === -1) {
        throw new Error('Invalid edit block format - missing markers');
    }
    
    // Extract search and replace content
    const search = lines.slice(searchStart + 1, divider).join('\n');
    const replace = lines.slice(divider + 1, replaceEnd).join('\n');
    
    return {
        filePath,
        searchReplace: { search, replace }
    };
}

/**
 * Performs multiple file edits with various operation types
 * Line numbers for subsequent operations are automatically adjusted when operations change the number of lines
 * in a file (insertBefore, insertAfter, or replace operations), ensuring operations are applied at
 * the intended locations.
 * 
 * For replace operations, the function calculates the difference in line count between the search text
 * and the replacement text, then adjusts line numbers for subsequent operations accordingly.
 * 
 * @param edits Array of file edits to perform
 * @param options Options for the edit operations
 * @returns Results of the edit operations
 */
export async function performMultiEdit(edits: FileEdit[], options: EditOptions = {}): Promise<MultiEditResult> {
  const { dryRun = false, caseSensitive = true, allOccurrences = false } = options;
  const editResults: FileEditResult[] = [];
  let overallSuccess = true;

  // Process each file
  for (const fileEdit of edits) {
    try {
      const filePath = fileEdit.filepath;
      let content = await readFile(filePath);
      const originalContent = content;
      const operationResults: OperationResult[] = [];
      let fileSuccess = true;

      // Process each operation for this file
      for (let opIndex = 0; opIndex < fileEdit.operations.length; opIndex++) {
        const operation = fileEdit.operations[opIndex];
        try {
          let matchCount = 0;
          
          switch (operation.type) {
            case 'replace':
              if (!operation.search || operation.replace === undefined) {
                throw new Error('Replace operation requires both search and replace parameters');
              }
              
              if (allOccurrences) {
                // Replace all occurrences
                const regex = new RegExp(escapeRegExp(operation.search), caseSensitive ? 'g' : 'gi');
                const matches = content.match(regex);
                matchCount = matches ? matches.length : 0;
                
                if (matchCount === 0) {
                  throw new Error(`Search content not found in ${filePath}`);
                }
                
                content = content.replace(regex, operation.replace);
              } else {
                // Replace first occurrence
                let searchIndex = -1;
                
                if (caseSensitive) {
                  searchIndex = content.indexOf(operation.search);
                } else {
                  const lowerContent = content.toLowerCase();
                  const lowerSearch = operation.search.toLowerCase();
                  searchIndex = lowerContent.indexOf(lowerSearch);
                  if (searchIndex !== -1) {
                    // Make sure we use the correctly cased string from the original content
                    operation.search = content.substring(
                      searchIndex, 
                      searchIndex + operation.search.length
                    );
                  }
                }
                
                if (searchIndex === -1) {
                  throw new Error(`Search content not found in ${filePath}`);
                }
                
                // Count lines in the text being replaced
                const contentBeforeMatch = content.substring(0, searchIndex);
                const searchStartLineNumber = (contentBeforeMatch.match(/\n/g) || []).length;
                const searchLineCount = (operation.search.match(/\n/g) || []).length + 1; // +1 because we count lines, not newlines
                const replaceLineCount = (operation.replace.match(/\n/g) || []).length + 1;
                const lineDifference = replaceLineCount - searchLineCount;
                
                matchCount = 1;
                content = 
                  content.substring(0, searchIndex) + 
                  operation.replace + 
                  content.substring(searchIndex + operation.search.length);
                
                // Adjust line numbers for subsequent operations if the replacement changes line count
                if (lineDifference !== 0) {
                  // Calculate the line number where the replacement ends
                  const searchEndLineNumber = searchStartLineNumber + searchLineCount - 1;
                  
                  // Update line numbers for subsequent operations
                  for (let futureOpIndex = opIndex + 1; futureOpIndex < fileEdit.operations.length; futureOpIndex++) {
                    const futureOp = fileEdit.operations[futureOpIndex];
                    if (futureOp.lineNumber !== undefined && futureOp.lineNumber > searchEndLineNumber) {
                      futureOp.lineNumber += lineDifference;
                    }
                  }
                }
              }
              break;
              
            case 'insertBefore':
            case 'insertAfter':
              if (operation.lineNumber === undefined || operation.content === undefined) {
                throw new Error(`${operation.type} operation requires lineNumber and content parameters`);
              }
              
              const lines = content.split('\n');
              if (operation.lineNumber < 0 || operation.lineNumber >= lines.length) {
                throw new Error(`Line number ${operation.lineNumber} out of bounds (file has ${lines.length} lines)`);
              }
              
              if (operation.type === 'insertBefore') {
                lines.splice(operation.lineNumber, 0, operation.content);
                
                // Update line numbers for subsequent operations on this file
                for (let futureOpIndex = opIndex + 1; futureOpIndex < fileEdit.operations.length; futureOpIndex++) {
                  const futureOp = fileEdit.operations[futureOpIndex];
                  if (futureOp.lineNumber !== undefined && futureOp.lineNumber >= operation.lineNumber) {
                    // Shift line number for all operations at or after the insertion point
                    futureOp.lineNumber += 1;
                  }
                }
              } else {
                lines.splice(operation.lineNumber + 1, 0, operation.content);
                
                // Update line numbers for subsequent operations on this file
                for (let futureOpIndex = opIndex + 1; futureOpIndex < fileEdit.operations.length; futureOpIndex++) {
                  const futureOp = fileEdit.operations[futureOpIndex];
                  if (futureOp.lineNumber !== undefined && futureOp.lineNumber > operation.lineNumber) {
                    // Shift line number for all operations after the insertion point
                    futureOp.lineNumber += 1;
                  }
                }
              }
              
              content = lines.join('\n');
              matchCount = 1;
              break;
              
            case 'prepend':
              if (operation.content === undefined) {
                throw new Error('Prepend operation requires content parameter');
              }
              content = operation.content + content;
              matchCount = 1;
              break;
              
            case 'append':
              if (operation.content === undefined) {
                throw new Error('Append operation requires content parameter');
              }
              content = content + operation.content;
              matchCount = 1;
              break;
              
            default:
              throw new Error(`Unsupported operation type: ${operation.type}`);
          }
          
          operationResults.push({
            index: opIndex,
            success: true,
            matchCount
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          operationResults.push({
            index: opIndex,
            success: false,
            error: errorMessage
          });
          fileSuccess = false;
          overallSuccess = false;
        }
      }
      
      // Write the updated content if not a dry run and all operations succeeded
      if (!dryRun && fileSuccess && content !== originalContent) {
        await writeFile(filePath, content, { createDirectories: false });
      }
      
      editResults.push({
        filepath: filePath,
        success: fileSuccess,
        operationResults
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      editResults.push({
        filepath: fileEdit.filepath,
        success: false,
        operationResults: [],
        error: errorMessage
      });
      overallSuccess = false;
    }
  }
  
  return {
    success: overallSuccess,
    editResults,
    dryRun
  };
}

// Helper function to escape special characters in a string for use in regex
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}